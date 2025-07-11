-- Phase 1: Add Critical Indexes for Foreign Keys (Library Performance Fix)
-- This addresses the root cause of blank library page by adding missing indexes on user_id foreign keys

-- Critical indexes for Library queries - these are essential for asset loading
CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);

-- High-traffic foreign key indexes for related queries
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_project_id ON videos(project_id);

-- Secondary foreign key indexes for admin/moderation features
CREATE INDEX IF NOT EXISTS idx_images_reviewed_by ON images(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_jobs_reviewed_by ON jobs(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_model_config_history_created_by ON model_config_history(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_character_id ON projects(character_id);

-- Model test result indexes for admin functionality
CREATE INDEX IF NOT EXISTS idx_model_test_results_image_id ON model_test_results(image_id);
CREATE INDEX IF NOT EXISTS idx_model_test_results_job_id ON model_test_results(job_id);
CREATE INDEX IF NOT EXISTS idx_model_test_results_video_id ON model_test_results(video_id);

-- Phase 2: Remove Unused Indexes to Improve Performance
-- These indexes consume resources without providing query benefits

DROP INDEX IF EXISTS idx_images_image_urls;
DROP INDEX IF EXISTS idx_jobs_prompt_test_id;
DROP INDEX IF EXISTS idx_user_activity_log_user_id;
DROP INDEX IF EXISTS idx_user_activity_log_action;
DROP INDEX IF EXISTS idx_images_moderation_status;
DROP INDEX IF EXISTS idx_jobs_moderation_status;
DROP INDEX IF EXISTS idx_images_reviewed_at;
DROP INDEX IF EXISTS idx_jobs_reviewed_at;
DROP INDEX IF EXISTS idx_images_nsfw_score;
DROP INDEX IF EXISTS idx_model_test_results_user_id;
DROP INDEX IF EXISTS idx_model_test_results_model_type;
DROP INDEX IF EXISTS idx_model_test_results_test_series;
DROP INDEX IF EXISTS idx_model_test_results_test_tier;
DROP INDEX IF EXISTS idx_images_file_size;
DROP INDEX IF EXISTS idx_model_test_results_quality;
DROP INDEX IF EXISTS idx_model_test_results_success;
DROP INDEX IF EXISTS idx_model_test_results_metadata;
DROP INDEX IF EXISTS idx_model_test_results_model_series;
DROP INDEX IF EXISTS idx_model_test_results_model_tier;
DROP INDEX IF EXISTS idx_model_test_results_series_tier;
DROP INDEX IF EXISTS idx_images_signed_url_expires_at;
DROP INDEX IF EXISTS idx_videos_signed_url_expires_at;

-- Add comment for documentation
COMMENT ON INDEX idx_images_user_id IS 'Critical index for Library page asset queries - resolves blank library issue';
COMMENT ON INDEX idx_videos_user_id IS 'Critical index for Library page asset queries - resolves blank library issue';