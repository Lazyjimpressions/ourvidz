-- Update Realistic Vision 5.1 model with canonical scheduler values
UPDATE public.api_models 
SET 
  capabilities = jsonb_set(
    COALESCE(capabilities, '{}'), 
    '{allowed_schedulers}', 
    '["K_EULER_ANCESTRAL", "DPMSolverMultistep", "K_EULER", "DDIM", "HeunDiscrete", "KarrasDPM", "PNDM"]'
  ),
  input_defaults = jsonb_set(
    COALESCE(input_defaults, '{}'),
    '{scheduler}',
    '"DPMSolverMultistep"'
  )
WHERE model_key = 'cjwbw/realistic-vision-v5.1' AND display_name = 'Realistic Vision 5.1';

-- Update SDXL-API model with canonical scheduler values  
UPDATE public.api_models
SET
  capabilities = jsonb_set(
    COALESCE(capabilities, '{}'),
    '{allowed_schedulers}', 
    '["K_EULER_ANCESTRAL", "DPMSolverMultistep", "K_EULER", "DDIM", "HeunDiscrete", "KarrasDPM", "PNDM"]'
  ),
  input_defaults = jsonb_set(
    COALESCE(input_defaults, '{}'),
    '{scheduler}',
    '"K_EULER_ANCESTRAL"' 
  )
WHERE model_key = 'lucataco/sdxl' AND display_name = 'SDXL-API';