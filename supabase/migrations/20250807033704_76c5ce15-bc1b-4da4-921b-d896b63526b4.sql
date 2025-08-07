-- Comprehensive cleanup of all images, videos, and related data
-- This will delete all storage files and database records for a fresh start

-- 1. Delete all files from storage buckets
DELETE FROM storage.objects WHERE bucket_id IN (
  'image_fast', 
  'image_high', 
  'sdxl_image_fast', 
  'sdxl_image_high',
  'image7b_fast_enhanced',
  'image7b_high_enhanced',
  'video_fast', 
  'video_high',
  'video7b_fast_enhanced',
  'video7b_high_enhanced',
  'videos',
  'reference_images'
);

-- 2. Delete all workspace items
DELETE FROM workspace_items;

-- 3. Delete all workspace sessions
DELETE FROM workspace_sessions;

-- 4. Delete all images
DELETE FROM images;

-- 5. Delete all videos
DELETE FROM videos;

-- 6. Delete all jobs
DELETE FROM jobs;

-- 7. Clean up usage logs for generation actions
DELETE FROM usage_logs WHERE action IN (
  'generate_image', 
  'generate_video', 
  'enhance_prompt',
  'workspace_generation'
);

-- 8. Clean up user activity logs for generation activities
DELETE FROM user_activity_log WHERE action IN (
  'image_generated',
  'video_generated', 
  'prompt_enhanced',
  'workspace_item_created',
  'workspace_session_created'
);