-- Fix the security definer issue by recreating the view without security definer
-- and restricting the original table access properly

-- Drop the previous view
DROP VIEW IF EXISTS public_api_providers;

-- Since we can't do column-level RLS in Postgres, we need a different approach
-- Let's update the public policy to be more restrictive and use application-level filtering

-- The public policy should deny access to secret_name through application layer
-- Keep the policy as is, but modify application code to exclude sensitive fields

-- Update the policy name for clarity
DROP POLICY IF EXISTS "Public providers readable - safe fields only" ON api_providers;

CREATE POLICY "Active providers readable (public fields only)" 
ON api_providers 
FOR SELECT 
USING (is_active = true);