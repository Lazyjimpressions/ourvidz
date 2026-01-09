-- Simple purge of stuck character portrait jobs
-- Run these queries one at a time in order

-- Step 1: Preview what will be deleted (SAFE - read-only)
SELECT 
  j.id as job_id,
  j.user_id,
  j.created_at,
  j.metadata->>'characterName' as character_name,
  wa.temp_storage_path
FROM jobs j
INNER JOIN workspace_assets wa ON wa.job_id = j.id
WHERE j.metadata->>'destination' = 'character_portrait'
  AND j.status = 'processing'
  AND wa.temp_storage_path IS NOT NULL
  AND j.created_at > NOW() - INTERVAL '7 days'
ORDER BY j.created_at DESC;

-- Step 2: Delete workspace_assets first (to avoid FK constraints)
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

-- Step 3: Delete the stuck jobs (jobs that were processing with workspace assets)
DELETE FROM jobs
WHERE metadata->>'destination' = 'character_portrait'
  AND status = 'processing'
  AND created_at > NOW() - INTERVAL '7 days'
  AND id IN (
    -- Jobs that had workspace assets (before we deleted them in Step 2)
    SELECT DISTINCT job_id 
    FROM workspace_assets 
    WHERE job_id IN (
      SELECT j.id
      FROM jobs j
      WHERE j.metadata->>'destination' = 'character_portrait'
        AND j.status = 'processing'
        AND j.created_at > NOW() - INTERVAL '7 days'
    )
  );

-- Step 4: Verify cleanup (should return 0)
SELECT COUNT(*) as remaining_stuck_jobs
FROM jobs j
WHERE j.metadata->>'destination' = 'character_portrait'
  AND j.status = 'processing'
  AND j.created_at > NOW() - INTERVAL '7 days';

