
-- Clean up and fix database setup with testing-friendly anon access

-- 1. Drop all conflicting policies
DROP POLICY IF EXISTS "Allow anon to read table structure" ON public.profiles;
DROP POLICY IF EXISTS "Allow anon to read roles structure" ON public.user_roles;
DROP POLICY IF EXISTS "Allow anon role system access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow anon role system access to user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "System can read roles for authenticated users" ON public.user_roles;

-- 2. Testing-friendly anon policies (TESTING ONLY - remove in production)
CREATE POLICY "Testing: Anon can read all profiles" 
  ON public.profiles 
  FOR SELECT 
  TO anon 
  USING (true);

CREATE POLICY "Testing: Anon can read all user roles" 
  ON public.user_roles 
  FOR SELECT 
  TO anon 
  USING (true);

-- 3. Restore user creation trigger with error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

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
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'basic_user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Proper user-specific policies
CREATE POLICY "Users can insert their own roles" 
  ON public.user_roles 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own roles" 
  ON public.user_roles 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own roles" 
  ON public.user_roles 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- 5. Admin policies for full management
CREATE POLICY "Admins can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert any role" 
  ON public.user_roles 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any role" 
  ON public.user_roles 
  FOR UPDATE 
  TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any role" 
  ON public.user_roles 
  FOR DELETE 
  TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Add unique constraint for role management
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
