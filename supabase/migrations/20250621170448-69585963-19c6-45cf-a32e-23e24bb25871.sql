
-- Fix Anonymous Role Policies and Clean Up Issues (Updated)

-- First, drop policies that depend on is_admin function
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Now drop the problematic is_admin function
DROP FUNCTION IF EXISTS public.is_admin(UUID);

-- Clean up any existing policies that might be blocking anon access
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Recreate proper RLS policies for user_roles
CREATE POLICY "Users can view their own roles" 
  ON public.user_roles 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "System can read roles for authenticated users" 
  ON public.user_roles 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Recreate proper RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Add anon read access for system functionality (limited to schema info)
CREATE POLICY "Allow anon to read table structure" 
  ON public.profiles 
  FOR SELECT 
  TO anon 
  USING (false);

CREATE POLICY "Allow anon to read roles structure" 
  ON public.user_roles 
  FOR SELECT 
  TO anon 
  USING (false);

-- Ensure the trigger for automatic profile creation exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, token_balance, subscription_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    100,
    'inactive'
  );
  RETURN NEW;
END;
$$;

-- Recreate the trigger for user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure the updated_at trigger exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate the trigger for profile updates
DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Clean up the duplicate has_role function (keep only the SQL version)
DROP FUNCTION IF EXISTS public.has_role(UUID, TEXT);

-- Ensure the proper has_role function exists (SQL version for better performance)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN 
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Recreate admin policies using the proper has_role function
CREATE POLICY "Admins can manage all roles" 
  ON public.user_roles 
  FOR ALL 
  TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all roles" 
  ON public.user_roles 
  FOR SELECT 
  TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));
