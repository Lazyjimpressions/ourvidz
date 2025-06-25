
-- Update storage bucket names to follow the 4-job-type convention
UPDATE storage.buckets 
SET name = CASE 
  WHEN name = 'character-images' THEN 'image_fast'
  WHEN name = 'scene-previews' THEN 'image_high'
  WHEN name = 'video-thumbnails' THEN 'video_fast'
  WHEN name = 'videos-final' THEN 'video_high'
  WHEN name = 'system-assets' THEN 'system_assets'
  ELSE name
END
WHERE name IN ('character-images', 'scene-previews', 'video-thumbnails', 'videos-final', 'system-assets');
