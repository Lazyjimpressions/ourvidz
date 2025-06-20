
-- Create user_roles table first
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'premium_user', 'basic_user', 'guest')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles" 
  ON public.user_roles 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Drop existing functions if they exist to ensure clean recreation
DROP FUNCTION IF EXISTS public.has_role(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_user_role_priority(UUID);
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_updated_at();

-- Function to check if user has a specific role (SECURED)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

-- Create user profiles table to store additional user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  subscription_status TEXT DEFAULT 'inactive',
  token_balance INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing constraint if it exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

-- Update existing data to match TypeScript interface values
UPDATE public.profiles 
SET subscription_status = CASE 
  WHEN subscription_status = 'free' THEN 'inactive'
  WHEN subscription_status = 'basic' THEN 'starter'
  WHEN subscription_status = 'premium' THEN 'pro'
  ELSE subscription_status
END
WHERE subscription_status IN ('free', 'basic', 'premium');

-- Add new constraint with correct values that match TypeScript interface
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_subscription_status_check 
CHECK (subscription_status IN ('inactive', 'starter', 'pro', 'creator'));

-- Create RLS policies for profiles
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

-- Function to handle new user signup (SECURED)
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

-- Trigger to automatically create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp (SECURED)
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

-- Trigger to update updated_at on profile changes
DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to get user role priority (SECURED)
CREATE OR REPLACE FUNCTION public.get_user_role_priority(_user_id UUID)
RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  role_priority INTEGER := 0;
BEGIN
  SELECT CASE role
    WHEN 'admin' THEN 100
    WHEN 'moderator' THEN 80
    WHEN 'premium_user' THEN 60
    WHEN 'basic_user' THEN 40
    WHEN 'guest' THEN 20
    ELSE 0
  END INTO role_priority
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'admin' THEN 100
    WHEN 'moderator' THEN 80
    WHEN 'premium_user' THEN 60
    WHEN 'basic_user' THEN 40
    WHEN 'guest' THEN 20
    ELSE 0
  END DESC
  LIMIT 1;
  
  RETURN COALESCE(role_priority, 0);
END;
$$;
