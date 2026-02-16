UPDATE api_models 
SET capabilities = jsonb_set(capabilities, '{input_schema,image_url,required}', 'false')
WHERE model_key = 'fal-ai/ltx-video-13b-distilled';