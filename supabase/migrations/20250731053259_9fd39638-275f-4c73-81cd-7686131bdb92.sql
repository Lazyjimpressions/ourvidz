-- Update RLS policy to allow access to system default characters (user_id IS NULL)
DROP POLICY IF EXISTS "Characters access policy" ON characters;

CREATE POLICY "Characters access policy" 
ON characters 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR auth.uid() = user_id 
  OR user_id IS NULL  -- Allow access to system default characters
);