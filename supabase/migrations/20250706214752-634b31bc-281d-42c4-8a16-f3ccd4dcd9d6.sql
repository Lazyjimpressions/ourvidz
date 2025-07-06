-- Phase 1: Fix 6 Stuck Video Jobs (completed jobs with queued video status)
-- Update video records to completed status where job is completed but video is still queued
UPDATE videos 
SET 
  status = 'completed',
  completed_at = COALESCE(videos.completed_at, now())
FROM jobs 
WHERE videos.id = jobs.video_id 
  AND jobs.status = 'completed' 
  AND videos.status = 'queued'
  AND jobs.completed_at IS NOT NULL;

-- Phase 1: Fix 4 Failed Image Jobs (failed jobs with queued image status)  
-- Update image records to failed status where job failed but image is still queued
UPDATE images 
SET 
  status = 'failed',
  metadata = COALESCE(images.metadata, '{}'::jsonb) || jsonb_build_object('failed_at', now()::text)
FROM jobs 
WHERE images.id = jobs.image_id 
  AND jobs.status = 'failed' 
  AND images.status = 'queued'
  AND jobs.error_message IS NOT NULL;

-- Phase 2: Purge Legacy Jobs Before July 6, 2025
-- Delete old jobs and their associated assets created before today
DELETE FROM jobs 
WHERE created_at < '2025-07-06'::date;

-- Clean up orphaned images that no longer have associated jobs
DELETE FROM images 
WHERE id NOT IN (SELECT image_id FROM jobs WHERE image_id IS NOT NULL)
  AND created_at < '2025-07-06'::date;

-- Clean up orphaned videos that no longer have associated jobs  
DELETE FROM videos 
WHERE id NOT IN (SELECT video_id FROM jobs WHERE video_id IS NOT NULL)
  AND created_at < '2025-07-06'::date;