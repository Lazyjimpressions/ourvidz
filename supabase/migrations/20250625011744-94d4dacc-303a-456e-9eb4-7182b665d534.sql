
-- Update the jobs table constraint to allow new job types
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_job_type_check;

-- Add the updated constraint with the new job types
ALTER TABLE public.jobs ADD CONSTRAINT jobs_job_type_check 
CHECK (job_type IN ('enhance', 'preview', 'video', 'image', 'image_generation', 'video_generation'));
