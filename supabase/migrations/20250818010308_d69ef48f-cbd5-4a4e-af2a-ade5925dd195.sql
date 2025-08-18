-- Update RLS policies for character_scenes to allow public scenes and admin override

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view scenes for public characters" ON character_scenes;
DROP POLICY IF EXISTS "Users can view scenes for owned characters" ON character_scenes;
DROP POLICY IF EXISTS "Users can create scenes for their characters" ON character_scenes;
DROP POLICY IF EXISTS "Users can update their character scenes" ON character_scenes;
DROP POLICY IF EXISTS "Users can delete their character scenes" ON character_scenes;
DROP POLICY IF EXISTS "Users can manage scenes for their characters" ON character_scenes;

-- Create new policies with admin override and relaxed public access

-- SELECT: Allow viewing scenes for owned characters, public characters (even with NULL user_id), or admin override
CREATE POLICY "Users can view character scenes" 
ON character_scenes 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  character_id IN (
    SELECT characters.id 
    FROM characters 
    WHERE (
      characters.user_id = auth.uid() OR 
      characters.is_public = true
    )
  )
);

-- INSERT: Allow creating scenes for owned characters or admin override
CREATE POLICY "Users can create character scenes" 
ON character_scenes 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  character_id IN (
    SELECT characters.id
    FROM characters
    WHERE characters.user_id = auth.uid()
  )
);

-- UPDATE: Allow updating scenes for owned characters or admin override
CREATE POLICY "Users can update character scenes" 
ON character_scenes 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  character_id IN (
    SELECT characters.id
    FROM characters
    WHERE characters.user_id = auth.uid()
  )
);

-- DELETE: Allow deleting scenes for owned characters or admin override
CREATE POLICY "Users can delete character scenes" 
ON character_scenes 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  character_id IN (
    SELECT characters.id
    FROM characters
    WHERE characters.user_id = auth.uid()
  )
);