-- Update the jobs table constraint to allow all enhanced job types
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_job_type_check;

-- Add the updated constraint with all 10 job types including enhanced variants
ALTER TABLE public.jobs ADD CONSTRAINT jobs_job_type_check 
CHECK (job_type IN (
  'image_fast', 
  'image_high', 
  'video_fast', 
  'video_high',
  'sdxl_image_fast',
  'sdxl_image_high',
  'image7b_fast_enhanced',
  'image7b_high_enhanced',
  'video7b_fast_enhanced',
  'video7b_high_enhanced'
));