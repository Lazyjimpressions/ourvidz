UPDATE api_models
SET capabilities = jsonb_set(capabilities, '{safety_checker_param}', '"enable_safety_checker"')
WHERE model_key LIKE 'fal-ai/flux-2%'
  AND (capabilities->>'safety_checker_param') IS NULL;