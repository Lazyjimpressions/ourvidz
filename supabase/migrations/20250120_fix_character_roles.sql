-- Fix Character Roles Migration
-- Purpose: Identify and fix incorrectly classified characters based on actual usage
-- Date: 2025-01-20
-- Safe to run multiple times (idempotent)

-- ============================================================================
-- STEP 1: Create audit log table to track changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS character_role_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  old_role TEXT,
  new_role TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Create temporary tables to identify incorrectly classified characters
-- ============================================================================

-- Drop temp tables if they exist (for idempotency)
DROP TABLE IF EXISTS incorrectly_user_role;
DROP TABLE IF EXISTS incorrectly_ai_role;

-- Characters with role='user' that should be role='ai':
-- - Used as character_id (AI companion) in conversations
-- - NOT used as user_character_id in any conversation
-- - NOT set as default_user_character_id in any profile

CREATE TEMP TABLE incorrectly_user_role AS
SELECT DISTINCT c.id, c.name, c.role
FROM characters c
WHERE c.role = 'user'
  -- Used as AI companion (character_id) in conversations
  AND EXISTS (
    SELECT 1 FROM conversations conv
    WHERE conv.character_id = c.id
  )
  -- NOT used as user character
  AND NOT EXISTS (
    SELECT 1 FROM conversations conv
    WHERE conv.user_character_id = c.id
  )
  -- NOT set as default user character
  AND NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.default_user_character_id = c.id
  );

-- Characters with role='ai' that should be role='user':
-- - Used as user_character_id in conversations
-- - OR set as default_user_character_id in profiles

CREATE TEMP TABLE incorrectly_ai_role AS
SELECT DISTINCT c.id, c.name, c.role
FROM characters c
WHERE c.role = 'ai'
  AND (
    -- Used as user character in conversations
    EXISTS (
      SELECT 1 FROM conversations conv
      WHERE conv.user_character_id = c.id
    )
    -- OR set as default user character
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.default_user_character_id = c.id
    )
  );

-- ============================================================================
-- STEP 3: Log changes before updating
-- ============================================================================

INSERT INTO character_role_audit (character_id, old_role, new_role, reason)
SELECT 
  id,
  'user' as old_role,
  'ai' as new_role,
  'Character used as AI companion (character_id) but marked as user role' as reason
FROM incorrectly_user_role

UNION ALL

SELECT 
  id,
  'ai' as old_role,
  'user' as new_role,
  CASE 
    WHEN EXISTS (SELECT 1 FROM conversations WHERE user_character_id = incorrectly_ai_role.id) 
      AND EXISTS (SELECT 1 FROM profiles WHERE default_user_character_id = incorrectly_ai_role.id)
    THEN 'Character used as user_character_id AND set as default_user_character_id'
    WHEN EXISTS (SELECT 1 FROM conversations WHERE user_character_id = incorrectly_ai_role.id)
    THEN 'Character used as user_character_id in conversations'
    WHEN EXISTS (SELECT 1 FROM profiles WHERE default_user_character_id = incorrectly_ai_role.id)
    THEN 'Character set as default_user_character_id in profiles'
  END as reason
FROM incorrectly_ai_role;

-- ============================================================================
-- STEP 4: Update incorrectly classified characters
-- ============================================================================

-- Fix characters marked as 'user' that should be 'ai'
UPDATE characters
SET role = 'ai', updated_at = NOW()
WHERE id IN (SELECT id FROM incorrectly_user_role);

-- Fix characters marked as 'ai' that should be 'user'
UPDATE characters
SET role = 'user', updated_at = NOW()
WHERE id IN (SELECT id FROM incorrectly_ai_role);

-- ============================================================================
-- STEP 5: Generate summary report
-- ============================================================================

DO $$
DECLARE
  user_to_ai_count INTEGER;
  ai_to_user_count INTEGER;
  total_fixed INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_to_ai_count
  FROM character_role_audit
  WHERE old_role = 'user' AND new_role = 'ai'
  AND created_at >= NOW() - INTERVAL '1 minute';
  
  SELECT COUNT(*) INTO ai_to_user_count
  FROM character_role_audit
  WHERE old_role = 'ai' AND new_role = 'user'
  AND created_at >= NOW() - INTERVAL '1 minute';
  
  total_fixed := user_to_ai_count + ai_to_user_count;
  
  RAISE NOTICE 'Character Role Fix Summary:';
  RAISE NOTICE '  Characters changed from user -> ai: %', user_to_ai_count;
  RAISE NOTICE '  Characters changed from ai -> user: %', ai_to_user_count;
  RAISE NOTICE '  Total characters fixed: %', total_fixed;
END $$;

-- ============================================================================
-- STEP 6: Verification queries (for manual review)
-- ============================================================================

-- View all changes made in this migration
-- SELECT 
--   c.id,
--   c.name,
--   c.role as current_role,
--   a.old_role,
--   a.new_role,
--   a.reason,
--   a.created_at
-- FROM character_role_audit a
-- JOIN characters c ON c.id = a.character_id
-- WHERE a.created_at >= NOW() - INTERVAL '1 minute'
-- ORDER BY a.created_at DESC;

-- Verify no remaining incorrectly classified characters
-- SELECT 
--   'Characters with role=user used as AI companions' as issue,
--   COUNT(*) as count
-- FROM characters c
-- WHERE c.role = 'user'
--   AND EXISTS (SELECT 1 FROM conversations WHERE character_id = c.id)
--   AND NOT EXISTS (SELECT 1 FROM conversations WHERE user_character_id = c.id)
--   AND NOT EXISTS (SELECT 1 FROM profiles WHERE default_user_character_id = c.id)
-- 
-- UNION ALL
-- 
-- SELECT 
--   'Characters with role=ai used as user characters' as issue,
--   COUNT(*) as count
-- FROM characters c
-- WHERE c.role = 'ai'
--   AND (
--     EXISTS (SELECT 1 FROM conversations WHERE user_character_id = c.id)
--     OR EXISTS (SELECT 1 FROM profiles WHERE default_user_character_id = c.id)
--   );
