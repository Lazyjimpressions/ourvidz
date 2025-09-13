-- Update Stability SDXL model capabilities to support i2i properly
UPDATE api_models 
SET capabilities = jsonb_set(
  jsonb_set(
    jsonb_set(
      COALESCE(capabilities, '{}'::jsonb),
      '{allowed_input_keys}',
      '["prompt", "negative_prompt", "width", "height", "num_inference_steps", "guidance_scale", "scheduler", "num_outputs", "seed", "image", "strength"]'::jsonb
    ),
    '{input_key_mappings}',
    '{"i2i_image_key": "image", "i2i_strength_key": "strength", "steps": "num_inference_steps"}'::jsonb
  ),
  '{scheduler_aliases}',
  '{"lms": "K_LMS", "heun": "K_HEUN", "dpm_2": "K_DPM_2", "euler": "K_EULER", "euler_a": "K_EULER_ANCESTRAL", "euler_ancestral": "K_EULER_ANCESTRAL", "dpm_2_ancestral": "K_DPM_2_ANCESTRAL", "EulerA": "K_EULER_ANCESTRAL"}'::jsonb
)
WHERE model_key = 'stability-ai/sdxl' AND display_name = 'Stability SDXL';