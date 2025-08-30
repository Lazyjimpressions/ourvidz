-- Fix security issue: Remove profiles_public view entirely
-- This view exposes sensitive user data (usernames, age verification, user IDs) 
-- to all authenticated users and is not used by the application

-- Analysis shows profiles_public is only referenced in auto-generated types
-- but not actually used by any application code, so it's safe to remove

DROP VIEW IF EXISTS public.profiles_public;

-- Add comment explaining the security decision
COMMENT ON TABLE public.profiles IS 'Main profiles table with proper RLS policies. The profiles_public view was removed for security reasons as it exposed sensitive user data to all authenticated users.';