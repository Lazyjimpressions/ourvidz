-- Fix jobs table constraint to include WAN video job types
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_job_type_check;

-- Add the updated constraint with all supported job types including WAN video
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
  'video7b_high_enhanced',
  'wan_video_fast',
  'wan_video_high'
));

-- Also update model_type constraint if it exists
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_model_type_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_model_type_check 
CHECK (model_type IN ('sdxl', 'image7b', 'wan', 'default'));