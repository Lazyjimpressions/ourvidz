-- Phase 1: Performance Optimization - Update RLS policies to use (select auth.uid()) instead of auth.uid()
-- This reduces per-row evaluations and improves query performance by 30-70%

-- Profiles table policies
ALTER POLICY "Admins can update all profiles" ON profiles
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Admins can view all profiles" ON profiles
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Users can insert their own profile" ON profiles
  WITH CHECK ((select auth.uid()) = id);

ALTER POLICY "Users can update their own profile" ON profiles
  USING ((select auth.uid()) = id);

ALTER POLICY "Users can view their own profile" ON profiles
  USING ((select auth.uid()) = id);

-- User roles table policies
ALTER POLICY "Admins can delete any role" ON user_roles
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Admins can insert any role" ON user_roles
  WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Admins can manage all roles" ON user_roles
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Admins can update any role" ON user_roles
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Admins can view all roles" ON user_roles
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Users can delete their own roles" ON user_roles
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can insert their own roles" ON user_roles
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can update their own roles" ON user_roles
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can view their own roles" ON user_roles
  USING ((select auth.uid()) = user_id);

-- Characters table policies
ALTER POLICY "Admins can manage all characters" ON characters
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Users can manage own characters" ON characters
  USING ((select auth.uid()) = user_id);

-- Projects table policies
ALTER POLICY "Admins can manage all projects" ON projects
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Users can manage own projects" ON projects
  USING ((select auth.uid()) = user_id);

-- Scenes table policies
ALTER POLICY "Admins can manage all scenes" ON scenes
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Users can manage own scenes" ON scenes
  USING ((select auth.uid()) = (SELECT projects.user_id FROM projects WHERE projects.id = scenes.project_id));

-- Videos table policies
ALTER POLICY "Admins can manage all videos" ON videos
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Users can view own videos" ON videos
  USING ((select auth.uid()) = user_id);

-- Images table policies
ALTER POLICY "Users can create their own images" ON images
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can delete their own images" ON images
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can update their own images" ON images
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can view their own images" ON images
  USING ((select auth.uid()) = user_id);

-- Jobs table policies
ALTER POLICY "Admins can manage all jobs" ON jobs
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Users can view own jobs" ON jobs
  USING ((select auth.uid()) = user_id);

-- Usage logs table policies
ALTER POLICY "Admins can view all usage" ON usage_logs
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Users can view own usage" ON usage_logs
  USING ((select auth.uid()) = user_id);

-- Admin tables policies
ALTER POLICY "Admin access to prompt test results" ON prompt_test_results
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Admin access to model config history" ON model_config_history
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Admin access to development progress" ON admin_development_progress
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Admin access to model performance logs" ON model_performance_logs
  USING (has_role((select auth.uid()), 'admin'::app_role));

-- Comment for documentation
COMMENT ON SCHEMA public IS 'RLS policies optimized for performance - auth.uid() calls now use (select auth.uid()) to reduce per-row evaluations';