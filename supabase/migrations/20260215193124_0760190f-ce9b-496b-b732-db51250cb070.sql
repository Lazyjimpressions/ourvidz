-- Fix LTX multi model: images and videos stored as string "[]" instead of real JSON array []
UPDATE api_models 
SET input_defaults = jsonb_set(
  jsonb_set(input_defaults, '{images}', '[]'::jsonb),
  '{videos}', '[]'::jsonb
)
WHERE id = '0fae432e-d8a1-4d71-a4a2-0276394d2ca8';