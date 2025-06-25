
-- Update storage bucket names to follow the 4-job-type convention
-- This migration updates existing buckets and their policies

-- Recreate RLS policies for image_fast bucket (formerly character-images)
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

-- Recreate RLS policies for image_high bucket (formerly scene-previews)
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

-- Recreate RLS policies for video_fast bucket (formerly video-thumbnails)
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

-- Recreate RLS policies for video_high bucket (formerly videos-final)
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

-- Recreate RLS policies for system_assets bucket (public read, admin write)
CREATE POLICY "Anyone can view system assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'system_assets');

CREATE POLICY "Authenticated users can upload system assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'system_assets' AND auth.role() = 'authenticated');
