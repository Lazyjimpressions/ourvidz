
-- Remove all existing job type constraints completely
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_job_type_check;

-- Update any remaining old job types to new format
UPDATE public.jobs 
SET job_type = CASE 
  WHEN job_type = 'image_generation' AND (metadata->>'quality' = 'fast' OR metadata->>'quality' IS NULL) THEN 'image_fast'
  WHEN job_type = 'image_generation' AND metadata->>'quality' = 'high' THEN 'image_high'
  WHEN job_type = 'video_generation' AND (metadata->>'quality' = 'fast' OR metadata->>'quality' IS NULL) THEN 'video_fast'
  WHEN job_type = 'video_generation' AND metadata->>'quality' = 'high' THEN 'video_high'
  WHEN job_type = 'image' AND (metadata->>'quality' = 'fast' OR metadata->>'quality' IS NULL) THEN 'image_fast'
  WHEN job_type = 'image' AND metadata->>'quality' = 'high' THEN 'image_high'
  WHEN job_type = 'video' AND (metadata->>'quality' = 'fast' OR metadata->>'quality' IS NULL) THEN 'video_fast'
  WHEN job_type = 'video' AND metadata->>'quality' = 'high' THEN 'video_high'
  WHEN job_type = 'enhance' THEN 'image_high'
  WHEN job_type = 'preview' THEN 'image_fast'
  ELSE job_type -- Keep existing new format job types unchanged
END
WHERE job_type NOT IN ('image_fast', 'image_high', 'video_fast', 'video_high');

-- Now add the clean constraint with only the 4 job types
ALTER TABLE public.jobs ADD CONSTRAINT jobs_job_type_check 
CHECK (job_type IN ('image_fast', 'image_high', 'video_fast', 'video_high'));
