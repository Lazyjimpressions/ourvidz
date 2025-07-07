-- Populate missing video thumbnails with placeholder
UPDATE videos 
SET thumbnail_url = 'system_assets/video-placeholder-thumbnail.png'
WHERE thumbnail_url IS NULL AND status = 'completed';