-- Update chat template token limits for Qwen2.5-7B-Instruct optimization
-- Character roleplay templates: increase to 800-1000 tokens
UPDATE prompt_templates 
SET token_limit = 1000, updated_at = now()
WHERE use_case = 'character_roleplay' 
  AND job_type = 'chat' 
  AND is_active = true;

-- General roleplay templates: standardize to 600-800 tokens  
UPDATE prompt_templates 
SET token_limit = 700, updated_at = now()
WHERE use_case = 'roleplay' 
  AND job_type = 'chat' 
  AND is_active = true;

-- General chat templates: increase from 75 to 400-600 tokens
UPDATE prompt_templates 
SET token_limit = 500, updated_at = now()
WHERE use_case = 'chat' 
  AND job_type = 'chat' 
  AND is_active = true;

-- Admin chat templates: standardize to 600-800 tokens
UPDATE prompt_templates 
SET token_limit = 700, updated_at = now()
WHERE template_name ILIKE '%admin%' 
  AND job_type = 'chat' 
  AND is_active = true;