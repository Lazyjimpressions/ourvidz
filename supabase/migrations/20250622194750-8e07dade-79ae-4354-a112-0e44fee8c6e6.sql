
-- Create dedicated images table for standalone image generation
CREATE TABLE public.images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT,
  prompt TEXT NOT NULL,
  enhanced_prompt TEXT,
  image_url TEXT,
  thumbnail_url TEXT,
  generation_mode TEXT NOT NULL DEFAULT 'standalone', -- 'standalone', 'preview', 'character'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for images table
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own images" 
  ON public.images 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own images" 
  ON public.images 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own images" 
  ON public.images 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images" 
  ON public.images 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add updated_at trigger for images table
CREATE TRIGGER handle_updated_at_images
  BEFORE UPDATE ON public.images
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add image_id column to jobs table to support image generation jobs
ALTER TABLE public.jobs ADD COLUMN image_id UUID REFERENCES public.images(id) ON DELETE CASCADE;

-- Add new job types for the extended workflow
-- The job_type column already exists, so we just need to use the new types:
-- 'enhance', 'image', 'preview', 'video'

-- Add indexes for better performance
CREATE INDEX idx_images_user_id ON public.images(user_id);
CREATE INDEX idx_images_project_id ON public.images(project_id);
CREATE INDEX idx_images_status ON public.images(status);
CREATE INDEX idx_jobs_image_id ON public.jobs(image_id);
