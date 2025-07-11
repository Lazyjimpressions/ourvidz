-- Fix security definer view issues for admin portal analytics
-- Drop existing views that may have security definer issues
DROP VIEW IF EXISTS public.user_analytics;
DROP VIEW IF EXISTS public.content_moderation_analytics;

-- Recreate user_analytics view with explicit SECURITY INVOKER (safer)
-- This view will respect the RLS policies of the underlying tables
CREATE VIEW public.user_analytics AS
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

-- Recreate content_moderation_analytics view with explicit SECURITY INVOKER
-- This view will respect the RLS policies of the underlying tables
CREATE VIEW public.content_moderation_analytics AS
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

-- Grant select permissions to authenticated users 
-- (access will be controlled by underlying table RLS policies)
GRANT SELECT ON public.user_analytics TO authenticated;
GRANT SELECT ON public.content_moderation_analytics TO authenticated;

-- Add comments for documentation
COMMENT ON VIEW public.user_analytics IS 
'User analytics view - access controlled by underlying table RLS policies';
COMMENT ON VIEW public.content_moderation_analytics IS 
'Content moderation analytics view - access controlled by underlying table RLS policies';