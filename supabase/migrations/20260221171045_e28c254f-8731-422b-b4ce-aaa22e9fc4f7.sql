-- Set endpoint_path = 'fal-webhook' on all active video models
-- This tells fal-image to use async queue + webhook instead of synchronous fal.run
UPDATE public.api_models
SET endpoint_path = 'fal-webhook',
    updated_at = now()
WHERE modality = 'video'
  AND is_active = true
  AND (endpoint_path IS NULL OR endpoint_path != 'fal-webhook');