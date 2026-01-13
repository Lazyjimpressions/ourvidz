
-- Step 1: Delete orphaned workspace assets (jobs that are stuck, not completed)
DELETE FROM workspace_assets 
WHERE job_id IN (
  SELECT id FROM jobs 
  WHERE status IN ('pending', 'processing', 'queued')
    AND created_at > NOW() - INTERVAL '7 days'
    AND created_at < NOW() - INTERVAL '1 hour'
);

-- Step 2: Mark stuck jobs as failed (older than 1 hour to avoid killing active jobs)
UPDATE jobs 
SET 
  status = 'failed',
  error_message = 'Cleaned up: Job was stuck during edge function deployment issues',
  completed_at = NOW()
WHERE status IN ('pending', 'processing', 'queued')
  AND created_at > NOW() - INTERVAL '7 days'
  AND created_at < NOW() - INTERVAL '1 hour';
