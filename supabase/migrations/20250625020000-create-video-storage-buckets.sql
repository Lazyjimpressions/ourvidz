
-- Create storage buckets for video files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('video_fast', 'video_fast', true, 104857600, ARRAY['video/mp4', 'video/webm']), -- 100MB limit
  ('video_high', 'video_high', true, 209715200, ARRAY['video/mp4', 'video/webm']) -- 200MB limit
ON CONFLICT (id) DO NOTHING;

-- Create permissive RLS policies for video buckets
CREATE POLICY "Allow all operations on video_fast bucket"
ON storage.objects FOR ALL
USING (bucket_id = 'video_fast');

CREATE POLICY "Allow all operations on video_high bucket"
ON storage.objects FOR ALL
USING (bucket_id = 'video_high');
