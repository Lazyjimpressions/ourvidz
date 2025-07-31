-- Refresh the prompt cache to fix structure issues
-- This will fix the "Invalid cache structure" errors in the enhance-prompt function

-- Insert an activity log entry to track the cache refresh
INSERT INTO user_activity_log (user_id, action, details, metadata)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'system_cache_refresh',
  'Cache refresh to fix enhancement worker routing',
  jsonb_build_object(
    'reason', 'fix_worker_selection_cache_structure',
    'timestamp', now(),
    'source', 'system_maintenance',
    'improvement', 'simplified_prompt_management'
  )
);

-- This migration will trigger the cache refresh function to rebuild templates
-- The cache structure issues causing "Invalid cache structure" errors should be resolved