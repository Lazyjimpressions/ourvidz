-- Storyboard V2 Schema Updates
-- Migration for enhanced clip orchestration with dynamic model selection
-- Apply via Supabase Dashboard > SQL Editor

-- ============================================================================
-- 1. Create motion_presets table for built-in and user motion references
-- ============================================================================

CREATE TABLE IF NOT EXISTS motion_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL for built-in presets
  name TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds NUMERIC(5,2),
  category TEXT DEFAULT 'general' CHECK (category IN ('breathing', 'turn', 'walk', 'camera', 'expression', 'general')),
  is_builtin BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_motion_presets_category ON motion_presets(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_motion_presets_user ON motion_presets(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_motion_presets_builtin ON motion_presets(is_builtin) WHERE is_builtin = true;

-- RLS policies for motion_presets
ALTER TABLE motion_presets ENABLE ROW LEVEL SECURITY;

-- Users can view all built-in presets
CREATE POLICY "Users can view builtin motion presets"
ON motion_presets FOR SELECT
USING (is_builtin = true AND is_active = true);

-- Users can view their own presets
CREATE POLICY "Users can view own motion presets"
ON motion_presets FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own presets
CREATE POLICY "Users can create own motion presets"
ON motion_presets FOR INSERT
WITH CHECK (user_id = auth.uid() AND is_builtin = false);

-- Users can update their own presets
CREATE POLICY "Users can update own motion presets"
ON motion_presets FOR UPDATE
USING (user_id = auth.uid() AND is_builtin = false);

-- Users can delete their own presets
CREATE POLICY "Users can delete own motion presets"
ON motion_presets FOR DELETE
USING (user_id = auth.uid() AND is_builtin = false);

-- ============================================================================
-- 2. Add new columns to storyboard_clips
-- ============================================================================

-- Clip type determines generation strategy
ALTER TABLE storyboard_clips
ADD COLUMN IF NOT EXISTS clip_type TEXT DEFAULT 'quick'
  CHECK (clip_type IN ('quick', 'extended', 'controlled', 'long', 'keyframed'));

-- Parent clip for extended/chained clips
ALTER TABLE storyboard_clips
ADD COLUMN IF NOT EXISTS parent_clip_id UUID REFERENCES storyboard_clips(id) ON DELETE SET NULL;

-- Motion preset reference for controlled clips
ALTER TABLE storyboard_clips
ADD COLUMN IF NOT EXISTS motion_preset_id UUID REFERENCES motion_presets(id) ON DELETE SET NULL;

-- Dynamic model selection - references api_models table
ALTER TABLE storyboard_clips
ADD COLUMN IF NOT EXISTS resolved_model_id UUID REFERENCES api_models(id) ON DELETE SET NULL;

-- Prompt template used for enhancement
ALTER TABLE storyboard_clips
ADD COLUMN IF NOT EXISTS prompt_template_id UUID REFERENCES prompt_templates(id) ON DELETE SET NULL;

-- Enhanced prompt after AI processing
ALTER TABLE storyboard_clips
ADD COLUMN IF NOT EXISTS enhanced_prompt TEXT;

-- Generation configuration blob for model-specific params
ALTER TABLE storyboard_clips
ADD COLUMN IF NOT EXISTS generation_config JSONB DEFAULT '{}';

-- End frame reference for keyframed clips
ALTER TABLE storyboard_clips
ADD COLUMN IF NOT EXISTS end_frame_url TEXT;

-- Index for parent clip lookups
CREATE INDEX IF NOT EXISTS idx_storyboard_clips_parent ON storyboard_clips(parent_clip_id) WHERE parent_clip_id IS NOT NULL;

-- Index for clip type filtering
CREATE INDEX IF NOT EXISTS idx_storyboard_clips_type ON storyboard_clips(clip_type);

-- ============================================================================
-- 3. Add new columns to storyboard_projects
-- ============================================================================

-- AI-generated story plan (beats, scenes, suggestions)
ALTER TABLE storyboard_projects
ADD COLUMN IF NOT EXISTS ai_story_plan JSONB;

-- Content mode for prompt template selection
ALTER TABLE storyboard_projects
ADD COLUMN IF NOT EXISTS content_mode TEXT DEFAULT 'nsfw' CHECK (content_mode IN ('sfw', 'nsfw'));

-- ============================================================================
-- 4. Add new columns to storyboard_scenes for AI assistance
-- ============================================================================

-- AI-suggested prompts for clips in this scene
ALTER TABLE storyboard_scenes
ADD COLUMN IF NOT EXISTS ai_suggestions JSONB;

-- Scene-level motion style hint
ALTER TABLE storyboard_scenes
ADD COLUMN IF NOT EXISTS motion_style TEXT;

-- ============================================================================
-- 5. Create helper function for clip type to task mapping
-- ============================================================================

CREATE OR REPLACE FUNCTION get_task_for_clip_type(p_clip_type TEXT)
RETURNS TEXT[] AS $$
BEGIN
  RETURN CASE p_clip_type
    WHEN 'quick' THEN ARRAY['i2v']
    WHEN 'extended' THEN ARRAY['extend']
    WHEN 'controlled' THEN ARRAY['multi']
    WHEN 'long' THEN ARRAY['i2v', 'extend']
    WHEN 'keyframed' THEN ARRAY['i2i_multi', 'multi']
    ELSE ARRAY['i2v']
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 6. Update trigger for updated_at on motion_presets
-- ============================================================================

CREATE OR REPLACE FUNCTION update_motion_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS motion_presets_updated_at ON motion_presets;
CREATE TRIGGER motion_presets_updated_at
  BEFORE UPDATE ON motion_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_motion_presets_updated_at();

-- ============================================================================
-- 7. Seed built-in motion presets (placeholder URLs - replace with real assets)
-- ============================================================================

-- Unique constraint for built-in preset names to prevent duplicate seeds
CREATE UNIQUE INDEX IF NOT EXISTS unique_builtin_motion_preset_name
ON motion_presets (name) WHERE is_builtin = true;

INSERT INTO motion_presets (name, description, video_url, category, is_builtin, duration_seconds)
VALUES
  ('Subtle Breathing', 'Gentle breathing motion, chest rising and falling', 'https://placeholder.com/breathing.mp4', 'breathing', true, 3.0),
  ('Slow Turn Left', 'Character slowly turns head to the left', 'https://placeholder.com/turn-left.mp4', 'turn', true, 3.0),
  ('Slow Turn Right', 'Character slowly turns head to the right', 'https://placeholder.com/turn-right.mp4', 'turn', true, 3.0),
  ('Walk Forward', 'Walking motion toward camera', 'https://placeholder.com/walk-forward.mp4', 'walk', true, 4.0),
  ('Walk Away', 'Walking motion away from camera', 'https://placeholder.com/walk-away.mp4', 'walk', true, 4.0),
  ('Camera Orbit', 'Slow camera orbit around subject', 'https://placeholder.com/orbit.mp4', 'camera', true, 5.0),
  ('Handheld Sway', 'Subtle handheld camera movement', 'https://placeholder.com/handheld.mp4', 'camera', true, 3.0),
  ('Zoom In', 'Slow zoom into subject', 'https://placeholder.com/zoom-in.mp4', 'camera', true, 3.0),
  ('Smile', 'Subtle smile appearing on face', 'https://placeholder.com/smile.mp4', 'expression', true, 2.0),
  ('Blink', 'Natural eye blink', 'https://placeholder.com/blink.mp4', 'expression', true, 1.5)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Done! Verify with: SELECT * FROM motion_presets WHERE is_builtin = true;
-- ============================================================================
