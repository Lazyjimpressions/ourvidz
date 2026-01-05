-- Add scene_name and scene_description columns to character_scenes table
ALTER TABLE character_scenes 
ADD COLUMN IF NOT EXISTS scene_name TEXT,
ADD COLUMN IF NOT EXISTS scene_description TEXT;

-- Add comment explaining these fields
COMMENT ON COLUMN character_scenes.scene_name IS 'User-friendly name for the scene/scenario';
COMMENT ON COLUMN character_scenes.scene_description IS 'Optional description providing context for the scene';

