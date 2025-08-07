-- Create character_scenes table for storing generated scene images
CREATE TABLE character_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  scene_prompt TEXT NOT NULL,
  generation_metadata JSONB DEFAULT '{}',
  job_id UUID REFERENCES jobs(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for efficient queries
CREATE INDEX idx_character_scenes_character_id ON character_scenes(character_id);
CREATE INDEX idx_character_scenes_conversation_id ON character_scenes(conversation_id);
CREATE INDEX idx_character_scenes_created_at ON character_scenes(created_at DESC);

-- Enable RLS
ALTER TABLE character_scenes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view scenes for their characters" 
ON character_scenes FOR SELECT 
USING (
  character_id IN (
    SELECT id FROM characters 
    WHERE user_id = auth.uid() OR is_public = true
  )
);

CREATE POLICY "Users can create scenes for their characters" 
ON character_scenes FOR INSERT 
WITH CHECK (
  character_id IN (
    SELECT id FROM characters 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their character scenes" 
ON character_scenes FOR UPDATE 
USING (
  character_id IN (
    SELECT id FROM characters 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their character scenes" 
ON character_scenes FOR DELETE 
USING (
  character_id IN (
    SELECT id FROM characters 
    WHERE user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_character_scenes_updated_at
  BEFORE UPDATE ON character_scenes
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();