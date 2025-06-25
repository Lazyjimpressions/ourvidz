
-- Phase 1: Remove all existing storage buckets and their policies
DELETE FROM storage.objects WHERE bucket_id IN ('character-images', 'scene-previews', 'video-thumbnails', 'videos-final', 'system-assets');
DELETE FROM storage.buckets WHERE id IN ('character-images', 'scene-previews', 'video-thumbnails', 'videos-final', 'system-assets');

-- Phase 2: Create new storage buckets with aligned names and proper configuration

-- Create image_fast bucket (for character images and quick generation)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'image_fast',
  'image_fast', 
  false,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
);

-- Create image_high bucket (for high-quality scene previews)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'image_high',
  'image_high',
  false,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
);

-- Create video_fast bucket (for video thumbnails)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video_fast',
  'video_fast',
  false,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
);

-- Create video_high bucket (for final videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video_high',
  'video_high',
  false,
  104857600, -- 100MB
  ARRAY['video/mp4', 'video/webm']
);

-- Create system_assets bucket (for public system assets)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'system_assets',
  'system_assets',
  true,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
);

-- Phase 3: Drop existing policies and recreate them for the new buckets
DROP POLICY IF EXISTS "Users can view their own fast images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own fast images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own fast images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own fast images" ON storage.objects;

DROP POLICY IF EXISTS "Users can view their own high quality images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own high quality images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own high quality images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own high quality images" ON storage.objects;

DROP POLICY IF EXISTS "Users can view their own fast videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own fast videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own fast videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own fast videos" ON storage.objects;

DROP POLICY IF EXISTS "Users can view their own high quality videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own high quality videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own high quality videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own high quality videos" ON storage.objects;

DROP POLICY IF EXISTS "Anyone can view system assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload system assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update system assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete system assets" ON storage.objects;

-- Now create the new policies
-- RLS policies for image_fast bucket
CREATE POLICY "Users can view their own fast images"
ON storage.objects FOR SELECT
USING (bucket_id = 'image_fast' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own fast images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'image_fast' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own fast images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'image_fast' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own fast images"
ON storage.objects FOR DELETE
USING (bucket_id = 'image_fast' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policies for image_high bucket
CREATE POLICY "Users can view their own high quality images"
ON storage.objects FOR SELECT
USING (bucket_id = 'image_high' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own high quality images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'image_high' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own high quality images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'image_high' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own high quality images"
ON storage.objects FOR DELETE
USING (bucket_id = 'image_high' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policies for video_fast bucket
CREATE POLICY "Users can view their own fast videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'video_fast' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own fast videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'video_fast' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own fast videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'video_fast' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own fast videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'video_fast' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policies for video_high bucket
CREATE POLICY "Users can view their own high quality videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'video_high' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own high quality videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'video_high' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own high quality videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'video_high' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own high quality videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'video_high' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policies for system_assets bucket (public read, authenticated write)
CREATE POLICY "Anyone can view system assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'system_assets');

CREATE POLICY "Authenticated users can upload system assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'system_assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update system assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'system_assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete system assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'system_assets' AND auth.role() = 'authenticated');
