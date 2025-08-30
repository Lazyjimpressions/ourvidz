-- Fix final function search path mutable security warnings
-- Fix the remaining SECURITY DEFINER functions

-- Fix update_conversation_updated_at function
CREATE OR REPLACE FUNCTION public.update_conversation_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.conversations 
  SET updated_at = now() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_collection_asset_count function
CREATE OR REPLACE FUNCTION public.update_collection_asset_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_collections 
    SET asset_count = asset_count + 1 
    WHERE id = NEW.collection_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_collections 
    SET asset_count = asset_count - 1 
    WHERE id = OLD.collection_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle collection changes
    IF OLD.collection_id IS DISTINCT FROM NEW.collection_id THEN
      IF OLD.collection_id IS NOT NULL THEN
        UPDATE user_collections 
        SET asset_count = asset_count - 1 
        WHERE id = OLD.collection_id;
      END IF;
      IF NEW.collection_id IS NOT NULL THEN
        UPDATE user_collections 
        SET asset_count = asset_count + 1 
        WHERE id = NEW.collection_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Fix validate_job_completion function
CREATE OR REPLACE FUNCTION public.validate_job_completion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
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
$$;

-- Fix validate_jobs_moderation_status function
CREATE OR REPLACE FUNCTION public.validate_jobs_moderation_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    IF NEW.moderation_status NOT IN ('pending', 'approved', 'rejected', 'flagged') THEN
        RAISE EXCEPTION 'Invalid moderation_status. Must be pending, approved, rejected, or flagged';
    END IF;
    RETURN NEW;
END;
$$;

-- Note: is_url_expired is an IMMUTABLE function and doesn't need SECURITY DEFINER or search_path
-- It's already properly defined as IMMUTABLE which is the correct approach for this function