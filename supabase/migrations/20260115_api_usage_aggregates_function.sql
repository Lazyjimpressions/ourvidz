-- API Usage Aggregates Functions
-- Functions for upserting and backfilling usage aggregates

-- Function: upsert_usage_aggregate
-- Upserts aggregate records for fast dashboard queries
CREATE OR REPLACE FUNCTION public.upsert_usage_aggregate(
  p_provider_id UUID,
  p_model_id UUID,
  p_date_bucket DATE,
  p_hour_bucket INTEGER,
  p_request_count INTEGER,
  p_success_count INTEGER,
  p_error_count INTEGER,
  p_tokens_input BIGINT,
  p_tokens_output BIGINT,
  p_tokens_cached BIGINT,
  p_cost_usd NUMERIC,
  p_cost_credits NUMERIC,
  p_response_time_ms NUMERIC
) RETURNS VOID AS $$
DECLARE
  v_existing_avg NUMERIC;
  v_existing_count INTEGER;
BEGIN
  INSERT INTO public.api_usage_aggregates (
    provider_id, model_id, date_bucket, hour_bucket,
    request_count, success_count, error_count,
    tokens_input_total, tokens_output_total, tokens_cached_total,
    cost_usd_total, cost_credits_total,
    avg_response_time_ms, p95_response_time_ms, p99_response_time_ms
  )
  VALUES (
    p_provider_id, p_model_id, p_date_bucket, p_hour_bucket,
    p_request_count, p_success_count, p_error_count,
    p_tokens_input, p_tokens_output, p_tokens_cached,
    p_cost_usd, p_cost_credits,
    p_response_time_ms, p_response_time_ms, p_response_time_ms
  )
  ON CONFLICT (provider_id, model_id, date_bucket, hour_bucket)
  DO UPDATE SET
    request_count = api_usage_aggregates.request_count + p_request_count,
    success_count = api_usage_aggregates.success_count + p_success_count,
    error_count = api_usage_aggregates.error_count + p_error_count,
    tokens_input_total = api_usage_aggregates.tokens_input_total + p_tokens_input,
    tokens_output_total = api_usage_aggregates.tokens_output_total + p_tokens_output,
    tokens_cached_total = api_usage_aggregates.tokens_cached_total + p_tokens_cached,
    cost_usd_total = api_usage_aggregates.cost_usd_total + p_cost_usd,
    cost_credits_total = api_usage_aggregates.cost_credits_total + p_cost_credits,
    -- Calculate weighted average for response time
    avg_response_time_ms = (
      (api_usage_aggregates.avg_response_time_ms * api_usage_aggregates.request_count + 
       p_response_time_ms * p_request_count) / 
      (api_usage_aggregates.request_count + p_request_count)
    ),
    -- For p95/p99, we'll use a simple approximation (could be improved with percentile calculation)
    p95_response_time_ms = GREATEST(
      api_usage_aggregates.p95_response_time_ms,
      p_response_time_ms
    ),
    p99_response_time_ms = GREATEST(
      api_usage_aggregates.p99_response_time_ms,
      p_response_time_ms
    );
END;
$$ LANGUAGE plpgsql;

-- Function: backfill_usage_aggregates
-- Aggregates existing api_usage_logs into api_usage_aggregates
CREATE OR REPLACE FUNCTION public.backfill_usage_aggregates(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.api_usage_aggregates (
    provider_id, model_id, date_bucket, hour_bucket,
    request_count, success_count, error_count,
    tokens_input_total, tokens_output_total, tokens_cached_total,
    cost_usd_total, cost_credits_total,
    avg_response_time_ms
  )
  SELECT
    provider_id,
    model_id,
    DATE(created_at) as date_bucket,
    EXTRACT(HOUR FROM created_at)::INTEGER as hour_bucket,
    COUNT(*) as request_count,
    COUNT(*) FILTER (WHERE response_status < 400 OR response_status IS NULL) as success_count,
    COUNT(*) FILTER (WHERE response_status >= 400) as error_count,
    COALESCE(SUM(tokens_input), 0) as tokens_input_total,
    COALESCE(SUM(tokens_output), 0) as tokens_output_total,
    COALESCE(SUM(tokens_cached), 0) as tokens_cached_total,
    COALESCE(SUM(cost_usd), 0) as cost_usd_total,
    COALESCE(SUM(cost_credits), 0) as cost_credits_total,
    AVG(response_time_ms) as avg_response_time_ms
  FROM public.api_usage_logs
  WHERE created_at >= p_start_date AND created_at < p_end_date
  GROUP BY provider_id, model_id, DATE(created_at), EXTRACT(HOUR FROM created_at)
  ON CONFLICT (provider_id, model_id, date_bucket, hour_bucket)
  DO UPDATE SET
    request_count = EXCLUDED.request_count,
    success_count = EXCLUDED.success_count,
    error_count = EXCLUDED.error_count,
    tokens_input_total = EXCLUDED.tokens_input_total,
    tokens_output_total = EXCLUDED.tokens_output_total,
    tokens_cached_total = EXCLUDED.tokens_cached_total,
    cost_usd_total = EXCLUDED.cost_usd_total,
    cost_credits_total = EXCLUDED.cost_credits_total,
    avg_response_time_ms = EXCLUDED.avg_response_time_ms;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
