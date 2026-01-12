-- Add enhanced narrative generation fields to scenes table
-- These fields guide scene narrative generation for better quality

ALTER TABLE scenes 
ADD COLUMN IF NOT EXISTS scene_focus TEXT DEFAULT 'setting'
  CHECK (scene_focus IN ('setting', 'character', 'interaction', 'atmosphere'));

ALTER TABLE scenes 
ADD COLUMN IF NOT EXISTS narrative_style TEXT DEFAULT 'concise'
  CHECK (narrative_style IN ('concise', 'detailed', 'atmospheric'));

ALTER TABLE scenes 
ADD COLUMN IF NOT EXISTS visual_priority TEXT[] DEFAULT ARRAY['setting', 'lighting', 'positioning'];

ALTER TABLE scenes 
ADD COLUMN IF NOT EXISTS perspective_hint TEXT DEFAULT 'third_person'
  CHECK (perspective_hint IN ('third_person', 'pov', 'observer'));

ALTER TABLE scenes 
ADD COLUMN IF NOT EXISTS max_words INTEGER DEFAULT 60
  CHECK (max_words >= 20 AND max_words <= 200);

-- Add comments for documentation
COMMENT ON COLUMN scenes.scene_focus IS 'What aspect to emphasize: setting, character, interaction, or atmosphere';
COMMENT ON COLUMN scenes.narrative_style IS 'Verbosity level: concise (40-60 words), detailed (80-120 words), atmospheric (60-100 words)';
COMMENT ON COLUMN scenes.visual_priority IS 'Array of visual elements to prioritize: lighting, clothing, positioning, setting';
COMMENT ON COLUMN scenes.perspective_hint IS 'Explicitly guides perspective to prevent first-person: third_person, pov, observer';
COMMENT ON COLUMN scenes.max_words IS 'Override default word limit per scene (20-200 words)';
