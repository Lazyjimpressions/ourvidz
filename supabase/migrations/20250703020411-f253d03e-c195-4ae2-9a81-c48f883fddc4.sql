-- Fix SDXL image metadata bucket names to match actual storage buckets
UPDATE images 
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{bucket}',
  '"sdxl_image_fast"'::jsonb
)
WHERE metadata->>'bucket' = 'sdxl_fast'
   OR (metadata->>'is_sdxl' = 'true' AND COALESCE(quality, 'fast') = 'fast' AND metadata->>'bucket' IS NULL);

UPDATE images 
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{bucket}',
  '"sdxl_image_high"'::jsonb
)
WHERE metadata->>'bucket' = 'sdxl_high'
   OR (metadata->>'is_sdxl' = 'true' AND quality = 'high' AND metadata->>'bucket' IS NULL);