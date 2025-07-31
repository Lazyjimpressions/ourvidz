-- Create a valid user activity log entry using a real user_id
-- Let's first check if there are any users in the profiles table and use one of them

-- Get the first admin user's ID for the log
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Try to find an admin user
  SELECT user_id INTO admin_user_id 
  FROM user_roles 
  WHERE role = 'admin' 
  LIMIT 1;
  
  -- If no admin found, try to find any user
  IF admin_user_id IS NULL THEN
    SELECT id INTO admin_user_id 
    FROM profiles 
    LIMIT 1;
  END IF;
  
  -- If we found a valid user, log the cache refresh
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO user_activity_log (user_id, action, metadata)
    VALUES (
      admin_user_id,
      'system_cache_refresh',
      jsonb_build_object(
        'reason', 'fix_worker_selection_cache_structure',
        'timestamp', now(),
        'source', 'system_maintenance',
        'improvement', 'simplified_prompt_management',
        'details', 'Cache refresh to fix enhancement worker routing'
      )
    );
  END IF;
END $$;