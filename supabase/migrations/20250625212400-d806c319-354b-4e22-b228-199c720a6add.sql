
-- Make project_id nullable in videos table to allow standalone video generation
ALTER TABLE public.videos ALTER COLUMN project_id DROP NOT NULL;

-- Add a comment to document this change
COMMENT ON COLUMN public.videos.project_id IS 'Optional project reference - null for standalone videos generated from workspace';
