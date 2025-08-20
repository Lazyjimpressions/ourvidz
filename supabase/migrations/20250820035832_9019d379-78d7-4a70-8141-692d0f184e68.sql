-- Fix character_scenes security vulnerability
-- The current SELECT policy allows public access to ALL scenes of public characters,
-- including NSFW content. This is a serious security issue.

-- Drop the existing vulnerable SELECT policy
DROP POLICY IF EXISTS "Users can view character scenes" ON character_scenes;

-- Create a secure SELECT policy that only allows:
-- 1. Admins to view all scenes
-- 2. Users to view scenes only for characters they own
-- 3. NO public access to scenes, even for public characters
CREATE POLICY "Users can view their own character scenes only" 
ON character_scenes 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  (character_id IN (
    SELECT characters.id 
    FROM characters 
    WHERE characters.user_id = auth.uid()
  ))
);

-- Add a comment explaining the security rationale
COMMENT ON POLICY "Users can view their own character scenes only" ON character_scenes IS 
'Security policy: Prevents public exposure of potentially NSFW scene content. Users can only view scenes for characters they own, regardless of character public status. Admins have full access for moderation purposes.';