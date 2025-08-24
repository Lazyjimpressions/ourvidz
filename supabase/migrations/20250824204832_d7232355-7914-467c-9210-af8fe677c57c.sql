-- Update RLS policies for characters table to restrict NSFW content
-- Drop existing policies first
DROP POLICY IF EXISTS "Public characters are viewable by everyone" ON public.characters;
DROP POLICY IF EXISTS "Users can manage their own characters" ON public.characters;
DROP POLICY IF EXISTS "Admins can manage all characters" ON public.characters;

-- Create new restrictive policies
-- SFW content is publicly viewable
CREATE POLICY "SFW characters are viewable by everyone" 
ON public.characters 
FOR SELECT 
USING (is_public = true AND content_rating = 'sfw');

-- NSFW content requires authentication and age verification
CREATE POLICY "NSFW characters require age verification" 
ON public.characters 
FOR SELECT 
USING (
  is_public = true 
  AND content_rating = 'nsfw' 
  AND auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND age_verified = true
  )
);

-- Users can manage their own characters
CREATE POLICY "Users can manage their own characters" 
ON public.characters 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all characters
CREATE POLICY "Admins can manage all characters" 
ON public.characters 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create function to handle age verification
CREATE OR REPLACE FUNCTION public.verify_user_age(user_birth_date date)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is at least 18 years old
  IF user_birth_date IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN (CURRENT_DATE - user_birth_date) >= INTERVAL '18 years';
END;
$$;

-- Update profiles table to support age verification
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS age_verification_date timestamptz;

-- Create function to update age verification status
CREATE OR REPLACE FUNCTION public.update_age_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-verify age when birth date is provided
  IF NEW.birth_date IS NOT NULL AND OLD.birth_date IS DISTINCT FROM NEW.birth_date THEN
    IF verify_user_age(NEW.birth_date) THEN
      NEW.age_verified = true;
      NEW.age_verification_date = NOW();
    ELSE
      NEW.age_verified = false;
      NEW.age_verification_date = NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic age verification
DROP TRIGGER IF EXISTS update_age_verification_trigger ON public.profiles;
CREATE TRIGGER update_age_verification_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_age_verification();