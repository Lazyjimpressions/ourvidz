-- Fix RV5.1 input_defaults to remove empty prompt that was overwriting user prompts
-- This prevents the prompt from being overwritten by the spread operator

UPDATE api_models 
SET input_defaults = input_defaults - 'prompt'
WHERE model_key = 'lucataco/realistic-vision-v5.1';

-- Verify the update
SELECT model_key, input_defaults FROM api_models WHERE model_key = 'lucataco/realistic-vision-v5.1';
