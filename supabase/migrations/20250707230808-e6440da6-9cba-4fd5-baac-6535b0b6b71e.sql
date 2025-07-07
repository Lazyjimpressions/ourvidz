-- Phase 3: Database Consistency Migration
-- Fix existing video records that have incorrect user_id prefixed paths

-- First, let's backup and fix video records where the database path doesn't match storage
-- The WAN worker uploads directly to bucket root (e.g., video_id.mp4)
-- But callback incorrectly adds user_id prefix (e.g., user_id/video_id.mp4)

-- Update completed videos to remove incorrect user_id prefix from video_url
UPDATE videos 
SET video_url = CASE 
  WHEN video_url LIKE '%/%' AND video_url NOT LIKE 'system_assets/%' THEN 
    SPLIT_PART(video_url, '/', 2)  -- Extract filename after slash
  ELSE 
    video_url  -- Keep as-is if no slash or system asset
END,
metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'path_migration_applied', true,
  'path_migration_timestamp', NOW()::text,
  'original_path_had_prefix', CASE WHEN video_url LIKE '%/%' THEN true ELSE false END
)
WHERE status = 'completed' 
  AND video_url IS NOT NULL 
  AND video_url != '';

-- Add function to validate video path consistency  
CREATE OR REPLACE FUNCTION public.validate_video_path_consistency()
RETURNS TABLE (
  video_id UUID,
  current_path TEXT,
  expected_path TEXT,
  path_matches BOOLEAN,
  requires_fix BOOLEAN
) 
LANGUAGE SQL
AS $$
  SELECT 
    v.id as video_id,
    v.video_url as current_path,
    v.id::text || '.mp4' as expected_path,
    (v.video_url = v.id::text || '.mp4') as path_matches,
    (v.video_url != v.id::text || '.mp4' AND v.status = 'completed') as requires_fix
  FROM videos v
  WHERE v.video_url IS NOT NULL;
$$;

-- Add monitoring function for path validation
CREATE OR REPLACE FUNCTION public.get_video_path_stats()
RETURNS TABLE (
  total_videos BIGINT,
  videos_with_user_prefix BIGINT,
  videos_without_prefix BIGINT,
  system_asset_thumbnails BIGINT
)
LANGUAGE SQL  
AS $$
  SELECT 
    COUNT(*) as total_videos,
    COUNT(*) FILTER (WHERE video_url LIKE '%/%' AND video_url NOT LIKE 'system_assets/%') as videos_with_user_prefix,
    COUNT(*) FILTER (WHERE video_url NOT LIKE '%/%' OR video_url IS NULL) as videos_without_prefix,
    COUNT(*) FILTER (WHERE thumbnail_url LIKE 'system_assets/%') as system_asset_thumbnails
  FROM videos
  WHERE status = 'completed';
$$;