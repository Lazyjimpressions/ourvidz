-- HOLISTIC FIX: Update NULL job_id workspace items and add constraints
-- Phase 1: Update existing workspace items with NULL job_id

-- Update workspace items based on session_id matching with completed jobs
UPDATE workspace_items 
SET job_id = j.id
FROM jobs j
WHERE workspace_items.job_id IS NULL 
  AND workspace_items.session_id = j.workspace_session_id
  AND j.status = 'completed'
  AND j.destination = 'workspace';

-- Phase 2: Add a function to automatically link workspace items to jobs
CREATE OR REPLACE FUNCTION link_workspace_items_to_jobs()
RETURNS INTEGER AS $$
DECLARE
  linked_count INTEGER := 0;
BEGIN
  -- Link workspace items to jobs based on session_id and timing
  UPDATE workspace_items 
  SET job_id = j.id
  FROM jobs j
  WHERE workspace_items.job_id IS NULL 
    AND workspace_items.session_id = j.workspace_session_id
    AND j.status = 'completed'
    AND j.destination = 'workspace'
    AND ABS(EXTRACT(EPOCH FROM (workspace_items.created_at - j.completed_at))) < 300; -- within 5 minutes
  
  GET DIAGNOSTICS linked_count = ROW_COUNT;
  
  RETURN linked_count;
END;
$$ LANGUAGE plpgsql;

-- Phase 3: Add better indexing for workspace queries
CREATE INDEX IF NOT EXISTS idx_workspace_items_job_id_session ON workspace_items(job_id, session_id);
CREATE INDEX IF NOT EXISTS idx_workspace_items_user_created ON workspace_items(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_workspace_session ON jobs(workspace_session_id, destination, status);

-- Phase 4: Run the linking function to fix existing data
SELECT link_workspace_items_to_jobs();