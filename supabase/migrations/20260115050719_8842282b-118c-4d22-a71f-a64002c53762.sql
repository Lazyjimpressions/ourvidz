-- Update the default roleplay model to use a working model
UPDATE api_models 
SET 
  model_key = 'cognitivecomputations/dolphin3.0-r1-mistral-24b:free',
  display_name = 'Dolphin 3.0 R1 Mistral 24B (Free)',
  updated_at = now()
WHERE id = '902f0d62-2d68-4d47-a642-b9f02ddc3b01';