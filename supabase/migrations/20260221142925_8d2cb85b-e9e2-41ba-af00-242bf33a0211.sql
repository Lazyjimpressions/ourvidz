
-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1: Populate input_schema for 5 fal.ai models + fix 2 capability flags
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Seedream v4 T2I (c11279e0) - Add full input_schema from llms.txt
UPDATE api_models SET capabilities = jsonb_build_object(
  'char_limit', 10000,
  'max_resolution', 4096,
  'min_resolution', 960,
  'safety_checker_param', 'enable_safety_checker',
  'uses_clip_tokenizer', false,
  'nsfw_status', 'to_be_tested',
  'input_schema', jsonb_build_object(
    'prompt', jsonb_build_object('active', true, 'type', 'string', 'required', true, 'description', 'The text prompt used to generate the image'),
    'image_size', jsonb_build_object('active', true, 'type', 'enum', 'default', 'landscape_4_3', 'description', 'The size of the generated image. Pixels must be between 960x960 and 4096x4096.'),
    'num_images', jsonb_build_object('active', true, 'type', 'integer', 'default', 1, 'min', 1, 'max', 6, 'description', 'Number of separate model generations.'),
    'max_images', jsonb_build_object('active', true, 'type', 'integer', 'default', 1, 'min', 1, 'max', 6, 'description', 'Enables multi-image generation per run.'),
    'seed', jsonb_build_object('active', true, 'type', 'integer', 'description', 'Random seed to control stochasticity.'),
    'sync_mode', jsonb_build_object('active', true, 'type', 'boolean', 'default', false, 'description', 'If True, media returned as data URI.'),
    'enable_safety_checker', jsonb_build_object('active', true, 'type', 'boolean', 'default', true, 'description', 'If set to true, the safety checker will be enabled.'),
    'enhance_prompt_mode', jsonb_build_object('active', true, 'type', 'enum', 'default', 'standard', 'options', '["standard","fast"]', 'description', 'Mode for prompt enhancement.')
  )
), updated_at = now()
WHERE id = 'c11279e0-8810-482b-be48-3cbc7b8e7f48';

-- 2. Seedream v4.5 T2I (96a5d292) - Add full input_schema from llms.txt
UPDATE api_models SET capabilities = jsonb_build_object(
  'char_limit', 10000,
  'max_resolution', 4096,
  'min_resolution', 1920,
  'safety_checker_param', 'enable_safety_checker',
  'uses_clip_tokenizer', false,
  'input_schema', jsonb_build_object(
    'prompt', jsonb_build_object('active', true, 'type', 'string', 'required', true, 'description', 'The text prompt used to generate the image'),
    'image_size', jsonb_build_object('active', true, 'type', 'enum', 'default', 'auto_2K', 'description', 'The size of the generated image. Width/height between 1920-4096 or pixels between 2560x1440 and 4096x4096.'),
    'num_images', jsonb_build_object('active', true, 'type', 'integer', 'default', 1, 'min', 1, 'max', 6, 'description', 'Number of separate model generations.'),
    'max_images', jsonb_build_object('active', true, 'type', 'integer', 'default', 1, 'min', 1, 'max', 6, 'description', 'Enables multi-image generation per run.'),
    'seed', jsonb_build_object('active', true, 'type', 'integer', 'description', 'Random seed to control stochasticity.'),
    'sync_mode', jsonb_build_object('active', true, 'type', 'boolean', 'default', false, 'description', 'If True, media returned as data URI.'),
    'enable_safety_checker', jsonb_build_object('active', true, 'type', 'boolean', 'default', true, 'description', 'If set to true, the safety checker will be enabled.')
  )
), updated_at = now()
WHERE id = '96a5d292-797e-4def-9869-515fefd37e43';

-- 3. Seedream v4 Edit (7c7fba60) - Add input_schema WITH image_urls + requires_image_urls_array flag
UPDATE api_models SET capabilities = jsonb_build_object(
  'char_limit', 10000,
  'safety_checker_param', 'enable_safety_checker',
  'uses_clip_tokenizer', false,
  'uses_strength_param', false,
  'supports_i2i', true,
  'requires_image_urls_array', true,
  'nsfw_status', 'to_be_tested',
  'input_schema', jsonb_build_object(
    'prompt', jsonb_build_object('active', true, 'type', 'string', 'required', true, 'description', 'The text prompt used to edit the image'),
    'image_urls', jsonb_build_object('active', true, 'type', 'array', 'required', true, 'description', 'List of URLs of input images for editing. Up to 10 images.'),
    'image_size', jsonb_build_object('active', true, 'type', 'enum', 'default', 'landscape_4_3', 'description', 'The size of the generated image. Min total area 921600 pixels.'),
    'num_images', jsonb_build_object('active', true, 'type', 'integer', 'default', 1, 'min', 1, 'max', 6, 'description', 'Number of separate model generations.'),
    'max_images', jsonb_build_object('active', true, 'type', 'integer', 'default', 1, 'min', 1, 'max', 6, 'description', 'Multi-image generation. Total images+outputs must not exceed 15.'),
    'seed', jsonb_build_object('active', true, 'type', 'integer', 'description', 'Random seed to control stochasticity.'),
    'sync_mode', jsonb_build_object('active', true, 'type', 'boolean', 'default', false, 'description', 'If True, media returned as data URI.'),
    'enable_safety_checker', jsonb_build_object('active', true, 'type', 'boolean', 'default', true, 'description', 'If set to true, the safety checker will be enabled.'),
    'enhance_prompt_mode', jsonb_build_object('active', true, 'type', 'enum', 'default', 'standard', 'options', '["standard","fast"]', 'description', 'Mode for prompt enhancement.')
  )
), updated_at = now()
WHERE id = '7c7fba60-61aa-4404-9e55-3731a7bc53db';

-- 4. Seedream v4.5 Edit (962211a7) - Add input_schema WITH image_urls + requires_image_urls_array flag
UPDATE api_models SET capabilities = jsonb_build_object(
  'char_limit', 10000,
  'safety_checker_param', 'enable_safety_checker',
  'uses_clip_tokenizer', false,
  'uses_strength_param', false,
  'supports_i2i', true,
  'requires_image_urls_array', true,
  'nsfw_status', 'to_be_tested',
  'max_images', 10,
  'input_schema', jsonb_build_object(
    'prompt', jsonb_build_object('active', true, 'type', 'string', 'required', true, 'description', 'The text prompt used to edit the image'),
    'image_urls', jsonb_build_object('active', true, 'type', 'array', 'required', true, 'description', 'List of URLs of input images for editing. Up to 10 images.'),
    'image_size', jsonb_build_object('active', true, 'type', 'enum', 'default', 'auto_4K', 'description', 'Size of the generated image. Width/height 1920-4096 or pixels 2560x1440-4096x4096.'),
    'num_images', jsonb_build_object('active', true, 'type', 'integer', 'default', 1, 'min', 1, 'max', 6, 'description', 'Number of separate model generations.'),
    'max_images', jsonb_build_object('active', true, 'type', 'integer', 'default', 1, 'min', 1, 'max', 6, 'description', 'Multi-image generation. Total images+outputs must not exceed 15.'),
    'seed', jsonb_build_object('active', true, 'type', 'integer', 'description', 'Random seed to control stochasticity.'),
    'sync_mode', jsonb_build_object('active', true, 'type', 'boolean', 'default', false, 'description', 'If True, media returned as data URI.'),
    'enable_safety_checker', jsonb_build_object('active', true, 'type', 'boolean', 'default', true, 'description', 'If set to true, the safety checker will be enabled.')
  )
), updated_at = now()
WHERE id = '962211a7-af16-44af-8714-a3bd68eef642';

-- 5. WAN 2.1 I2V (c18f8002) - Add complete input_schema from llms.txt + supports_i2v flag
UPDATE api_models SET capabilities = jsonb_build_object(
  'char_limit', 1500,
  'nsfw_status', 'expected_good',
  'permissive_policy', true,
  'supports_i2v', true,
  'safety_checker_param', 'enable_safety_checker',
  'video', jsonb_build_object(
    'aspect_ratios', '["auto","16:9","9:16","1:1"]'::jsonb,
    'duration_range', jsonb_build_object('default', 5, 'max', 20, 'min', 3.375),
    'fps_range', jsonb_build_object('default', 16, 'max', 24, 'min', 5),
    'guide_scale_range', jsonb_build_object('default', 5, 'max', 10, 'min', 1),
    'num_frames_range', jsonb_build_object('default', 81, 'max', 100, 'min', 81),
    'reference_mode', 'single',
    'resolutions', '["480p","720p"]'::jsonb
  ),
  'input_schema', jsonb_build_object(
    'prompt', jsonb_build_object('active', true, 'type', 'string', 'required', true, 'description', 'The text prompt to guide video generation.'),
    'negative_prompt', jsonb_build_object('active', true, 'type', 'string', 'default', 'bright colors, overexposed, static, blurred details, subtitles, style, artwork, painting, picture, still, overall gray, worst quality, low quality', 'description', 'Negative prompt for video generation.'),
    'image_url', jsonb_build_object('active', true, 'type', 'string', 'required', true, 'description', 'URL of the input image. If the input does not match the chosen aspect ratio, it is resized and center cropped.'),
    'num_frames', jsonb_build_object('active', true, 'type', 'integer', 'default', 81, 'min', 81, 'max', 100, 'description', 'Number of frames to generate. 81-100, frames >81 cost 1.25x more.'),
    'frames_per_second', jsonb_build_object('active', true, 'type', 'integer', 'default', 16, 'min', 5, 'max', 24, 'description', 'Frames per second of the generated video.'),
    'seed', jsonb_build_object('active', true, 'type', 'integer', 'description', 'Random seed for reproducibility.'),
    'resolution', jsonb_build_object('active', true, 'type', 'enum', 'default', '720p', 'options', '["480p","720p"]', 'description', 'Resolution. 480p=0.5 billing units, 720p=1 billing unit.'),
    'num_inference_steps', jsonb_build_object('active', true, 'type', 'integer', 'default', 30, 'min', 2, 'max', 40, 'description', 'Number of inference steps. Higher = better quality but slower.'),
    'guide_scale', jsonb_build_object('active', true, 'type', 'float', 'default', 5, 'min', 1, 'max', 10, 'description', 'Classifier-free guidance scale.'),
    'shift', jsonb_build_object('active', true, 'type', 'float', 'default', 5, 'min', 1, 'max', 10, 'description', 'Shift parameter for video generation.'),
    'enable_safety_checker', jsonb_build_object('active', true, 'type', 'boolean', 'default', false, 'description', 'If set to true, the safety checker will be enabled.'),
    'enable_prompt_expansion', jsonb_build_object('active', true, 'type', 'boolean', 'default', false, 'description', 'Whether to enable prompt expansion.'),
    'acceleration', jsonb_build_object('active', true, 'type', 'enum', 'default', 'regular', 'options', '["none","regular"]', 'description', 'Acceleration level. More acceleration = faster but lower quality.'),
    'aspect_ratio', jsonb_build_object('active', true, 'type', 'enum', 'default', 'auto', 'options', '["auto","16:9","9:16","1:1"]', 'description', 'Aspect ratio. "auto" = determined from input image.')
  )
), updated_at = now()
WHERE id = 'c18f8002-f9f4-49b8-8ed6-4ef77cf9e0ab';

-- 6. LTX 13b extend (666c70c8) - Fix video.type from "string" to "object"
UPDATE api_models SET capabilities = jsonb_set(
  capabilities,
  '{input_schema,video,type}',
  '"object"'
), updated_at = now()
WHERE id = '666c70c8-e35f-4bed-a2cf-5081d088b3e3';

-- 7. Grok I2I (395b06f7) - Add supports_i2i flag
UPDATE api_models SET capabilities = capabilities || jsonb_build_object(
  'supports_i2i', true,
  'requires_image_urls_array', false
), updated_at = now()
WHERE id = '395b06f7-1f96-4ef5-9b7f-3617ef0d795d';
