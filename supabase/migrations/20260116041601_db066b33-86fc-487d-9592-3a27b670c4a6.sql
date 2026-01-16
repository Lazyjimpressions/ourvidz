-- Set MythoMax as the default roleplay model
UPDATE api_models 
SET is_default = false 
WHERE modality = 'roleplay' AND is_default = true;

UPDATE api_models 
SET is_default = true 
WHERE model_key = 'gryphe/mythomax-l2-13b' AND modality = 'roleplay';