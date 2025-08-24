
-- Normalize and configure the existing RV5.1 model row in api_models

-- Note: preserving model_family = 'SDXL' as confirmed.
-- We also ensure the provider linkage remains to the 'replicate' provider (already set on this row).

UPDATE public.api_models
SET
  model_key = 'lucataco/realistic-vision-v5.1',
  version = '2c8e954decbf70b7607a4414e5785ef9e4de4b8c51d50fb8b8b349160e0ef6bb',
  display_name = 'Realistic Vision 5.1 (SDXL)',
  -- Keep SDXL casing as currently used in your data
  model_family = 'SDXL',
  -- Input defaults must use the model's exact input names
  input_defaults = jsonb_build_object(
    'steps', 20,
    'guidance', 5,
    'width', 1024,
    'height', 1024,
    'scheduler', 'EulerA',
    'negative_prompt', '',
    'seed', 0
  ),
  -- Capabilities inform UI/mappers how to shape calls and validate ranges
  capabilities = jsonb_build_object(
    'supports_seed', true,
    'seed_max', 2147483647,
    'supports_steps', true,
    'steps_max', 100,
    'supports_guidance', true,
    'guidance_min', 3.5,
    'guidance_max', 7,
    'supports_scheduler', true,
    'scheduler_options', '["EulerA","MultistepDPM-Solver"]'::jsonb,
    'supports_width_height', true,
    'max_width', 1920,
    'max_height', 1920,
    'supports_negative_prompt', true,
    'supports_batch', false,
    'nsfw_param', NULL
  ),
  is_active = true
WHERE id = '6c42c68a-fcb8-417e-b0e8-c5154eaa3a4f';
