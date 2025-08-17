
-- Relax legacy validation to match the new workspace_assets flow.
-- This removes the hard requirement for image_id/video_id when marking jobs as completed.
-- It logs for visibility instead of blocking the update.

CREATE OR REPLACE FUNCTION public.validate_job_completion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Legacy fields no longer required; log if they are missing for awareness.
    IF NEW.job_type LIKE '%image%' AND NEW.image_id IS NULL THEN
      RAISE LOG 'validate_job_completion: Image job % lacks legacy image_id; allowing completion (workspace_assets model)', NEW.id;
    END IF;

    IF NEW.job_type LIKE '%video%' AND NEW.video_id IS NULL THEN
      RAISE LOG 'validate_job_completion: Video job % lacks legacy video_id; allowing completion (workspace_assets model)', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
