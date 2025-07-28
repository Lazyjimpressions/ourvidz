-- Fix numeric field overflow by temporarily dropping dependent views
-- Step 1: Drop dependent views
DROP VIEW IF EXISTS image_enhancement_analysis;
DROP VIEW IF EXISTS video_enhancement_analysis;
DROP VIEW IF EXISTS job_enhancement_analysis;

-- Step 2: Alter the column types to increase precision
ALTER TABLE public.jobs 
ALTER COLUMN qwen_expansion_percentage TYPE numeric(7,2);

ALTER TABLE public.images
ALTER COLUMN qwen_expansion_percentage TYPE numeric(7,2);

ALTER TABLE public.jobs
ALTER COLUMN quality_rating TYPE numeric(7,2),
ALTER COLUMN quality_improvement TYPE numeric(7,2);

ALTER TABLE public.images
ALTER COLUMN quality_rating TYPE numeric(7,2),
ALTER COLUMN quality_improvement TYPE numeric(7,2),
ALTER COLUMN reference_strength TYPE numeric(7,2);

-- Step 3: Recreate the views with updated column types
CREATE VIEW image_enhancement_analysis AS
SELECT 
    i.id,
    i.user_id,
    i.status,
    i.format,
    i.quality,
    i.prompt,
    i.enhanced_prompt,
    i.enhancement_strategy,
    i.enhancement_time_ms,
    i.quality_rating,
    i.quality_improvement,
    i.qwen_expansion_percentage,
    i.compel_weights,
    i.enhancement_display_name,
    i.created_at
FROM images i
WHERE i.enhancement_strategy IS NOT NULL;

CREATE VIEW video_enhancement_analysis AS
SELECT 
    v.id,
    v.user_id,
    v.status,
    v.resolution,
    v.duration,
    v.original_prompt,
    v.enhanced_prompt,
    v.enhancement_strategy,
    v.enhancement_time_ms,
    v.quality_rating,
    v.quality_improvement,
    v.qwen_expansion_percentage,
    v.compel_weights,
    v.enhancement_display_name,
    v.created_at,
    v.completed_at
FROM videos v
WHERE v.enhancement_strategy IS NOT NULL;

CREATE VIEW job_enhancement_analysis AS
SELECT 
    j.id,
    j.user_id,
    j.job_type,
    j.status,
    j.original_prompt,
    j.enhanced_prompt,
    j.enhancement_strategy,
    j.enhancement_time_ms,
    j.quality_rating,
    j.quality_improvement,
    j.model_type,
    j.enhancement_display_name,
    j.created_at,
    j.completed_at,
    EXTRACT(EPOCH FROM (j.completed_at - j.created_at))/60 as generation_time_seconds
FROM jobs j
WHERE j.enhancement_strategy IS NOT NULL;