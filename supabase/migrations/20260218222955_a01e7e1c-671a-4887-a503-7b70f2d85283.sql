UPDATE api_models 
SET default_for_tasks = array_append(default_for_tasks, 'vision')
WHERE id = '82e0b6e3-0a64-4396-9d5b-24d609c24b77'
  AND NOT ('vision' = ANY(default_for_tasks));