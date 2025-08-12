-- Step 1: Fix RLS Policy Consistency between images and videos tables
-- Standardize to use consistent auth.uid() pattern for both tables

-- Drop existing videos policies
DROP POLICY IF EXISTS "Videos access policy" ON public.videos;

-- Create consistent policies for videos table (matching images pattern)
CREATE POLICY "Users can view their own videos" 
ON public.videos 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own videos" 
ON public.videos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos" 
ON public.videos 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos" 
ON public.videos 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add admin access for both tables
CREATE POLICY "Admins can manage all images" 
ON public.images 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all videos" 
ON public.videos 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));