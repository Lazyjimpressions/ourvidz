-- Tighten user_roles RLS to prevent self-escalation and ensure only verified admins can manage roles
-- 1) Drop existing permissive policies
DROP POLICY IF EXISTS "User roles insert policy" ON public.user_roles;
DROP POLICY IF EXISTS "User roles update policy" ON public.user_roles;
DROP POLICY IF EXISTS "User roles delete policy" ON public.user_roles;
DROP POLICY IF EXISTS "User roles select policy" ON public.user_roles;

-- 2) Recreate secure policies
-- Only verified admins (in user_roles with role='admin') can INSERT new roles
CREATE POLICY "User roles insert policy"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only verified admins can UPDATE roles
CREATE POLICY "User roles update policy"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only verified admins can DELETE roles
CREATE POLICY "User roles delete policy"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can read all roles; users can read their own
CREATE POLICY "User roles select policy"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = user_id);
