-- Fix remaining function search path mutable security warnings
-- Continue fixing SECURITY DEFINER functions by setting explicit search_path

-- Fix cleanup_old_profile_audit_logs function
CREATE OR REPLACE FUNCTION public.cleanup_old_profile_audit_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete profile audit logs older than 1 year
  DELETE FROM user_activity_log 
  WHERE resource_type = 'profile' 
    AND created_at < NOW() - INTERVAL '1 year';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Fix get_safe_profile_view function
CREATE OR REPLACE FUNCTION public.get_safe_profile_view(profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_data jsonb;
  requesting_user uuid;
  is_admin boolean;
BEGIN
  requesting_user := auth.uid();
  is_admin := has_role(requesting_user, 'admin'::app_role);
  
  -- Get the profile data
  SELECT to_jsonb(profiles.*) INTO profile_data
  FROM profiles 
  WHERE id = profile_id;
  
  IF profile_data IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- If not the profile owner and not admin, return sanitized version
  IF requesting_user != profile_id AND NOT is_admin THEN
    profile_data := profile_data - 'birth_date' - 'age_verification_date' - 'token_balance' - 'subscription_status';
  END IF;
  
  RETURN profile_data;
END;
$$;

-- Fix verify_user_age function
CREATE OR REPLACE FUNCTION public.verify_user_age(user_birth_date date)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user is at least 18 years old
  IF user_birth_date IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN (CURRENT_DATE - user_birth_date) >= INTERVAL '18 years';
END;
$$;

-- Fix update_age_verification function
CREATE OR REPLACE FUNCTION public.update_age_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Auto-verify age when birth date is provided
  IF NEW.birth_date IS NOT NULL AND OLD.birth_date IS DISTINCT FROM NEW.birth_date THEN
    IF verify_user_age(NEW.birth_date) THEN
      NEW.age_verified = true;
      NEW.age_verification_date = NOW();
    ELSE
      NEW.age_verified = false;
      NEW.age_verification_date = NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix create_workspace_session function
CREATE OR REPLACE FUNCTION public.create_workspace_session(p_user_id uuid, p_session_name text DEFAULT 'Workspace Session'::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  session_id UUID;
BEGIN
  -- Deactivate any existing active sessions for this user
  UPDATE public.workspace_sessions 
  SET is_active = false 
  WHERE user_id = p_user_id AND is_active = true;
  
  -- Create new session
  INSERT INTO public.workspace_sessions (user_id, session_name)
  VALUES (p_user_id, p_session_name)
  RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$$;

-- Fix clean_orphaned_jobs function
CREATE OR REPLACE FUNCTION public.clean_orphaned_jobs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Fix cleanup_expired_workspace_assets function
CREATE OR REPLACE FUNCTION public.cleanup_expired_workspace_assets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete expired workspace assets
  DELETE FROM workspace_assets 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Fix get_system_stats function
CREATE OR REPLACE FUNCTION public.get_system_stats(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Fix log_user_activity function
CREATE OR REPLACE FUNCTION public.log_user_activity(p_user_id uuid, p_action text, p_resource_type text DEFAULT NULL::text, p_resource_id text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;