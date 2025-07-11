-- Final Phase: Fix Remaining Multiple Permissive Policy Warnings
-- This migration eliminates the last 6 multiple permissive policy warnings

-- Phase 1: Remove Testing Policies (these are development artifacts)
DROP POLICY IF EXISTS "Testing: Anon can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Testing: Anon can read all user roles" ON user_roles;

-- Phase 2: Consolidate user_activity_log overlapping policies
DROP POLICY IF EXISTS "User activity log access policy" ON user_activity_log;
DROP POLICY IF EXISTS "User activity log admin policy" ON user_activity_log;

-- Create single consolidated policy for user_activity_log SELECT operations
CREATE POLICY "User activity log select policy" ON user_activity_log
  FOR SELECT USING (
    has_role((select auth.uid()), 'admin'::app_role) OR 
    (select auth.uid()) = user_id
  );

-- Create separate admin-only policy for INSERT/UPDATE/DELETE operations on user_activity_log
CREATE POLICY "User activity log admin operations" ON user_activity_log
  FOR INSERT WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

CREATE POLICY "User activity log admin updates" ON user_activity_log
  FOR UPDATE USING (has_role((select auth.uid()), 'admin'::app_role));

CREATE POLICY "User activity log admin deletes" ON user_activity_log
  FOR DELETE USING (has_role((select auth.uid()), 'admin'::app_role));

-- Add comment for documentation
COMMENT ON TABLE user_activity_log IS 'RLS policies fully optimized - eliminated all multiple permissive policy warnings';