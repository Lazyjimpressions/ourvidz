UPDATE api_models 
SET capabilities = jsonb_set(
  capabilities, 
  '{allowed_schedulers}', 
  '["default", "Euler flux Karras", "Euler flux simple", "Euler flux exponential", "Euler flux beta"]'
)
WHERE id = '2ce3731c-95a6-4325-96f2-9608eb61fbd1';