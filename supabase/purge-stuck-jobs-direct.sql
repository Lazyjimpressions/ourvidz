-- Direct purge - run these in order
-- This is simpler: delete jobs that are processing and have workspace assets

-- Step 1: Preview (SAFE - read-only)
SELECT COUNT(*) as jobs_to_delete
FROM jobs j
WHERE j.metadata->>'destination' = 'character_portrait'
  AND j.status = 'processing'
  AND EXISTS (
    SELECT 1 FROM workspace_assets wa 
    WHERE wa.job_id = j.id 
    AND wa.temp_storage_path IS NOT NULL
  )
  AND j.created_at > NOW() - INTERVAL '7 days';

-- Step 2: Delete workspace_assets (must delete first due to FK constraint)
DELETE FROM workspace_assets
WHERE job_id IN (
  SELECT j.id
  FROM jobs j
  WHERE j.metadata->>'destination' = 'character_portrait'
    AND j.status = 'processing'
    AND EXISTS (
      SELECT 1 FROM workspace_assets wa 
      WHERE wa.job_id = j.id 
      AND wa.temp_storage_path IS NOT NULL
    )
    AND j.created_at > NOW() - INTERVAL '7 days'
);

-- Step 3: Delete the jobs
DELETE FROM jobs
WHERE metadata->>'destination' = 'character_portrait'
  AND status = 'processing'
  AND created_at > NOW() - INTERVAL '7 days'
  AND NOT EXISTS (
    -- Only delete if no workspace_assets remain (we just deleted them)
    SELECT 1 FROM workspace_assets wa WHERE wa.job_id = jobs.id
  );

-- Step 4: Verify (should return 0)
SELECT COUNT(*) as remaining_stuck_jobs
FROM jobs j
WHERE j.metadata->>'destination' = 'character_portrait'
  AND j.status = 'processing'
  AND j.created_at > NOW() - INTERVAL '7 days';

