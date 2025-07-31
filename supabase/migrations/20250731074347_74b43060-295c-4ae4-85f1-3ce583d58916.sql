-- Fix the migration to use correct column name
-- The user_activity_log table uses 'action' and 'metadata' columns (no 'details' column)

INSERT INTO user_activity_log (user_id, action, metadata)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'system_cache_refresh',
  jsonb_build_object(
    'reason', 'fix_worker_selection_cache_structure',
    'timestamp', now(),
    'source', 'system_maintenance',
    'improvement', 'simplified_prompt_management',
    'details', 'Cache refresh to fix enhancement worker routing'
  )
);

-- This migration will trigger the cache refresh function to rebuild templates
-- The cache structure issues causing "Invalid cache structure" errors should be resolved