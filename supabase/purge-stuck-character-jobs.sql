-- Purge stuck character portrait jobs
-- This script safely removes jobs that are stuck in "processing" status
-- with workspace assets but were never completed

-- Step 1: Identify stuck jobs (for review)
SELECT 
  j.id as job_id,
  j.user_id,
  j.status,
  j.created_at,
  j.metadata->>'characterName' as character_name,
  j.metadata->>'character_id' as character_id,
  wa.temp_storage_path,
  c.id as matched_character_id,
  c.name as matched_character_name
FROM jobs j
INNER JOIN workspace_assets wa ON wa.job_id = j.id
LEFT JOIN characters c ON c.user_id = j.user_id 
  AND (c.name = COALESCE(j.metadata->>'characterName', j.metadata->>'character_name'))
WHERE j.metadata->>'destination' = 'character_portrait'
  AND j.status = 'processing'
  AND wa.temp_storage_path IS NOT NULL
  AND j.created_at > NOW() - INTERVAL '7 days'
ORDER BY j.created_at DESC;

-- Step 2: Delete workspace assets for stuck jobs
-- (Run this first to avoid foreign key constraints)
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

-- Step 3: Delete the stuck jobs
DELETE FROM jobs
WHERE metadata->>'destination' = 'character_portrait'
  AND status = 'processing'
  AND EXISTS (
    SELECT 1 FROM workspace_assets wa 
    WHERE wa.job_id = jobs.id 
    AND wa.temp_storage_path IS NOT NULL
  )
  AND created_at > NOW() - INTERVAL '7 days';

-- Verification: Check remaining stuck jobs
SELECT COUNT(*) as remaining_stuck_jobs
FROM jobs j
WHERE j.metadata->>'destination' = 'character_portrait'
  AND j.status = 'processing'
  AND EXISTS (
    SELECT 1 FROM workspace_assets wa 
    WHERE wa.job_id = j.id 
    AND wa.temp_storage_path IS NOT NULL
  );

