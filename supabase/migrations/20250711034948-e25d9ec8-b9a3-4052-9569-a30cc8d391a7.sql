-- Optimal Model Testing Framework - Fresh Start
-- This migration creates the most effective testing system for all models (SDXL, WAN, LoRA)

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS prompt_test_results CASCADE;
DROP TABLE IF EXISTS prompt_test_analytics CASCADE;
DROP VIEW IF EXISTS prompt_test_analytics CASCADE;

-- Create optimal model_test_results table
CREATE TABLE model_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core Testing Fields
  model_type VARCHAR(20) NOT NULL CHECK (model_type IN ('SDXL', 'WAN', 'LORA')),
  model_version VARCHAR(50),
  prompt_text TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  
  -- Quality Metrics (Universal 1-10 scale)
  overall_quality INTEGER CHECK (overall_quality >= 0 AND overall_quality <= 10),
  technical_quality INTEGER CHECK (technical_quality >= 0 AND technical_quality <= 10),
  content_quality INTEGER CHECK (content_quality >= 0 AND content_quality <= 10),
  consistency INTEGER CHECK (consistency >= 0 AND consistency <= 10),
  
  -- Testing Context (Structured)
  test_series VARCHAR(100) NOT NULL,
  test_tier VARCHAR(50) NOT NULL CHECK (test_tier IN ('artistic', 'explicit', 'unrestricted')),
  test_category VARCHAR(100),
  
  -- Model-Specific Metadata (JSONB for maximum flexibility)
  test_metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Generation Results
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  image_id UUID REFERENCES images(id) ON DELETE SET NULL,
  video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  generation_time_ms INTEGER,
  file_size_bytes INTEGER,
  
  -- User Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comprehensive indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_model_test_results_user_id ON model_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_model_test_results_model_type ON model_test_results(model_type);
CREATE INDEX IF NOT EXISTS idx_model_test_results_test_series ON model_test_results(test_series);
CREATE INDEX IF NOT EXISTS idx_model_test_results_test_tier ON model_test_results(test_tier);
CREATE INDEX IF NOT EXISTS idx_model_test_results_created_at ON model_test_results(created_at);
CREATE INDEX IF NOT EXISTS idx_model_test_results_quality ON model_test_results(overall_quality);
CREATE INDEX IF NOT EXISTS idx_model_test_results_success ON model_test_results(success);

-- Create GIN index for JSONB metadata queries
CREATE INDEX IF NOT EXISTS idx_model_test_results_metadata ON model_test_results USING GIN (test_metadata);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_model_test_results_model_series ON model_test_results(model_type, test_series);
CREATE INDEX IF NOT EXISTS idx_model_test_results_model_tier ON model_test_results(model_type, test_tier);
CREATE INDEX IF NOT EXISTS idx_model_test_results_series_tier ON model_test_results(test_series, test_tier);

-- Enable RLS
ALTER TABLE model_test_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - Admin only access for testing
CREATE POLICY "Admin access to model test results" ON model_test_results
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_model_test_results_updated_at
  BEFORE UPDATE ON model_test_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create comprehensive analytics view
CREATE OR REPLACE VIEW model_test_analytics AS
SELECT 
  mtr.id as test_id,
  mtr.user_id,
  mtr.model_type,
  mtr.model_version,
  mtr.prompt_text,
  mtr.test_series,
  mtr.test_tier,
  mtr.test_category,
  mtr.overall_quality,
  mtr.technical_quality,
  mtr.content_quality,
  mtr.consistency,
  mtr.generation_time_ms,
  mtr.file_size_bytes,
  mtr.success,
  mtr.notes,
  mtr.created_at as test_created_at,
  mtr.test_metadata,
  j.id as job_id,
  j.status as job_status,
  j.job_type,
  j.created_at as job_created_at,
  j.completed_at as job_completed_at,
  i.id as image_id,
  i.image_url as image_url,
  i.metadata as image_metadata,
  v.id as video_id,
  v.video_url as video_url,
  v.metadata as video_metadata
FROM model_test_results mtr
LEFT JOIN jobs j ON mtr.job_id = j.id
LEFT JOIN images i ON mtr.image_id = i.id
LEFT JOIN videos v ON mtr.video_id = v.id
ORDER BY mtr.created_at DESC;

-- Create performance summary view
CREATE OR REPLACE VIEW model_test_summary AS
SELECT 
  model_type,
  test_series,
  test_tier,
  COUNT(*) as total_tests,
  COUNT(*) FILTER (WHERE success = true) as successful_tests,
  ROUND(AVG(overall_quality), 2) as avg_overall_quality,
  ROUND(AVG(technical_quality), 2) as avg_technical_quality,
  ROUND(AVG(content_quality), 2) as avg_content_quality,
  ROUND(AVG(consistency), 2) as avg_consistency,
  ROUND(AVG(generation_time_ms), 0) as avg_generation_time_ms,
  ROUND(AVG(file_size_bytes), 0) as avg_file_size_bytes,
  MIN(created_at) as first_test,
  MAX(created_at) as last_test
FROM model_test_results
GROUP BY model_type, test_series, test_tier
ORDER BY model_type, test_series, test_tier;

-- Add comprehensive comments for documentation
COMMENT ON TABLE model_test_results IS 'Unified testing results for all AI models (SDXL, WAN, LoRA) with optimal structure';
COMMENT ON COLUMN model_test_results.test_metadata IS 'Model-specific metadata stored as JSONB for maximum flexibility';
COMMENT ON COLUMN model_test_results.overall_quality IS 'Overall quality rating 1-10 (technical + content + artistic merit)';
COMMENT ON COLUMN model_test_results.technical_quality IS 'Technical execution quality 1-10 (resolution, artifacts, format)';
COMMENT ON COLUMN model_test_results.content_quality IS 'Content appropriateness quality 1-10 (anatomical accuracy, NSFW level)';
COMMENT ON COLUMN model_test_results.consistency IS 'Consistency across generations 1-10 (reliability, predictability)';
COMMENT ON COLUMN model_test_results.test_series IS 'Testing series name (e.g., couples-intimacy, shower-bath)';
COMMENT ON COLUMN model_test_results.test_tier IS 'Content tier (artistic, explicit, unrestricted)';
COMMENT ON VIEW model_test_analytics IS 'Comprehensive analytics view for all model testing results with job and media links';
COMMENT ON VIEW model_test_summary IS 'Performance summary view with aggregated metrics by model, series, and tier';