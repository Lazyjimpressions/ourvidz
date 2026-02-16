
UPDATE api_models
SET 
  capabilities = jsonb_set(
    jsonb_set(
      capabilities,
      '{input_schema,num_frames,max}',
      '161'
    ),
    '{input_schema,num_frames,default}',
    '121'
  ),
  input_defaults = jsonb_set(input_defaults, '{num_frames}', '121')
WHERE model_key = 'fal-ai/ltx-video-13b-distilled/extend';
