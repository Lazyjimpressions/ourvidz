-- First, temporarily disable the trigger that validates video URLs
ALTER TABLE videos DISABLE TRIGGER ALL;

-- Update completed videos without thumbnails to have placeholder
UPDATE videos 
SET thumbnail_url = 'system_assets/video-placeholder-thumbnail.png'
WHERE thumbnail_url IS NULL AND status = 'completed';

-- Re-enable all triggers
ALTER TABLE videos ENABLE TRIGGER ALL;