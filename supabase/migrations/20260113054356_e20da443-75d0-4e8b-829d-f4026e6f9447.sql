-- Update Seedream Edit models to indicate they don't use strength parameter
UPDATE api_models 
SET capabilities = jsonb_set(
  COALESCE(capabilities, '{}')::jsonb, 
  '{uses_strength_param}', 
  'false'::jsonb
)
WHERE model_key IN (
  'fal-ai/bytedance/seedream/v4/edit',
  'fal-ai/bytedance/seedream/v4.5/edit'
);

-- Also add char_limit info for reference
UPDATE api_models 
SET capabilities = jsonb_set(
  jsonb_set(
    COALESCE(capabilities, '{}')::jsonb, 
    '{uses_strength_param}', 
    'false'::jsonb
  ),
  '{char_limit}',
  '10000'::jsonb
)
WHERE model_key IN (
  'fal-ai/bytedance/seedream/v4/edit',
  'fal-ai/bytedance/seedream/v4.5/edit'
);

-- Confirm no CLIP token limit for Seedream models (they use character limits)
UPDATE api_models 
SET capabilities = jsonb_set(
  COALESCE(capabilities, '{}')::jsonb, 
  '{uses_clip_tokenizer}', 
  'false'::jsonb
)
WHERE model_key LIKE '%seedream%';