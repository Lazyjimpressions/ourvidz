-- API Usage Tracking Migration
-- Creates tables for tracking API provider usage, costs, and balances

-- Table: api_usage_logs - Detailed request/response logs
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.api_providers(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.api_models(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Request metadata
  request_type TEXT NOT NULL CHECK (request_type IN ('chat', 'image', 'video')),
  endpoint_path TEXT,
  request_payload JSONB,
  
  -- Usage metrics (provider-specific)
  tokens_input INTEGER,
  tokens_output INTEGER,
  tokens_total INTEGER,
  tokens_cached INTEGER,
  
  -- Cost tracking
  cost_usd NUMERIC(10, 6),
  cost_credits NUMERIC(10, 6),
  
  -- Response metadata
  response_status INTEGER,
  response_time_ms INTEGER NOT NULL,
  response_payload JSONB,
  error_message TEXT,
  
  -- Provider-specific fields (JSONB for flexibility)
  provider_metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: api_provider_balances - Provider balance snapshots
CREATE TABLE IF NOT EXISTS public.api_provider_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL UNIQUE REFERENCES public.api_providers(id) ON DELETE CASCADE,
  
  -- Balance information
  balance_usd NUMERIC(10, 2),
  balance_credits NUMERIC(10, 2),
  currency TEXT DEFAULT 'USD',
  
  -- Sync metadata
  last_synced_at TIMESTAMPTZ,
  sync_method TEXT CHECK (sync_method IN ('api', 'manual', 'webhook')),
  sync_status TEXT CHECK (sync_status IN ('success', 'failed', 'pending')),
  sync_error TEXT,
  
  -- Provider-specific balance data
  balance_metadata JSONB DEFAULT '{}'::jsonb,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: api_usage_aggregates - Time-bucketed aggregates for fast queries
CREATE TABLE IF NOT EXISTS public.api_usage_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.api_providers(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.api_models(id) ON DELETE SET NULL,
  
  -- Time bucket
  date_bucket DATE NOT NULL,
  hour_bucket INTEGER CHECK (hour_bucket IS NULL OR (hour_bucket >= 0 AND hour_bucket <= 23)),
  
  -- Aggregated metrics
  request_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  
  tokens_input_total BIGINT DEFAULT 0,
  tokens_output_total BIGINT DEFAULT 0,
  tokens_cached_total BIGINT DEFAULT 0,
  
  cost_usd_total NUMERIC(10, 6) DEFAULT 0,
  cost_credits_total NUMERIC(10, 6) DEFAULT 0,
  
  avg_response_time_ms NUMERIC(10, 2),
  p95_response_time_ms NUMERIC(10, 2),
  p99_response_time_ms NUMERIC(10, 2),
  
  -- Unique constraint for upserts
  UNIQUE(provider_id, model_id, date_bucket, hour_bucket)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_provider_date ON public.api_usage_logs(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_model_date ON public.api_usage_logs(model_id, created_at DESC) WHERE model_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_date ON public.api_usage_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_request_type ON public.api_usage_logs(request_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_usage_aggregates_provider_date ON public.api_usage_aggregates(provider_id, date_bucket DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_aggregates_model_date ON public.api_usage_aggregates(model_id, date_bucket DESC) WHERE model_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_usage_aggregates_date_bucket ON public.api_usage_aggregates(date_bucket DESC, hour_bucket);

-- Enable RLS
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_provider_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_aggregates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_usage_logs
-- Admins can view all usage logs
CREATE POLICY "Admins can view all usage logs" ON public.api_usage_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own usage logs
CREATE POLICY "Users can view own usage logs" ON public.api_usage_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Only admins can insert/update usage logs (edge functions use service role)
CREATE POLICY "Service role can insert usage logs" ON public.api_usage_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

-- RLS Policies for api_provider_balances
-- Only admins can manage balances
CREATE POLICY "Admins manage balances" ON public.api_provider_balances
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can update balances (for sync function)
CREATE POLICY "Service role can manage balances" ON public.api_provider_balances
  FOR ALL TO service_role
  USING (true);

-- RLS Policies for api_usage_aggregates
-- Only admins can manage aggregates
CREATE POLICY "Admins manage aggregates" ON public.api_usage_aggregates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can update aggregates (for aggregation function)
CREATE POLICY "Service role can manage aggregates" ON public.api_usage_aggregates
  FOR ALL TO service_role
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_api_provider_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on api_provider_balances
CREATE TRIGGER update_api_provider_balances_updated_at
  BEFORE UPDATE ON public.api_provider_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_api_provider_balances_updated_at();
