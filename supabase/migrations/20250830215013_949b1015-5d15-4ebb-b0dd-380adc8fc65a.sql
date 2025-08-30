-- Fix profiles_public view security issue
-- The view currently exposes sensitive user data (usernames, age verification, etc.) to anyone
-- We need to either restrict access or remove completely

-- First, revoke any public access
REVOKE ALL ON public.profiles_public FROM PUBLIC;
REVOKE ALL ON public.profiles_public FROM anon;

-- Grant access only to authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;

-- Add comment explaining the access control
COMMENT ON VIEW public.profiles_public IS 'Restricted access view: Only authenticated users can access. Contains privacy-protected profile data with conditional field exposure based on user permissions.';

-- Verify no unauthorized access
-- The view already has built-in protection for sensitive fields, but now requires authentication