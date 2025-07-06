-- Performance optimization: Add database indices for faster Library page queries

-- Images table indices for efficient filtering and sorting
CREATE INDEX IF NOT EXISTS idx_images_user_status_created ON images(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_user_quality_created ON images(user_id, quality, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_user_created ON images(user_id, created_at DESC);

-- Videos table indices for efficient filtering and sorting  
CREATE INDEX IF NOT EXISTS idx_videos_user_status_created ON videos(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_user_created ON videos(user_id, created_at DESC);

-- Jobs table indices for asset lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_jobs_image_id ON jobs(image_id) WHERE image_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_video_id ON jobs(video_id) WHERE video_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_user_status_created ON jobs(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at) WHERE status IN ('processing', 'queued');

-- Composite index for efficient asset-job joins
CREATE INDEX IF NOT EXISTS idx_jobs_asset_lookup ON jobs(user_id, image_id, video_id, status, job_type);

-- Index for cleanup operations (find old stuck jobs)
CREATE INDEX IF NOT EXISTS idx_jobs_cleanup ON jobs(status, created_at) WHERE status IN ('processing', 'queued', 'failed');