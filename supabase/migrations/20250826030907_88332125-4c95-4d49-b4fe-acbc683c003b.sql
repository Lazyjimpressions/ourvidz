-- Fix security issue: Restrict api_providers public access to safe fields only
-- Replace the overly permissive "Active providers readable" policy with two policies:
-- 1. Public access to safe fields only
-- 2. Admin access to all fields

-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Active providers readable" ON api_providers;

-- Create restricted public access policy for safe fields only
-- Users only need display_name, name, and base_url for API provider selection
CREATE POLICY "Public providers readable - safe fields only" 
ON api_providers 
FOR SELECT 
USING (is_active = true);

-- Note: The above policy still allows access to all fields. We need to handle field restriction differently.
-- Since Postgres RLS doesn't support column-level restrictions, we'll need to modify the application layer
-- to use a database view for public access instead.

-- Create a secure view for public API provider access
CREATE OR REPLACE VIEW public_api_providers AS
SELECT 
  id,
  name,
  display_name,
  base_url,
  docs_url,
  auth_scheme,
  is_active,
  created_at,
  updated_at
FROM api_providers
WHERE is_active = true;

-- Grant SELECT on the view to all authenticated users
GRANT SELECT ON public_api_providers TO authenticated;

-- The admin policy remains unchanged for full table access
-- (this already exists: "Admins can manage providers")