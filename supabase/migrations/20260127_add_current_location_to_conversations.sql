-- Migration: Add current_location to conversations table
-- Purpose: Track current scene location to prevent narrative drift and maintain consistency
-- Related: Fix #3 from Coffee Shop Meet audit

-- Add current_location column to conversations table
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS current_location TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN conversations.current_location IS 'Tracks the current location/setting of the conversation for scene narrative grounding. Updated when scenes are generated or location changes in conversation.';

-- Create index for faster location lookups
CREATE INDEX IF NOT EXISTS idx_conversations_current_location ON conversations(current_location) WHERE current_location IS NOT NULL;

-- Backfill current_location from existing scenes (if any)
-- This finds the most recent scene for each conversation and extracts its location
UPDATE conversations c
SET current_location = (
  SELECT
    CASE
      -- Try to extract location from generation_metadata
      WHEN cs.generation_metadata->>'scene_context' IS NOT NULL THEN
        (cs.generation_metadata->'scene_context'->>'setting')
      -- Fallback to extracting from scene_prompt
      WHEN cs.scene_prompt IS NOT NULL THEN
        substring(cs.scene_prompt from 'in (?:the )?([^,.]+)')
      ELSE NULL
    END
  FROM character_scenes cs
  WHERE cs.conversation_id = c.id
    AND cs.image_url IS NOT NULL
  ORDER BY cs.created_at DESC
  LIMIT 1
)
WHERE c.current_location IS NULL
  AND EXISTS (
    SELECT 1 FROM character_scenes cs2
    WHERE cs2.conversation_id = c.id
      AND cs2.image_url IS NOT NULL
  );

-- Add trigger to update current_location when new scenes are generated
CREATE OR REPLACE FUNCTION update_conversation_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if the scene has location information
  IF NEW.generation_metadata IS NOT NULL AND
     NEW.generation_metadata->'scene_context'->>'setting' IS NOT NULL THEN

    UPDATE conversations
    SET
      current_location = NEW.generation_metadata->'scene_context'->>'setting',
      updated_at = NOW()
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on character_scenes table
DROP TRIGGER IF EXISTS trigger_update_conversation_location ON character_scenes;
CREATE TRIGGER trigger_update_conversation_location
  AFTER INSERT OR UPDATE OF generation_metadata
  ON character_scenes
  FOR EACH ROW
  WHEN (NEW.conversation_id IS NOT NULL)
  EXECUTE FUNCTION update_conversation_location();

-- Grant necessary permissions
GRANT SELECT, UPDATE ON conversations TO authenticated;
GRANT SELECT ON character_scenes TO authenticated;
