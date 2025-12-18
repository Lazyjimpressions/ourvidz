-- Verify Test Data Setup
-- Run this after setup-test-data.sql to verify all test data is correctly configured

-- ============================================================================
-- 1. VERIFY TEST CHARACTER
-- ============================================================================

SELECT 
  'Character Data' as check_type,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Character exists'
    ELSE '❌ Character missing'
  END as status,
  COUNT(*) as count
FROM characters
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid

UNION ALL

SELECT 
  'Character Fields' as check_type,
  CASE 
    WHEN name IS NOT NULL 
      AND description IS NOT NULL 
      AND traits IS NOT NULL 
      AND persona IS NOT NULL 
      AND base_prompt IS NOT NULL
    THEN '✅ All required fields present'
    ELSE '❌ Missing required fields'
  END as status,
  CASE 
    WHEN name IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN description IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN traits IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN persona IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN base_prompt IS NOT NULL THEN 1 ELSE 0 END as count
FROM characters
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid

UNION ALL

SELECT 
  'Character Voice Examples' as check_type,
  CASE 
    WHEN voice_examples IS NOT NULL 
      AND array_length(voice_examples, 1) > 0
    THEN '✅ Voice examples present'
    ELSE '❌ No voice examples'
  END as status,
  COALESCE(array_length(voice_examples, 1), 0) as count
FROM characters
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid

UNION ALL

SELECT 
  'Character Forbidden Phrases' as check_type,
  CASE 
    WHEN forbidden_phrases IS NOT NULL 
      AND array_length(forbidden_phrases, 1) > 0
    THEN '✅ Forbidden phrases present'
    ELSE '⚠️  No forbidden phrases (optional)'
  END as status,
  COALESCE(array_length(forbidden_phrases, 1), 0) as count
FROM characters
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

-- ============================================================================
-- 2. VERIFY TEST SCENES
-- ============================================================================

SELECT 
  'Scene Count' as check_type,
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ Scenes exist'
    ELSE '❌ No scenes found'
  END as status,
  COUNT(*) as count
FROM character_scenes
WHERE character_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND is_active = true

UNION ALL

SELECT 
  'Scene with System Prompt' as check_type,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Scene with system_prompt exists'
    ELSE '❌ No scene with system_prompt'
  END as status,
  COUNT(*) as count
FROM character_scenes
WHERE character_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND is_active = true
  AND system_prompt IS NOT NULL
  AND system_prompt != ''

UNION ALL

SELECT 
  'Scene with Starters' as check_type,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Scene with starters exists'
    ELSE '⚠️  No scene with starters (optional)'
  END as status,
  COUNT(*) as count
FROM character_scenes
WHERE character_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND is_active = true
  AND scene_starters IS NOT NULL
  AND array_length(scene_starters, 1) > 0

UNION ALL

SELECT 
  'Scene Priority Ordering' as check_type,
  CASE 
    WHEN COUNT(*) >= 2 THEN '✅ Multiple scenes for priority test'
    ELSE '⚠️  Only one scene (priority test limited)'
  END as status,
  COUNT(*) as count
FROM character_scenes
WHERE character_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND is_active = true;

-- ============================================================================
-- 3. VERIFY PROMPT TEMPLATE
-- ============================================================================

SELECT 
  'Prompt Template' as check_type,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Template exists and active'
    ELSE '❌ Template missing or inactive'
  END as status,
  COUNT(*) as count
FROM prompt_templates
WHERE template_name = 'Universal Roleplay - Qwen Instruct (NSFW)'
  AND use_case = 'character_roleplay'
  AND content_mode = 'nsfw'
  AND is_active = true

UNION ALL

SELECT 
  'Template Placeholders' as check_type,
  CASE 
    WHEN system_prompt LIKE '%{{character_name}}%'
      AND system_prompt LIKE '%{{character_description}}%'
      AND system_prompt LIKE '%{{voice_examples}}%'
    THEN '✅ Required placeholders present'
    ELSE '❌ Missing required placeholders'
  END as status,
  CASE WHEN system_prompt LIKE '%{{character_name}}%' THEN 1 ELSE 0 END +
  CASE WHEN system_prompt LIKE '%{{character_description}}%' THEN 1 ELSE 0 END +
  CASE WHEN system_prompt LIKE '%{{voice_examples}}%' THEN 1 ELSE 0 END as count
FROM prompt_templates
WHERE template_name = 'Universal Roleplay - Qwen Instruct (NSFW)'
  AND use_case = 'character_roleplay'
  AND content_mode = 'nsfw'
  AND is_active = true;

-- ============================================================================
-- 4. VERIFY API MODELS
-- ============================================================================

SELECT 
  'Roleplay Models' as check_type,
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ Active roleplay models found'
    ELSE '❌ No active roleplay models'
  END as status,
  COUNT(*) as count
FROM api_models am
INNER JOIN api_providers ap ON am.provider_id = ap.id
WHERE am.modality = 'roleplay'
  AND am.is_active = true
  AND ap.is_active = true

UNION ALL

SELECT 
  'Image Models' as check_type,
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ Active image models found'
    ELSE '❌ No active image models'
  END as status,
  COUNT(*) as count
FROM api_models am
INNER JOIN api_providers ap ON am.provider_id = ap.id
WHERE am.modality = 'image'
  AND am.is_active = true
  AND ap.is_active = true

UNION ALL

SELECT 
  'Default Roleplay Model' as check_type,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Default roleplay model set'
    ELSE '⚠️  No default model (recommended)'
  END as status,
  COUNT(*) as count
FROM api_models
WHERE modality = 'roleplay'
  AND is_active = true
  AND is_default = true;

-- ============================================================================
-- 5. SUMMARY REPORT
-- ============================================================================

SELECT 
  '=== TEST DATA VERIFICATION SUMMARY ===' as summary,
  '' as status,
  0 as count

UNION ALL

SELECT 
  'Character Setup' as summary,
  CASE 
    WHEN (SELECT COUNT(*) FROM characters WHERE id = '00000000-0000-0000-0000-000000000001'::uuid) > 0
    THEN '✅ Complete'
    ELSE '❌ Incomplete'
  END as status,
  (SELECT COUNT(*) FROM characters WHERE id = '00000000-0000-0000-0000-000000000001'::uuid) as count

UNION ALL

SELECT 
  'Scene Setup' as summary,
  CASE 
    WHEN (SELECT COUNT(*) FROM character_scenes WHERE character_id = '00000000-0000-0000-0000-000000000001'::uuid AND is_active = true) >= 1
    THEN '✅ Complete'
    ELSE '❌ Incomplete'
  END as status,
  (SELECT COUNT(*) FROM character_scenes WHERE character_id = '00000000-0000-0000-0000-000000000001'::uuid AND is_active = true) as count

UNION ALL

SELECT 
  'Prompt Template' as summary,
  CASE 
    WHEN (SELECT COUNT(*) FROM prompt_templates WHERE template_name = 'Universal Roleplay - Qwen Instruct (NSFW)' AND is_active = true) > 0
    THEN '✅ Ready'
    ELSE '❌ Missing'
  END as status,
  (SELECT COUNT(*) FROM prompt_templates WHERE template_name = 'Universal Roleplay - Qwen Instruct (NSFW)' AND is_active = true) as count

UNION ALL

SELECT 
  'API Models' as summary,
  CASE 
    WHEN (SELECT COUNT(*) FROM api_models WHERE modality = 'roleplay' AND is_active = true) >= 1
      AND (SELECT COUNT(*) FROM api_models WHERE modality = 'image' AND is_active = true) >= 1
    THEN '✅ Configured'
    ELSE '❌ Missing'
  END as status,
  (SELECT COUNT(*) FROM api_models WHERE is_active = true) as count;

