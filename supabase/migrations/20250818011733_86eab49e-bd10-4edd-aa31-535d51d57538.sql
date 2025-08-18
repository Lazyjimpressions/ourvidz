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

-- Ensure avatars bucket exists and is public for character images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own avatars" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own avatars" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);