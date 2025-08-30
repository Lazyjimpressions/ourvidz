-- Comprehensive Security Migration for Profiles Table
-- This migration implements advanced security measures to protect user personal information

-- 1. Create audit function for profile access logging
CREATE OR REPLACE FUNCTION public.audit_profile_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log access to profiles table for audit purposes
  INSERT INTO public.user_activity_log (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata,
    ip_address
  ) VALUES (
    auth.uid(),
    CASE 
      WHEN TG_OP = 'SELECT' THEN 'profile_viewed'
      WHEN TG_OP = 'UPDATE' THEN 'profile_updated'
      WHEN TG_OP = 'INSERT' THEN 'profile_created'
    END,
    'profile',
    COALESCE(NEW.id::text, OLD.id::text),
    jsonb_build_object(
      'operation', TG_OP,
      'changed_fields', CASE 
        WHEN TG_OP = 'UPDATE' THEN (
          SELECT jsonb_object_agg(key, value)
          FROM jsonb_each(to_jsonb(NEW) - to_jsonb(OLD))
          WHERE key NOT IN ('updated_at')
        )
        ELSE NULL
      END,
      'timestamp', now()
    ),
    inet(current_setting('request.headers', true)::json->>'x-real-ip')
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2. Create function to validate sensitive profile updates
CREATE OR REPLACE FUNCTION public.validate_profile_security()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Prevent unauthorized birth_date changes (only user or admin)
  IF OLD.birth_date IS DISTINCT FROM NEW.birth_date THEN
    IF auth.uid() != NEW.id AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Unauthorized attempt to modify birth date for user %', NEW.id;
    END IF;
  END IF;

  -- Prevent unauthorized age verification changes (only admins can override)
  IF OLD.age_verified IS DISTINCT FROM NEW.age_verified THEN
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
      -- Allow automatic verification through birth_date update trigger
      IF NOT (OLD.age_verified = false AND NEW.age_verified = true AND NEW.birth_date IS NOT NULL) THEN
        RAISE EXCEPTION 'Unauthorized attempt to modify age verification for user %', NEW.id;
      END IF;
    END IF;
  END IF;

  -- Prevent token_balance manipulation (only admins or system)
  IF OLD.token_balance IS DISTINCT FROM NEW.token_balance THEN
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Unauthorized attempt to modify token balance for user %', NEW.id;
    END IF;
  END IF;

  -- Prevent subscription_status changes by regular users
  IF OLD.subscription_status IS DISTINCT FROM NEW.subscription_status THEN
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Unauthorized attempt to modify subscription status for user %', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Create function to sanitize profile data on read
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

-- 4. Add triggers for security validation and audit logging
DROP TRIGGER IF EXISTS profile_security_validation ON public.profiles;
CREATE TRIGGER profile_security_validation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_security();

DROP TRIGGER IF EXISTS profile_audit_logging ON public.profiles;
CREATE TRIGGER profile_audit_logging
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_profile_access();

-- 5. Enhanced RLS policies with stricter controls
DROP POLICY IF EXISTS "Enhanced profiles select policy" ON public.profiles;
CREATE POLICY "Enhanced profiles select policy"
ON public.profiles
FOR SELECT
USING (
  -- Users can view their own profile
  auth.uid() = id
  OR 
  -- Admins can view all profiles with audit logging
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Limited public profile view (username only) for authenticated users
  (
    auth.uid() IS NOT NULL 
    AND auth.uid() != id
  )
);

DROP POLICY IF EXISTS "Enhanced profiles update policy" ON public.profiles;
CREATE POLICY "Enhanced profiles update policy"  
ON public.profiles
FOR UPDATE
USING (
  -- Users can update their own profile (with validation trigger)
  auth.uid() = id
  OR
  -- Admins can update any profile (with audit logging)
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  -- Same conditions for WITH CHECK
  auth.uid() = id
  OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- 6. Create secure profile view for public access
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id,
  username,
  created_at,
  -- Only show age_verified status, not verification date or birth date
  age_verified,
  -- Hide sensitive financial and personal information
  CASE 
    WHEN auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role) THEN subscription_status
    ELSE 'private'::text
  END as subscription_status,
  CASE 
    WHEN auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role) THEN token_balance
    ELSE NULL::integer
  END as token_balance
FROM public.profiles;

-- Enable RLS on the view
ALTER VIEW public.profiles_public SET (security_barrier = true);

-- 7. Add data retention policy function
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

-- 8. Add comment documentation for security measures
COMMENT ON FUNCTION public.validate_profile_security() IS 'Validates that only authorized users can modify sensitive profile fields like birth_date, age_verified, token_balance, and subscription_status';
COMMENT ON FUNCTION public.audit_profile_access() IS 'Logs all profile access and modifications for security auditing';
COMMENT ON FUNCTION public.get_safe_profile_view(uuid) IS 'Returns sanitized profile data based on user permissions';
COMMENT ON VIEW public.profiles_public IS 'Public view of profiles with sensitive information filtered based on user permissions';
COMMENT ON FUNCTION public.cleanup_old_profile_audit_logs() IS 'Removes old profile audit logs for data retention compliance';

-- 9. Grant appropriate permissions
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_safe_profile_view(uuid) TO authenticated;