-- Manual fix for stuck character portrait jobs
-- This script finds jobs that have workspace assets but are stuck in processing
-- and attempts to save them to library if the character exists

-- Step 1: Find stuck jobs with workspace assets
WITH stuck_jobs AS (
  SELECT 
    j.id as job_id,
    j.user_id,
    j.metadata->>'characterName' as character_name,
    j.metadata->>'character_name' as character_name_alt,
    wa.temp_storage_path,
    wa.asset_type,
    wa.file_size_bytes,
    wa.mime_type,
    wa.original_prompt,
    wa.model_used,
    wa.generation_seed
  FROM jobs j
  INNER JOIN workspace_assets wa ON wa.job_id = j.id
  WHERE j.metadata->>'destination' = 'character_portrait'
    AND j.status = 'processing'
    AND wa.temp_storage_path IS NOT NULL
    AND j.created_at > NOW() - INTERVAL '7 days'
),
-- Step 2: Find matching characters
matched_characters AS (
  SELECT 
    sj.*,
    c.id as character_id,
    c.name as character_name_in_db
  FROM stuck_jobs sj
  LEFT JOIN characters c ON c.user_id = sj.user_id
    AND (c.name = sj.character_name OR c.name = sj.character_name_alt)
    AND c.created_at > sj.job_id::timestamp - INTERVAL '10 minutes'
  ORDER BY c.created_at DESC
  LIMIT 1
)
-- Step 3: Display what would be fixed
SELECT 
  job_id,
  user_id,
  character_id,
  character_name_in_db,
  temp_storage_path,
  CASE 
    WHEN character_id IS NOT NULL THEN 'Can be fixed'
    ELSE 'Character not found'
  END as fix_status
FROM matched_characters;

-- To actually fix, you would need to:
-- 1. Update job status to 'completed'
-- 2. Copy file from workspace-temp to user-library
-- 3. Create user_library record
-- 4. Update character record

-- This should be done via an edge function or manual process

