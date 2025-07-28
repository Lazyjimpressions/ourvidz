-- Fix numeric field overflow by dropping ALL dependent views first
-- Drop all enhancement and analytics views that might depend on the columns
DROP VIEW IF EXISTS image_enhancement_analysis CASCADE;
DROP VIEW IF EXISTS video_enhancement_analysis CASCADE; 
DROP VIEW IF EXISTS job_enhancement_analysis CASCADE;
DROP VIEW IF EXISTS enhancement_effectiveness CASCADE;
DROP VIEW IF EXISTS content_moderation_analytics CASCADE;
DROP VIEW IF EXISTS user_analytics CASCADE;
DROP VIEW IF EXISTS model_test_analytics CASCADE;
DROP VIEW IF EXISTS model_test_summary CASCADE;

-- Now alter the column types to increase precision
ALTER TABLE public.jobs 
ALTER COLUMN qwen_expansion_percentage TYPE numeric(7,2),
ALTER COLUMN quality_rating TYPE numeric(7,2),
ALTER COLUMN quality_improvement TYPE numeric(7,2);

ALTER TABLE public.images
ALTER COLUMN qwen_expansion_percentage TYPE numeric(7,2),
ALTER COLUMN quality_rating TYPE numeric(7,2),
ALTER COLUMN quality_improvement TYPE numeric(7,2),
ALTER COLUMN reference_strength TYPE numeric(7,2);

-- Also update videos table if it has these columns
ALTER TABLE public.videos
ALTER COLUMN quality_rating TYPE numeric(7,2),
ALTER COLUMN quality_improvement TYPE numeric(7,2),
ALTER COLUMN qwen_expansion_percentage TYPE numeric(7,2);