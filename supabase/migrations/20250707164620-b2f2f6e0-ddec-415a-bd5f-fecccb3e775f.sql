-- Add validation trigger to ensure completed videos have URLs
CREATE OR REPLACE FUNCTION public.validate_completed_video_urls()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if video is being marked as completed but has no URL
  IF NEW.status = 'completed' AND (NEW.video_url IS NULL OR NEW.video_url = '') THEN
    RAISE EXCEPTION 'Completed videos must have a video_url';
  END IF;
  
  -- If video_url is set but signed_url is not, copy video_url to signed_url
  IF NEW.video_url IS NOT NULL AND NEW.video_url != '' AND (NEW.signed_url IS NULL OR NEW.signed_url = '') THEN
    NEW.signed_url = NEW.video_url;
    NEW.signed_url_expires_at = NOW() + INTERVAL '24 hours';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for video URL validation
DROP TRIGGER IF EXISTS validate_video_urls_trigger ON videos;
CREATE TRIGGER validate_video_urls_trigger
  BEFORE INSERT OR UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION validate_completed_video_urls();

-- Backfill missing signed_url for existing videos that have video_url
UPDATE videos 
SET 
  signed_url = video_url,
  signed_url_expires_at = NOW() + INTERVAL '24 hours'
WHERE 
  video_url IS NOT NULL 
  AND video_url != '' 
  AND (signed_url IS NULL OR signed_url = '')
  AND status = 'completed';

-- Log the backfill results
DO $$
DECLARE
  backfill_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backfill_count
  FROM videos 
  WHERE video_url IS NOT NULL 
    AND video_url != '' 
    AND signed_url IS NOT NULL 
    AND status = 'completed';
  
  RAISE NOTICE 'Backfilled signed_url for % completed videos', backfill_count;
END $$;