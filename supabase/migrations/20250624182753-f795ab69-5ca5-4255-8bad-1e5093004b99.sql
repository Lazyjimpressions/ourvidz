
-- Phase 1: Database Schema Updates for Wan 2.1 Functional Model Support

-- Add new columns to jobs table for functional tracking
ALTER TABLE public.jobs 
ADD COLUMN format TEXT CHECK (format IN ('image', 'video')),
ADD COLUMN quality TEXT CHECK (quality IN ('fast', 'high')),
ADD COLUMN model_type TEXT;

-- Update usage_logs to track format+quality combinations
ALTER TABLE public.usage_logs 
ADD COLUMN format TEXT,
ADD COLUMN quality TEXT;

-- Create indexes for performance on new columns
CREATE INDEX idx_jobs_format_quality ON public.jobs(format, quality);
CREATE INDEX idx_jobs_model_type ON public.jobs(model_type);
CREATE INDEX idx_usage_logs_format_quality ON public.usage_logs(format, quality);

-- Add comments for documentation
COMMENT ON COLUMN public.jobs.format IS 'Generation format: image or video';
COMMENT ON COLUMN public.jobs.quality IS 'Generation quality: fast or high';
COMMENT ON COLUMN public.jobs.model_type IS 'Specific Wan 2.1 model used (e.g., image_fast, video_high)';
COMMENT ON COLUMN public.usage_logs.format IS 'Format used for generation tracking';
COMMENT ON COLUMN public.usage_logs.quality IS 'Quality level used for analytics';
