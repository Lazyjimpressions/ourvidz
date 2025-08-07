-- Add roleplay-specific columns to existing characters table
ALTER TABLE characters ADD COLUMN IF NOT EXISTS persona TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS system_prompt TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS voice_tone VARCHAR(50);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS mood VARCHAR(50);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES profiles(id);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS interaction_count INTEGER DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS reference_image_url TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Add roleplay conversation tracking
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id);

-- Insert roleplay-specific prompt templates
INSERT INTO prompt_templates (
  template_name,
  use_case,
  enhancer_model,
  target_model,
  content_mode,
  system_prompt,
  description,
  metadata
) VALUES 
(
  'Character Roleplay - Default',
  'character_roleplay',
  'qwen_instruct',
  'qwen_instruct',
  'nsfw',
  'You are {{character_name}}, a character with the following traits and personality:

{{character_description}}

Personality: {{character_personality}}
Background: {{character_background}}
Speaking Style: {{character_speaking_style}}
Goals: {{character_goals}}
Quirks: {{character_quirks}}
Relationships: {{character_relationships}}

Additional Character Context:
{{character_persona}}

Voice Tone: {{voice_tone}}
Current Mood: {{mood}}

Stay in character at all times. Respond as {{character_name}} would, using their speaking style, personality traits, and background. Be consistent with their goals, quirks, and relationships. The conversation should feel natural and authentic to this character.',
  'Default roleplay template for character conversations',
  '{"supports_variables": true, "character_context": true, "roleplay_mode": true}'
),
(
  'Scene Generation - Character Context',
  'scene_generation', 
  'qwen_instruct',
  'sdxl',
  'nsfw',
  'Generate a detailed visual description for an image that captures the current scene in a roleplay conversation involving {{character_name}}.

Character Details:
- Name: {{character_name}}
- Visual Description: {{character_visual_description}}
- Current Mood: {{mood}}
- Setting Context: {{scene_context}}

Create a vivid, detailed prompt that describes the scene, including:
- The character''s appearance and current expression
- The environment and setting
- The mood and atmosphere
- Any relevant objects or details mentioned in the conversation

Focus on creating an immersive visual that matches the roleplay context and character personality.',
  'Template for generating scene images during roleplay conversations',
  '{"supports_variables": true, "character_context": true, "scene_mode": true}'
)