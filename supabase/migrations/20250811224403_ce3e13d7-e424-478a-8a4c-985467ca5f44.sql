-- Fix characters table RLS policy to prevent data theft
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Characters access policy" ON public.characters;

-- Create separate, more secure policies for different access patterns
-- 1. Admin access policy - admins can see all characters
CREATE POLICY "Admins can manage all characters" ON public.characters
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Owner access policy - users can see their own characters
CREATE POLICY "Users can manage their own characters" ON public.characters
FOR ALL  
USING (auth.uid() = user_id);

-- 3. Public read-only access - only for explicitly public characters with valid owners
CREATE POLICY "Public characters are viewable by everyone" ON public.characters
FOR SELECT
USING (is_public = true AND user_id IS NOT NULL);

-- Fix character_scenes table as well for consistency
DROP POLICY IF EXISTS "Users can view scenes for their characters" ON public.character_scenes;

-- Create more secure character_scenes policies
CREATE POLICY "Users can view scenes for owned characters" ON public.character_scenes
FOR SELECT
USING (
  character_id IN (
    SELECT id FROM characters 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view scenes for public characters" ON public.character_scenes  
FOR SELECT
USING (
  character_id IN (
    SELECT id FROM characters 
    WHERE is_public = true AND user_id IS NOT NULL
  )
);

CREATE POLICY "Users can manage scenes for their characters" ON public.character_scenes
FOR ALL
USING (
  character_id IN (
    SELECT id FROM characters 
    WHERE user_id = auth.uid()
  )
);