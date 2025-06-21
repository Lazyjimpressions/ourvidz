
-- Create storage buckets for the video creation application
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('character-images', 'character-images', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('scene-previews', 'scene-previews', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('video-thumbnails', 'video-thumbnails', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('videos-final', 'videos-final', false, 104857600, ARRAY['video/mp4', 'video/webm']),
  ('system-assets', 'system-assets', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for character-images bucket
CREATE POLICY "Users can view their own character images"
ON storage.objects FOR SELECT
USING (bucket_id = 'character-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own character images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'character-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own character images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'character-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own character images"
ON storage.objects FOR DELETE
USING (bucket_id = 'character-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RLS policies for scene-previews bucket
CREATE POLICY "Users can view their own scene previews"
ON storage.objects FOR SELECT
USING (bucket_id = 'scene-previews' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own scene previews"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'scene-previews' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own scene previews"
ON storage.objects FOR UPDATE
USING (bucket_id = 'scene-previews' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own scene previews"
ON storage.objects FOR DELETE
USING (bucket_id = 'scene-previews' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RLS policies for video-thumbnails bucket
CREATE POLICY "Users can view their own video thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'video-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own video thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'video-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own video thumbnails"
ON storage.objects FOR UPDATE
USING (bucket_id = 'video-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own video thumbnails"
ON storage.objects FOR DELETE
USING (bucket_id = 'video-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RLS policies for videos-final bucket
CREATE POLICY "Users can view their own final videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos-final' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own final videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'videos-final' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own final videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'videos-final' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own final videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'videos-final' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RLS policies for system-assets bucket (public read, admin write)
CREATE POLICY "Anyone can view system assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'system-assets');

CREATE POLICY "Authenticated users can upload system assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'system-assets' AND auth.role() = 'authenticated');
