-- Migration: Link prompt test results to generated images and jobs
-- This migration establishes relationships between prompt testing and actual generation results

-- Add foreign key columns to prompt_test_results table
ALTER TABLE prompt_test_results 
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS image_id UUID REFERENCES images(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS generation_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS success_rate DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS model_version VARCHAR(100),
ADD COLUMN IF NOT EXISTS generation_parameters JSONB;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_prompt_test_results_job_id ON prompt_test_results(job_id);
CREATE INDEX IF NOT EXISTS idx_prompt_test_results_image_id ON prompt_test_results(image_id);
CREATE INDEX IF NOT EXISTS idx_prompt_test_results_model ON prompt_test_results(model_type, model_version);
CREATE INDEX IF NOT EXISTS idx_prompt_test_results_quality ON prompt_test_results(quality_rating);

-- Add test metadata to images table
ALTER TABLE images 
ADD COLUMN IF NOT EXISTS prompt_test_id UUID REFERENCES prompt_test_results(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS test_metadata JSONB;

-- Add index for image test associations
CREATE INDEX IF NOT EXISTS idx_images_prompt_test_id ON images(prompt_test_id);

-- Add test tracking to jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS prompt_test_id UUID REFERENCES prompt_test_results(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS test_metadata JSONB;

-- Add index for job test associations
CREATE INDEX IF NOT EXISTS idx_jobs_prompt_test_id ON jobs(prompt_test_id);

-- Create a view for comprehensive test analytics
CREATE OR REPLACE VIEW prompt_test_analytics AS
SELECT 
    ptr.id as test_id,
    ptr.prompt_text,
    ptr.model_type,
    ptr.model_version,
    ptr.quality_rating,
    ptr.notes,
    ptr.created_at as test_created_at,
    ptr.generation_time_ms,
    ptr.success_rate,
    ptr.generation_parameters,
    j.id as job_id,
    j.status as job_status,
    j.created_at as job_created_at,
    j.completed_at as job_completed_at,
    i.id as image_id,
    i.image_url as image_url,
    i.metadata as image_metadata
FROM prompt_test_results ptr
LEFT JOIN jobs j ON ptr.job_id = j.id
LEFT JOIN images i ON ptr.image_id = i.id
ORDER BY ptr.created_at DESC;

-- Add comments for documentation
COMMENT ON COLUMN prompt_test_results.job_id IS 'Reference to the generation job that was created from this test';
COMMENT ON COLUMN prompt_test_results.image_id IS 'Reference to the generated image from this test';
COMMENT ON COLUMN prompt_test_results.generation_time_ms IS 'Time taken to generate the image in milliseconds';
COMMENT ON COLUMN prompt_test_results.success_rate IS 'Success rate percentage for this model/prompt combination';
COMMENT ON COLUMN prompt_test_results.model_version IS 'Specific version of the model used for generation';
COMMENT ON COLUMN prompt_test_results.generation_parameters IS 'JSON object containing all generation parameters used';

COMMENT ON COLUMN images.prompt_test_id IS 'Reference to the prompt test that generated this image';
COMMENT ON COLUMN images.test_metadata IS 'Additional metadata related to the prompt test';

COMMENT ON COLUMN jobs.prompt_test_id IS 'Reference to the prompt test that initiated this job';
COMMENT ON COLUMN jobs.test_metadata IS 'Additional metadata related to the prompt test';

COMMENT ON VIEW prompt_test_analytics IS 'Comprehensive view combining prompt test results with job and image data for analytics'; 