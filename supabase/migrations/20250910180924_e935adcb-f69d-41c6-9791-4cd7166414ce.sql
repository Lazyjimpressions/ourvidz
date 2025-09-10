-- Update Realistic Vision 5.1 model with proper defaults and capabilities
UPDATE api_models 
SET 
  input_defaults = jsonb_build_object(
    'prompt', '',
    'negative_prompt', '',
    'width', 512,
    'height', 512,
    'num_inference_steps', 25,
    'guidance_scale', 7.0,
    'scheduler', 'MultistepDPM-Solver',
    'num_outputs', 1,
    'seed', null
  ),
  capabilities = jsonb_build_object(
    'allowed_input_keys', ARRAY['prompt', 'negative_prompt', 'width', 'height', 'num_inference_steps', 'guidance_scale', 'scheduler', 'num_outputs', 'seed', 'image', 'prompt_strength'],
    'allowed_schedulers', ARRAY['MultistepDPM-Solver', 'EulerA', 'DPM-Solver++', 'DDIM', 'LMS'],
    'scheduler_aliases', jsonb_build_object(
      'euler_a', 'EulerA',
      'euler_ancestral', 'EulerA',
      'dpm_solver_multistep', 'MultistepDPM-Solver',
      'dpm++', 'DPM-Solver++'
    ),
    'input_key_mappings', jsonb_build_object(
      'i2i_image_key', 'image',
      'i2i_strength_key', 'prompt_strength'
    ),
    'input_ranges', jsonb_build_object(
      'width', jsonb_build_object('min', 256, 'max', 1024),
      'height', jsonb_build_object('min', 256, 'max', 1024),
      'num_inference_steps', jsonb_build_object('min', 1, 'max', 50),
      'guidance_scale', jsonb_build_object('min', 1.0, 'max', 20.0),
      'prompt_strength', jsonb_build_object('min', 0.1, 'max', 1.0)
    )
  )
WHERE model_key LIKE '%realistic-vision-v5%' OR display_name ILIKE '%realistic%vision%5%';

-- Update Stability SDXL models with proper defaults and capabilities  
UPDATE api_models 
SET 
  input_defaults = jsonb_build_object(
    'prompt', '',
    'negative_prompt', '',
    'width', 1024,
    'height', 1024,
    'num_inference_steps', 50,
    'guidance_scale', 7.5,
    'scheduler', 'K_EULER_ANCESTRAL',
    'num_outputs', 1,
    'seed', null
  ),
  capabilities = jsonb_build_object(
    'allowed_input_keys', ARRAY['prompt', 'negative_prompt', 'width', 'height', 'num_inference_steps', 'guidance_scale', 'scheduler', 'num_outputs', 'seed', 'image', 'strength'],
    'allowed_schedulers', ARRAY['K_EULER_ANCESTRAL', 'K_EULER', 'K_DPM_2_ANCESTRAL', 'K_DPM_2', 'K_HEUN', 'K_LMS', 'DDIM', 'PLMS'],
    'scheduler_aliases', jsonb_build_object(
      'euler_a', 'K_EULER_ANCESTRAL',
      'euler_ancestral', 'K_EULER_ANCESTRAL',
      'euler', 'K_EULER',
      'dpm_2_ancestral', 'K_DPM_2_ANCESTRAL',
      'dpm_2', 'K_DPM_2',
      'heun', 'K_HEUN',
      'lms', 'K_LMS'
    ),
    'input_key_mappings', jsonb_build_object(
      'i2i_image_key', 'image',
      'i2i_strength_key', 'strength'
    ),
    'input_ranges', jsonb_build_object(
      'width', jsonb_build_object('min', 512, 'max', 1536),
      'height', jsonb_build_object('min', 512, 'max', 1536),
      'num_inference_steps', jsonb_build_object('min', 10, 'max', 150),
      'guidance_scale', jsonb_build_object('min', 1.0, 'max', 20.0),
      'strength', jsonb_build_object('min', 0.1, 'max', 1.0)
    )
  )
WHERE model_key LIKE '%stability-ai/sdxl%' OR display_name ILIKE '%sdxl%';