-- Update jobs table constraints to support RV5.1 job types
-- Remove existing constraints
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_job_type_check;
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_model_type_check;

-- Add updated job_type constraint with rv51_fast and rv51_high
ALTER TABLE public.jobs ADD CONSTRAINT jobs_job_type_check
CHECK (job_type = ANY (ARRAY[
  'image_fast'::text,
  'image_high'::text,
  'video_fast'::text,  
  'video_high'::text,
  'sdxl_image_fast'::text,
  'sdxl_image_high'::text,
  'image7b_fast_enhanced'::text,
  'image7b_high_enhanced'::text,
  'video7b_fast_enhanced'::text,
  'video7b_high_enhanced'::text,
  'wan_video_fast'::text,
  'wan_video_high'::text,
  'rv51_fast'::text,
  'rv51_high'::text
]));

-- Add updated model_type constraint (remove 'default', keep engine families)
ALTER TABLE public.jobs ADD CONSTRAINT jobs_model_type_check
CHECK (model_type = ANY (ARRAY[
  'sdxl'::text,
  'wan'::text,
  'rv51'::text,
  'flux'::text
]));