-- Phase 1 & 2: Fix Auth RLS Performance and Consolidate Multiple Policies
-- This migration addresses critical performance issues identified by the database linter

-- Fix remaining auth.uid() performance issue in model_test_results
DROP POLICY IF EXISTS "Admin access to model test results" ON model_test_results;
CREATE POLICY "Admin access to model test results" ON model_test_results
  USING (has_role((select auth.uid()), 'admin'::app_role));

-- Consolidate characters table policies
DROP POLICY IF EXISTS "Admins can manage all characters" ON characters;
DROP POLICY IF EXISTS "Users can manage own characters" ON characters;
CREATE POLICY "Characters access policy" ON characters
  USING (
    has_role((select auth.uid()), 'admin'::app_role) OR 
    (select auth.uid()) = user_id
  );

-- Consolidate jobs table policies  
DROP POLICY IF EXISTS "Admins can manage all jobs" ON jobs;
DROP POLICY IF EXISTS "Users can view own jobs" ON jobs;
CREATE POLICY "Jobs access policy" ON jobs
  USING (
    has_role((select auth.uid()), 'admin'::app_role) OR 
    (select auth.uid()) = user_id
  );

-- Consolidate projects table policies
DROP POLICY IF EXISTS "Admins can manage all projects" ON projects;
DROP POLICY IF EXISTS "Users can manage own projects" ON projects;
CREATE POLICY "Projects access policy" ON projects
  USING (
    has_role((select auth.uid()), 'admin'::app_role) OR 
    (select auth.uid()) = user_id
  );

-- Consolidate scenes table policies
DROP POLICY IF EXISTS "Admins can manage all scenes" ON scenes;
DROP POLICY IF EXISTS "Users can manage own scenes" ON scenes;
CREATE POLICY "Scenes access policy" ON scenes
  USING (
    has_role((select auth.uid()), 'admin'::app_role) OR 
    (select auth.uid()) = (SELECT projects.user_id FROM projects WHERE projects.id = scenes.project_id)
  );

-- Consolidate videos table policies
DROP POLICY IF EXISTS "Admins can manage all videos" ON videos;
DROP POLICY IF EXISTS "Users can view own videos" ON videos;
CREATE POLICY "Videos access policy" ON videos
  USING (
    has_role((select auth.uid()), 'admin'::app_role) OR 
    (select auth.uid()) = user_id
  );

-- Consolidate usage_logs table policies
DROP POLICY IF EXISTS "Admins can view all usage" ON usage_logs;
DROP POLICY IF EXISTS "Users can view own usage" ON usage_logs;
CREATE POLICY "Usage logs access policy" ON usage_logs
  USING (
    has_role((select auth.uid()), 'admin'::app_role) OR 
    (select auth.uid()) = user_id
  );

-- Consolidate profiles table policies (keep testing policy separate for now)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Separate policies for different operations on profiles
CREATE POLICY "Profiles select policy" ON profiles
  FOR SELECT USING (
    has_role((select auth.uid()), 'admin'::app_role) OR 
    (select auth.uid()) = id
  );

CREATE POLICY "Profiles update policy" ON profiles
  FOR UPDATE USING (
    has_role((select auth.uid()), 'admin'::app_role) OR 
    (select auth.uid()) = id
  );

CREATE POLICY "Profiles insert policy" ON profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- Consolidate user_activity_log policies
DROP POLICY IF EXISTS "Admin can manage activity logs" ON user_activity_log;
DROP POLICY IF EXISTS "Admin can view all activity logs" ON user_activity_log;
DROP POLICY IF EXISTS "Users can view their own activity logs" ON user_activity_log;
CREATE POLICY "User activity log access policy" ON user_activity_log
  FOR SELECT USING (
    has_role((select auth.uid()), 'admin'::app_role) OR 
    (select auth.uid()) = user_id
  );
CREATE POLICY "User activity log admin policy" ON user_activity_log
  FOR ALL USING (has_role((select auth.uid()), 'admin'::app_role));

-- Consolidate user_roles policies (keep testing policy separate)
DROP POLICY IF EXISTS "Admins can delete any role" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert any role" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update any role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can delete their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can update their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;

-- Separate policies for different operations on user_roles
CREATE POLICY "User roles select policy" ON user_roles
  FOR SELECT USING (
    has_role((select auth.uid()), 'admin'::app_role) OR 
    (select auth.uid()) = user_id
  );

CREATE POLICY "User roles insert policy" ON user_roles
  FOR INSERT WITH CHECK (
    has_role((select auth.uid()), 'admin'::app_role) OR 
    (select auth.uid()) = user_id
  );

CREATE POLICY "User roles update policy" ON user_roles
  FOR UPDATE USING (
    has_role((select auth.uid()), 'admin'::app_role) OR 
    (select auth.uid()) = user_id
  );

CREATE POLICY "User roles delete policy" ON user_roles
  FOR DELETE USING (
    has_role((select auth.uid()), 'admin'::app_role) OR 
    (select auth.uid()) = user_id
  );

-- Comment for documentation
COMMENT ON SCHEMA public IS 'RLS policies optimized for performance - consolidated multiple permissive policies and fixed auth.uid() evaluation issues';