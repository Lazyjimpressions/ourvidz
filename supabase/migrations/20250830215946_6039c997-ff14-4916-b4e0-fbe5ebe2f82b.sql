-- Fix profiles table RLS policy security issue
-- Current policy allows any authenticated user to view other users' profiles
-- This exposes sensitive data like birth dates, token balances, subscription status

-- Drop the problematic policy
DROP POLICY IF EXISTS "Enhanced profiles select policy" ON public.profiles;

-- Create a secure policy that only allows:
-- 1. Users to view their own profiles
-- 2. Admins to view all profiles
CREATE POLICY "Secure profiles select policy" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = id) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Keep the existing update policy as it's already secure
-- "Enhanced profiles update policy" already restricts to owner/admin only

-- Add comment explaining the security fix
COMMENT ON POLICY "Secure profiles select policy" ON public.profiles IS 
'Restricts profile viewing to profile owners and administrators only. Prevents unauthorized access to sensitive user data like birth dates, token balances, and subscription status.';