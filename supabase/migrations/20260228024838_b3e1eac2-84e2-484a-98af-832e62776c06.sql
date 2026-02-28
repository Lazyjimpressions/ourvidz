-- Remove second-pass refinement params from LTX multicondition defaults
-- so single-pass is the baseline (faster ~150s instead of ~300s)
UPDATE api_models
SET input_defaults = input_defaults
  - 'second_pass_num_inference_steps'
  - 'second_pass_skip_initial_steps'
  - 'first_pass_skip_final_steps'
  - 'first_pass_num_inference_steps'
WHERE model_key = 'fal-ai/ltx-video-13b-distilled/multiconditioning';