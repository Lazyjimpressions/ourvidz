-- Fix existing database records to use correct SDXL bucket names
-- Update any records that have old bucket names in metadata
UPDATE images 
SET metadata = jsonb_set(
    COALESCE(metadata, '{}'),
    '{bucket}',
    '"sdxl_image_fast"'
)
WHERE metadata->>'bucket' = 'sdxl_fast'
   OR (quality = 'fast' AND (metadata->>'is_sdxl' = 'true' OR metadata->>'model_type' = 'sdxl'));

UPDATE images 
SET metadata = jsonb_set(
    COALESCE(metadata, '{}'),
    '{bucket}',
    '"sdxl_image_high"'
)
WHERE metadata->>'bucket' = 'sdxl_high'
   OR (quality = 'high' AND (metadata->>'is_sdxl' = 'true' OR metadata->>'model_type' = 'sdxl'));