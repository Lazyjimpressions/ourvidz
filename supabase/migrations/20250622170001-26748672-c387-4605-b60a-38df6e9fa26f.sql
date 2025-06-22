
-- Add project_id column to jobs table
ALTER TABLE public.jobs 
ADD COLUMN project_id UUID REFERENCES public.projects(id);

-- Add index for better query performance
CREATE INDEX idx_jobs_project_id ON public.jobs(project_id);
