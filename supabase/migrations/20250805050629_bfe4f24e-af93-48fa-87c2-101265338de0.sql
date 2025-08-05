-- Add template_name column to jobs table for better analytics
ALTER TABLE public.jobs 
ADD COLUMN template_name text;