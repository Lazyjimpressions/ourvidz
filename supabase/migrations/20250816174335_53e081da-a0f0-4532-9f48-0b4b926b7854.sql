
-- 1) Drop legacy functions that reference images/videos/workspace_items
DROP FUNCTION IF EXISTS public.get_video_path_stats() CASCADE;
DROP FUNCTION IF EXISTS public.validate_video_path_consistency() CASCADE;
DROP FUNCTION IF EXISTS public.validate_completed_video_urls() CASCADE;
DROP FUNCTION IF EXISTS public.validate_video_expires_at() CASCADE;
DROP FUNCTION IF EXISTS public.validate_images_moderation_status() CASCADE;
DROP FUNCTION IF EXISTS public.save_workspace_item_to_library(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.link_workspace_items_to_jobs() CASCADE;
DROP FUNCTION IF EXISTS public.clear_workspace_session(uuid, uuid) CASCADE;

-- 2) Drop legacy tables (no migration by design)
DROP TABLE IF EXISTS public.images CASCADE;
DROP TABLE IF EXISTS public.videos CASCADE;

-- 3) Archive workspace_items: admin-read-only
-- Remove user-managed policy, keep table for reference
DROP POLICY IF EXISTS "Users can manage their own workspace items" ON public.workspace_items;

-- Ensure RLS is enabled (it already is, but ensure)
ALTER TABLE public.workspace_items ENABLE ROW LEVEL SECURITY;

-- Allow only admins to SELECT (no insert/update/delete policies => writes are blocked)
CREATE POLICY "Admin can view workspace items"
  ON public.workspace_items
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4) Improve orphaned jobs cleanup to reflect workspace_assets
CREATE OR REPLACE FUNCTION public.clean_orphaned_jobs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete completed jobs with no associated workspace assets (older than 24 hours)
  DELETE FROM jobs j
  WHERE j.status = 'completed'
    AND j.created_at < NOW() - INTERVAL '24 hours'
    AND NOT EXISTS (
      SELECT 1
      FROM workspace_assets wa
      WHERE wa.job_id = j.id
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Log the cleanup
  INSERT INTO user_activity_log (action, metadata, user_id)
  VALUES (
    'system_cleanup_orphaned_jobs',
    jsonb_build_object('deleted_count', deleted_count, 'timestamp', NOW(), 'source', 'workspace_assets'),
    '00000000-0000-0000-0000-000000000000'::uuid
  );

  RETURN deleted_count;
END;
$function$;

-- 5) Replace system stats to avoid references to images/videos
CREATE OR REPLACE FUNCTION public.get_system_stats(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

        -- Asset rollups from workspace_assets
        'total_assets', (SELECT COUNT(*) FROM workspace_assets WHERE created_at > start_date),
        'total_images', (SELECT COUNT(*) FROM workspace_assets WHERE created_at > start_date AND asset_type ILIKE 'image%'),
        'total_videos', (SELECT COUNT(*) FROM workspace_assets WHERE created_at > start_date AND asset_type ILIKE 'video%'),

        -- Storage usage (bytes) - both staging and library views
        'storage_used_workspace', (SELECT COALESCE(SUM(file_size_bytes), 0) FROM workspace_assets WHERE created_at > start_date),
        'storage_used_library', (SELECT COALESCE(SUM(file_size_bytes), 0) FROM user_library WHERE created_at > start_date),

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
$function$;

-- 6) Helpful performance index for asset lookups by job
CREATE INDEX IF NOT EXISTS idx_workspace_assets_job_id ON public.workspace_assets(job_id);
