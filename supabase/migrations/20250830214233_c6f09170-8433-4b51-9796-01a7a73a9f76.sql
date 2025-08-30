-- Fix Security Definer View issue
-- Drop and recreate profiles_public view without SECURITY DEFINER

-- Drop the existing profiles_public view
DROP VIEW IF EXISTS public.profiles_public;

-- Recreate the view without SECURITY DEFINER
-- This view will now respect RLS policies and user permissions
CREATE VIEW public.profiles_public AS
SELECT 
    id,
    username,
    created_at,
    age_verified,
    -- Only show sensitive data to profile owner or admin
    CASE
        WHEN (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role)) THEN subscription_status
        ELSE 'private'::text
    END AS subscription_status,
    CASE
        WHEN (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role)) THEN token_balance
        ELSE NULL::integer
    END AS token_balance
FROM profiles;

-- Grant appropriate permissions
GRANT SELECT ON public.profiles_public TO authenticated;

-- Add comment explaining the security model
COMMENT ON VIEW public.profiles_public IS 'Public view of profiles with conditional data exposure based on user permissions. Uses RLS policies instead of SECURITY DEFINER for better security.';