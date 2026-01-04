-- Update WAN 2.1 I2V model with complete input_defaults and capabilities
-- This migration updates the fal-ai/wan-i2v model configuration

UPDATE api_models
SET 
  input_defaults = jsonb_build_object(
    'num_frames', 81,
    'frames_per_second', 16,
    'resolution', '720p',
    'num_inference_steps', 30,
    'guide_scale', 5.0,
    'aspect_ratio', 'auto',
    'acceleration', 'regular',
    'enable_prompt_expansion', false
  ),
  capabilities = capabilities || jsonb_build_object(
    'video', jsonb_build_object(
      'reference_mode', 'single',
      'duration_range', jsonb_build_object('min', 3.375, 'max', 20, 'default', 5),
      'num_frames_range', jsonb_build_object('min', 81, 'max', 100, 'default', 81),
      'fps_range', jsonb_build_object('min', 5, 'max', 24, 'default', 16),
      'resolutions', jsonb_build_array('480p', '720p'),
      'aspect_ratios', jsonb_build_array('auto', '16:9', '9:16', '1:1'),
      'guide_scale_range', jsonb_build_object('min', 1, 'max', 20, 'default', 5)
    )
  )
WHERE model_key = 'fal-ai/wan-i2v';

-- Verify the update
SELECT 
  id, 
  model_key, 
  display_name, 
  input_defaults, 
  capabilities->'video' as video_capabilities
FROM api_models
WHERE model_key = 'fal-ai/wan-i2v';

