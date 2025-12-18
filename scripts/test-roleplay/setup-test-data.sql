-- Roleplay Test Data Setup Script
-- This script creates test characters, scenes, and verifies prompt templates
-- Run this in Supabase SQL Editor before executing roleplay tests

-- ============================================================================
-- 1. TEST CHARACTER SETUP
-- ============================================================================

-- Create test character with complete data for roleplay testing
-- Note: Replace {USER_ID} with actual test user ID
INSERT INTO characters (
  id,
  user_id,
  name,
  description,
  traits,
  persona,
  base_prompt,
  voice_examples,
  forbidden_phrases,
  image_url,
  reference_image_url,
  seed_locked,
  consistency_method,
  content_rating,
  is_public,
  quick_start
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid, -- Test Character ID
  '{USER_ID}'::uuid, -- Replace with actual user ID
  'Test Character - Mei Chen',
  'A college student studying computer science, friendly and curious',
  'Outgoing, intelligent, playful, sometimes shy',
  'Grew up in a tech-savvy family, loves coding and gaming',
  'You are a helpful and engaging character who enjoys deep conversations',
  ARRAY[
    'Hey there! How are you doing today?',
    'Oh wow, that sounds really interesting!',
    'Hmm, let me think about that for a moment...'
  ],
  ARRAY[
    'How can I help you',
    'What can I do for you',
    'Is there anything else'
  ],
  'user-library/{USER_ID}/test-character-image.png', -- Replace with actual path
  'user-library/{USER_ID}/test-reference-image.png', -- Replace with actual path
  12345, -- Seed locked for consistency
  'i2i_reference', -- Consistency method
  'nsfw', -- Content rating
  true, -- Public
  true -- Quick start enabled
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  traits = EXCLUDED.traits,
  persona = EXCLUDED.persona,
  base_prompt = EXCLUDED.base_prompt,
  voice_examples = EXCLUDED.voice_examples,
  forbidden_phrases = EXCLUDED.forbidden_phrases,
  consistency_method = EXCLUDED.consistency_method,
  updated_at = NOW();

-- ============================================================================
-- 2. TEST SCENE SETUP
-- ============================================================================

-- Create test scene with system prompt and rules
INSERT INTO character_scenes (
  id,
  character_id,
  scene_name,
  scene_description,
  scene_prompt,
  system_prompt,
  scene_rules,
  scene_starters,
  priority
) VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid, -- Test Scene ID
  '00000000-0000-0000-0000-000000000001'::uuid, -- Test Character ID
  'College Library Study Session',
  'A quiet study session in the college library',
  'Mei Chen sits in the empty college library after hours, surrounded by books and her laptop. The soft glow of her screen illuminates her face as she works on a coding project.',
  'You are in a quiet library setting. Be focused on your work but open to conversation. Maintain a studious but friendly demeanor. Reference the books and technology around you.',
  'Stay in character as a student. Reference your coding project or studies when appropriate. Be friendly but not overly distracting from work.',
  ARRAY[
    '*looks up from laptop* Oh, hey! I didn''t see you there.',
    '*stretches and closes laptop* I''ve been coding for hours, my brain needs a break.',
    '*glances at the clock* Wow, it''s getting late. Are you here to study too?'
  ],
  10 -- High priority for auto-selection
) ON CONFLICT (id) DO UPDATE SET
  scene_prompt = EXCLUDED.scene_prompt,
  system_prompt = EXCLUDED.system_prompt,
  scene_rules = EXCLUDED.scene_rules,
  scene_starters = EXCLUDED.scene_starters,
  priority = EXCLUDED.priority,
  updated_at = NOW();

-- Create second test scene with lower priority
INSERT INTO character_scenes (
  id,
  character_id,
  scene_name,
  scene_description,
  scene_prompt,
  system_prompt,
  scene_rules,
  priority
) VALUES (
  '00000000-0000-0000-0000-000000000003'::uuid, -- Test Scene ID 2
  '00000000-0000-0000-0000-000000000001'::uuid, -- Test Character ID
  'Coffee Shop Meetup',
  'A casual meetup at a local coffee shop',
  'Mei Chen sits at a corner table in a cozy coffee shop, sipping a latte and checking messages on her phone.',
  'You are in a relaxed coffee shop setting. Be casual and approachable. Reference the coffee and atmosphere.',
  'Stay casual and friendly. Reference the coffee shop environment.',
  5 -- Lower priority
) ON CONFLICT (id) DO UPDATE SET
  scene_prompt = EXCLUDED.scene_prompt,
  system_prompt = EXCLUDED.system_prompt,
  priority = EXCLUDED.priority,
  updated_at = NOW();

-- ============================================================================
-- 3. VERIFY PROMPT TEMPLATE
-- ============================================================================

-- Verify prompt template exists and is active
SELECT 
  id,
  template_name,
  use_case,
  content_mode,
  is_active,
  CASE 
    WHEN template_name = 'Universal Roleplay - Qwen Instruct (NSFW)' 
      AND use_case = 'character_roleplay' 
      AND content_mode = 'nsfw' 
      AND is_active = true 
    THEN '✅ Template ready'
    ELSE '❌ Template missing or inactive'
  END as status
FROM prompt_templates
WHERE template_name = 'Universal Roleplay - Qwen Instruct (NSFW)'
  AND use_case = 'character_roleplay'
  AND content_mode = 'nsfw'
  AND is_active = true;

-- ============================================================================
-- 4. VERIFY API MODELS
-- ============================================================================

-- Verify roleplay models are configured
SELECT 
  am.id,
  am.model_key,
  am.display_name,
  am.modality,
  am.is_active,
  ap.name as provider_name,
  CASE 
    WHEN am.is_active = true AND ap.is_active = true 
    THEN '✅ Ready'
    ELSE '❌ Not ready'
  END as status
FROM api_models am
INNER JOIN api_providers ap ON am.provider_id = ap.id
WHERE am.modality = 'roleplay'
  AND am.is_active = true
ORDER BY am.priority ASC;

-- Verify image models are configured
SELECT 
  am.id,
  am.model_key,
  am.display_name,
  am.modality,
  am.is_active,
  ap.name as provider_name,
  CASE 
    WHEN am.is_active = true AND ap.is_active = true 
    THEN '✅ Ready'
    ELSE '❌ Not ready'
  END as status
FROM api_models am
INNER JOIN api_providers ap ON am.provider_id = ap.id
WHERE am.modality = 'image'
  AND am.is_active = true
ORDER BY am.priority ASC;

-- ============================================================================
-- 5. CLEANUP OLD TEST DATA (Optional - run before setup)
-- ============================================================================

-- Uncomment to clean up test data before creating new
/*
DELETE FROM character_scenes 
WHERE character_id = '00000000-0000-0000-0000-000000000001'::uuid;

DELETE FROM conversations 
WHERE character_id = '00000000-0000-0000-0000-000000000001'::uuid;

DELETE FROM messages 
WHERE conversation_id IN (
  SELECT id FROM conversations 
  WHERE character_id = '00000000-0000-0000-0000-000000000001'::uuid
);

DELETE FROM characters 
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
*/

