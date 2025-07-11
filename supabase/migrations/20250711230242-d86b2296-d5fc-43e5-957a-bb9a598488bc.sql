-- Phase 2: Clean Up Orphaned Jobs
-- Remove jobs that completed successfully but have no associated images or videos

-- First, let's identify and remove the 5 orphaned jobs from July 11th
DELETE FROM jobs 
WHERE id IN (
  SELECT j.id 
  FROM jobs j
  LEFT JOIN images i ON j.image_id = i.id
  LEFT JOIN videos v ON j.video_id = v.id
  WHERE j.status = 'completed'
    AND j.created_at::date = '2025-07-11'
    AND i.id IS NULL 
    AND v.id IS NULL
    AND (j.job_type LIKE '%image%' OR j.job_type LIKE '%video%')
);

-- Add a function to periodically clean orphaned jobs
CREATE OR REPLACE FUNCTION clean_orphaned_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete completed jobs with no associated assets (older than 24 hours)
  DELETE FROM jobs 
  WHERE id IN (
    SELECT j.id 
    FROM jobs j
    LEFT JOIN images i ON j.image_id = i.id
    LEFT JOIN videos v ON j.video_id = v.id
    WHERE j.status = 'completed'
      AND j.created_at < NOW() - INTERVAL '24 hours'
      AND i.id IS NULL 
      AND v.id IS NULL
      AND (j.job_type LIKE '%image%' OR j.job_type LIKE '%video%')
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup
  INSERT INTO user_activity_log (action, metadata, user_id)
  VALUES (
    'system_cleanup_orphaned_jobs',
    jsonb_build_object('deleted_count', deleted_count, 'timestamp', NOW()),
    '00000000-0000-0000-0000-000000000000'::uuid
  );
  
  RETURN deleted_count;
END;
$$;

-- Add constraint to prevent jobs from being marked completed without assets
CREATE OR REPLACE FUNCTION validate_job_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If job is being marked as completed, ensure it has associated assets
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- For image jobs, must have image_id
    IF NEW.job_type LIKE '%image%' AND NEW.image_id IS NULL THEN
      RAISE EXCEPTION 'Image jobs cannot be completed without an associated image_id';
    END IF;
    
    -- For video jobs, must have video_id  
    IF NEW.job_type LIKE '%video%' AND NEW.video_id IS NULL THEN
      RAISE EXCEPTION 'Video jobs cannot be completed without an associated video_id';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply the validation trigger
DROP TRIGGER IF EXISTS validate_job_completion_trigger ON jobs;
CREATE TRIGGER validate_job_completion_trigger
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION validate_job_completion();

-- Add comments for documentation
COMMENT ON FUNCTION clean_orphaned_jobs() IS 'Removes completed jobs that have no associated image or video assets';
COMMENT ON FUNCTION validate_job_completion() IS 'Prevents jobs from being marked completed without proper asset associations';