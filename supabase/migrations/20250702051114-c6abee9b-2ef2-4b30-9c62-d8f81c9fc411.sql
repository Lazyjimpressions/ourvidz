
-- Update the jobs table constraint to allow SDXL job types
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_job_type_check;

-- Add the updated constraint with all current job types including SDXL
ALTER TABLE public.jobs ADD CONSTRAINT jobs_job_type_check 
CHECK (job_type IN (
  'image_fast', 
  'image_high', 
  'video_fast', 
  'video_high',
  'sdxl_image_fast',
  'sdxl_image_high'
));

-- Update any existing jobs that might have old job types
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
  ELSE job_type
END
WHERE job_type NOT IN ('image_fast', 'image_high', 'video_fast', 'video_high', 'sdxl_image_fast', 'sdxl_image_high');
