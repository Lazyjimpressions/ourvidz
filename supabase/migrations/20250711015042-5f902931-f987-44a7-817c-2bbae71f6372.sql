-- Admin Portal Enhancements Migration (Corrected)
-- Adds support for user management, content moderation, analytics, and system configuration

-- Add missing columns to images table
ALTER TABLE images ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE images ADD COLUMN IF NOT EXISTS nsfw_score DECIMAL(3,2);

-- Create system_config table for storing application settings
CREATE TABLE IF NOT EXISTS system_config (
    id BIGINT PRIMARY KEY DEFAULT 1,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default system configuration
INSERT INTO system_config (id, config) VALUES (
    1,
    '{
        "maxConcurrentJobs": 10,
        "maxJobsPerUser": 100,
        "maxJobsPerHour": 20,
        "jobTimeoutMinutes": 30,
        "defaultImageModel": "sdxl_lustify",
        "defaultVideoModel": "wan",
        "enableNSFWDetection": true,
        "nsfwThreshold": 0.7,
        "maxFileSizeMB": 50,
        "maxStoragePerUserGB": 10,
        "enableCompression": true,
        "requireEmailVerification": true,
        "allowGuestAccess": false,
        "maxGuestJobs": 5,
        "maintenanceMode": false,
        "debugMode": false,
        "enableAnalytics": true,
        "rateLimitRequestsPerMinute": 60,
        "rateLimitBurstSize": 10,
        "emailNotifications": true,
        "slackWebhookUrl": "",
        "discordWebhookUrl": ""
    }'
) ON CONFLICT (id) DO NOTHING;

-- Add moderation fields to images table
ALTER TABLE images ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending';
ALTER TABLE images ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE images ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id);
ALTER TABLE images ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Add validation trigger for images moderation_status
CREATE OR REPLACE FUNCTION validate_images_moderation_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.moderation_status NOT IN ('pending', 'approved', 'rejected', 'flagged') THEN
        RAISE EXCEPTION 'Invalid moderation_status. Must be pending, approved, rejected, or flagged';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_images_moderation_status_trigger
    BEFORE INSERT OR UPDATE ON images
    FOR EACH ROW EXECUTE FUNCTION validate_images_moderation_status();

-- Add moderation fields to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Add validation trigger for jobs moderation_status
CREATE OR REPLACE FUNCTION validate_jobs_moderation_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.moderation_status NOT IN ('pending', 'approved', 'rejected', 'flagged') THEN
        RAISE EXCEPTION 'Invalid moderation_status. Must be pending, approved, rejected, or flagged';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_jobs_moderation_status_trigger
    BEFORE INSERT OR UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION validate_jobs_moderation_status();

-- Create user_activity_log table for tracking user actions
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_action ON user_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_images_moderation_status ON images(moderation_status);
CREATE INDEX IF NOT EXISTS idx_jobs_moderation_status ON jobs(moderation_status);
CREATE INDEX IF NOT EXISTS idx_images_reviewed_at ON images(reviewed_at);
CREATE INDEX IF NOT EXISTS idx_jobs_reviewed_at ON jobs(reviewed_at);
CREATE INDEX IF NOT EXISTS idx_images_file_size ON images(file_size);
CREATE INDEX IF NOT EXISTS idx_images_nsfw_score ON images(nsfw_score);

-- Create trigger for system_config table
CREATE TRIGGER update_system_config_updated_at 
    BEFORE UPDATE ON system_config 
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Create function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT DEFAULT NULL,
    p_resource_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO user_activity_log (
        user_id, action, resource_type, resource_id, 
        metadata, ip_address, user_agent
    ) VALUES (
        p_user_id, p_action, p_resource_type, p_resource_id,
        p_metadata, p_ip_address, p_user_agent
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create view for user analytics (corrected)
CREATE OR REPLACE VIEW user_analytics AS
SELECT 
    p.id as user_id,
    p.username,
    p.created_at as user_created_at,
    COUNT(DISTINCT j.id) as total_jobs,
    COUNT(DISTINCT CASE WHEN j.status = 'completed' THEN j.id END) as completed_jobs,
    COUNT(DISTINCT CASE WHEN j.status = 'failed' THEN j.id END) as failed_jobs,
    COUNT(DISTINCT i.id) as total_images,
    COALESCE(SUM(i.file_size), 0) as storage_used_bytes,
    COUNT(DISTINCT CASE WHEN j.job_type LIKE '%video%' THEN j.id END) as total_videos,
    AVG(CASE WHEN j.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (j.completed_at - j.created_at))/60 
        ELSE NULL END) as avg_job_time_minutes
FROM profiles p
LEFT JOIN jobs j ON p.id = j.user_id
LEFT JOIN images i ON p.id = i.user_id
GROUP BY p.id, p.username, p.created_at;

-- Create view for content moderation analytics (corrected)
CREATE OR REPLACE VIEW content_moderation_analytics AS
SELECT 
    'images' as content_type,
    moderation_status,
    COUNT(*) as count,
    AVG(nsfw_score) as avg_nsfw_score,
    COUNT(CASE WHEN nsfw_score > 0.8 THEN 1 END) as high_nsfw_count,
    COUNT(CASE WHEN nsfw_score > 0.6 THEN 1 END) as medium_nsfw_count,
    COUNT(CASE WHEN nsfw_score > 0.4 THEN 1 END) as low_nsfw_count
FROM images 
GROUP BY moderation_status

UNION ALL

SELECT 
    'jobs' as content_type,
    moderation_status,
    COUNT(*) as count,
    NULL as avg_nsfw_score,
    NULL as high_nsfw_count,
    NULL as medium_nsfw_count,
    NULL as low_nsfw_count
FROM jobs 
GROUP BY moderation_status;

-- Create function to get system statistics (corrected)
CREATE OR REPLACE FUNCTION get_system_stats(p_days INTEGER DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
    start_date TIMESTAMP WITH TIME ZONE;
    result JSONB;
BEGIN
    start_date := NOW() - INTERVAL '1 day' * p_days;
    
    SELECT jsonb_build_object(
        'total_users', (SELECT COUNT(*) FROM profiles),
        'active_users', (SELECT COUNT(*) FROM profiles WHERE created_at > start_date - INTERVAL '7 days'),
        'new_users_today', (SELECT COUNT(*) FROM profiles WHERE created_at > NOW()::date),
        'new_users_period', (SELECT COUNT(*) FROM profiles WHERE created_at > start_date),
        'total_jobs', (SELECT COUNT(*) FROM jobs WHERE created_at > start_date),
        'completed_jobs', (SELECT COUNT(*) FROM jobs WHERE status = 'completed' AND created_at > start_date),
        'failed_jobs', (SELECT COUNT(*) FROM jobs WHERE status = 'failed' AND created_at > start_date),
        'total_images', (SELECT COUNT(*) FROM images WHERE created_at > start_date),
        'total_videos', (SELECT COUNT(*) FROM jobs WHERE job_type LIKE '%video%' AND created_at > start_date),
        'storage_used', (SELECT COALESCE(SUM(file_size), 0) FROM images),
        'avg_job_time', (
            SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/60)
            FROM jobs 
            WHERE completed_at IS NOT NULL AND created_at > start_date
        ),
        'success_rate', (
            SELECT CASE 
                WHEN COUNT(*) > 0 THEN 
                    (COUNT(CASE WHEN status = 'completed' THEN 1 END)::FLOAT / COUNT(*) * 100)
                ELSE 0 
            END
            FROM jobs 
            WHERE created_at > start_date
        ),
        'job_type_breakdown', (
            SELECT COALESCE(jsonb_object_agg(job_type, count), '{}'::jsonb)
            FROM (
                SELECT job_type, COUNT(*) as count
                FROM jobs 
                WHERE created_at > start_date
                GROUP BY job_type
            ) t
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable RLS on new tables
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_activity_log
CREATE POLICY "Admin can view all activity logs" ON user_activity_log
    FOR SELECT USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Users can view their own activity logs" ON user_activity_log
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Admin can manage activity logs" ON user_activity_log
    FOR ALL USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- RLS policies for system_config
CREATE POLICY "Admin can manage system config" ON system_config
    FOR ALL USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- Grant necessary permissions
GRANT SELECT ON user_analytics TO authenticated;
GRANT SELECT ON content_moderation_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_stats TO authenticated;
GRANT EXECUTE ON FUNCTION log_user_activity TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE system_config IS 'Stores application-wide configuration settings for admin portal';
COMMENT ON TABLE user_activity_log IS 'Tracks user actions for analytics and audit purposes';
COMMENT ON VIEW user_analytics IS 'Aggregated user statistics and usage metrics for admin dashboard';
COMMENT ON VIEW content_moderation_analytics IS 'Content moderation statistics and NSFW detection metrics';
COMMENT ON FUNCTION get_system_stats IS 'Returns comprehensive system statistics for the specified time period';
COMMENT ON FUNCTION log_user_activity IS 'Logs user activity for analytics and audit purposes';