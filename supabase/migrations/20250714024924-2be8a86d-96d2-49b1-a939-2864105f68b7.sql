-- Clear all storage bucket contents except system_assets
-- This removes orphaned files that no longer have corresponding database records

-- Clear image buckets
DELETE FROM storage.objects WHERE bucket_id = 'image_fast';
DELETE FROM storage.objects WHERE bucket_id = 'image_high';
DELETE FROM storage.objects WHERE bucket_id = 'sdxl_image_fast';
DELETE FROM storage.objects WHERE bucket_id = 'sdxl_image_high';

-- Clear video buckets  
DELETE FROM storage.objects WHERE bucket_id = 'video_fast';
DELETE FROM storage.objects WHERE bucket_id = 'video_high';

-- Note: system_assets bucket is preserved as it contains UI assets