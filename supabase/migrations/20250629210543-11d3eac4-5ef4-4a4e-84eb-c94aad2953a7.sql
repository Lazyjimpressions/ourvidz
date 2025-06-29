
-- Update video_fast bucket to support proper video MIME types
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['video/mp4', 'video/mpeg', 'video/webm', 'video/quicktime']
WHERE id = 'video_fast';

-- Update video_high bucket to support proper video MIME types  
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['video/mp4', 'video/mpeg', 'video/webm', 'video/quicktime']
WHERE id = 'video_high';

-- Also ensure proper file size limits for video files
UPDATE storage.buckets 
SET file_size_limit = 52428800  -- 50MB for fast videos
WHERE id = 'video_fast';

UPDATE storage.buckets 
SET file_size_limit = 209715200  -- 200MB for high quality videos
WHERE id = 'video_high';
