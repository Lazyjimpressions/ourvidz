-- Fix characters RLS policy to allow public characters to be visible regardless of user_id
DROP POLICY IF EXISTS "Public characters are viewable by everyone" ON public.characters;

CREATE POLICY "Public characters are viewable by everyone" 
ON public.characters 
FOR SELECT 
USING (is_public = true);

-- Update characters RLS policy for better admin access
DROP POLICY IF EXISTS "Admins can manage all characters" ON public.characters;
DROP POLICY IF EXISTS "Users can manage their own characters" ON public.characters;

CREATE POLICY "Users can manage their own characters" 
ON public.characters 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all characters" 
ON public.characters 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));