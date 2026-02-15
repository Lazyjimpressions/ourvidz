-- Fix LTX models: loras stored as string "[]" instead of real JSON array []
UPDATE api_models 
SET input_defaults = jsonb_set(input_defaults, '{loras}', '[]'::jsonb)
WHERE id IN (
  '0fae432e-d8a1-4d71-a4a2-0276394d2ca8',
  '666c70c8-e35f-4bed-a2cf-5081d088b3e3', 
  '291624c7-acf8-41d5-b2d7-008aeb1c244d'
)
AND jsonb_typeof(input_defaults->'loras') = 'string';