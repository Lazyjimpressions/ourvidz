
-- Add missing fields to profiles table for age verification
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS age_verified BOOLEAN DEFAULT false;

-- Add missing fields to projects table for preview and reference images
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS preview_url TEXT,
ADD COLUMN IF NOT EXISTS reference_image_url TEXT;

-- Add missing fields to scenes table for enhanced functionality
ALTER TABLE public.scenes 
ADD COLUMN IF NOT EXISTS final_stitched_url TEXT;

-- Add missing fields to videos table for enhanced functionality
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS preview_url TEXT,
ADD COLUMN IF NOT EXISTS reference_image_url TEXT;

-- Create storage buckets for the video generation pipeline
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('character-images', 'character-images', false),
  ('scene-previews', 'scene-previews', false),
  ('video-thumbnails', 'video-thumbnails', false),
  ('videos-final', 'videos-final', false),
  ('system-assets', 'system-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for character-images bucket
DROP POLICY IF EXISTS "Users can upload their own character images" ON storage.objects;
CREATE POLICY "Users can upload their own character images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'character-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view their own character images" ON storage.objects;
CREATE POLICY "Users can view their own character images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'character-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own character images" ON storage.objects;
CREATE POLICY "Users can update their own character images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'character-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own character images" ON storage.objects;
CREATE POLICY "Users can delete their own character images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'character-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RLS policies for scene-previews bucket
DROP POLICY IF EXISTS "Users can upload their own scene previews" ON storage.objects;
CREATE POLICY "Users can upload their own scene previews" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'scene-previews' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view their own scene previews" ON storage.objects;
CREATE POLICY "Users can view their own scene previews" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'scene-previews' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own scene previews" ON storage.objects;
CREATE POLICY "Users can update their own scene previews" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'scene-previews' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own scene previews" ON storage.objects;
CREATE POLICY "Users can delete their own scene previews" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'scene-previews' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RLS policies for video-thumbnails bucket
DROP POLICY IF EXISTS "Users can upload their own video thumbnails" ON storage.objects;
CREATE POLICY "Users can upload their own video thumbnails" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'video-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view their own video thumbnails" ON storage.objects;
CREATE POLICY "Users can view their own video thumbnails" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'video-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own video thumbnails" ON storage.objects;
CREATE POLICY "Users can update their own video thumbnails" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'video-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own video thumbnails" ON storage.objects;
CREATE POLICY "Users can delete their own video thumbnails" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'video-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RLS policies for videos-final bucket
DROP POLICY IF EXISTS "Users can upload their own final videos" ON storage.objects;
CREATE POLICY "Users can upload their own final videos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'videos-final' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view their own final videos" ON storage.objects;
CREATE POLICY "Users can view their own final videos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'videos-final' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own final videos" ON storage.objects;
CREATE POLICY "Users can update their own final videos" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'videos-final' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own final videos" ON storage.objects;
CREATE POLICY "Users can delete their own final videos" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'videos-final' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RLS policies for system-assets bucket (public)
DROP POLICY IF EXISTS "System assets are publicly accessible" ON storage.objects;
CREATE POLICY "System assets are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'system-assets');

DROP POLICY IF EXISTS "Only authenticated users can upload system assets" ON storage.objects;
CREATE POLICY "Only authenticated users can upload system assets" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'system-assets' AND auth.role() = 'authenticated');
