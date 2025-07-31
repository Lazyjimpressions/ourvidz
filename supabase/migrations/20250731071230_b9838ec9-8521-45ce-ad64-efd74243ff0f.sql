-- Refresh the prompt cache to fix cache structure issues
-- This will rebuild the template cache from scratch

-- First, let's call the refresh-prompt-cache function to rebuild the cache
-- This will fix the "Invalid cache structure" error we're seeing in the logs

INSERT INTO user_activity_log (user_id, action, details, metadata)
VALUES (
  '3348b481-8fb1-4745-8e6c-db6e9847e429',
  'admin_cache_refresh',
  'Manual cache refresh to fix enhancement issues',
  jsonb_build_object(
    'reason', 'fix_worker_selection_and_cache_structure',
    'timestamp', now(),
    'source', 'manual_admin_action'
  )
);