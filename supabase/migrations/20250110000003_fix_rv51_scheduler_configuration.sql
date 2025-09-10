-- Fix RV5.1 scheduler configuration to match Replicate API requirements
-- This fixes the 422 errors caused by incorrect scheduler validation

UPDATE api_models 
SET capabilities = jsonb_set(
  jsonb_set(
    capabilities, 
    '{allowed_schedulers}', 
    '["EulerA", "MultistepDPM-Solver"]'::jsonb
  ),
  '{scheduler_aliases}',
  '{
    "EulerA": "EulerA", 
    "MultistepDPM-Solver": "MultistepDPM-Solver", 
    "K_EULER_ANCESTRAL": "EulerA", 
    "K_EULER": "EulerA", 
    "K_DPM_2_ANCESTRAL": "MultistepDPM-Solver", 
    "K_DPM_2": "MultistepDPM-Solver", 
    "K_HEUN": "EulerA", 
    "K_LMS": "EulerA", 
    "DDIM": "EulerA", 
    "PLMS": "EulerA"
  }'::jsonb
)
WHERE model_key = 'lucataco/realistic-vision-v5.1';

-- Verify the update
SELECT 
  model_key,
  capabilities->'allowed_schedulers' as allowed_schedulers,
  capabilities->'scheduler_aliases' as scheduler_aliases
FROM api_models 
WHERE model_key = 'lucataco/realistic-vision-v5.1';
