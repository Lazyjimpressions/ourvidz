-- Fix function search path mutable security warnings
-- SECURITY DEFINER functions need explicit search_path to prevent privilege escalation attacks
-- Reference: CVE-2007-2138 and PostgreSQL security best practices

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, token_balance, subscription_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    100,
    'inactive'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'basic_user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Fix has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Fix get_user_role_priority function
CREATE OR REPLACE FUNCTION public.get_user_role_priority(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  role_priority INTEGER := 0;
BEGIN
  SELECT CASE role
    WHEN 'admin' THEN 100
    WHEN 'moderator' THEN 80
    WHEN 'premium_user' THEN 60
    WHEN 'basic_user' THEN 40
    WHEN 'guest' THEN 20
    ELSE 0
  END INTO role_priority
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'admin' THEN 100
    WHEN 'moderator' THEN 80
    WHEN 'premium_user' THEN 60
    WHEN 'basic_user' THEN 40
    WHEN 'guest' THEN 20
    ELSE 0
  END DESC
  LIMIT 1;
  
  RETURN COALESCE(role_priority, 0);
END;
$$;

-- Fix audit_profile_access function
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

-- Fix validate_profile_security function
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