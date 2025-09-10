-- Update jobs table constraint to allow replicate-sdxl model types
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_model_type_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_model_type_check 
CHECK (model_type IN ('sdxl', 'wan', 'rv51', 'flux', 'replicate-sdxl', 'replicate-sdxl-i2i'));

-- Add generation_mode column to negative_prompts for i2i-specific handling
ALTER TABLE negative_prompts ADD COLUMN IF NOT EXISTS generation_mode text DEFAULT 'txt2img';
ALTER TABLE negative_prompts ADD CONSTRAINT negative_prompts_generation_mode_check 
CHECK (generation_mode IN ('txt2img', 'i2i'));

-- Create index for efficient negative prompt lookups
CREATE INDEX IF NOT EXISTS idx_negative_prompts_lookup 
ON negative_prompts(model_type, content_mode, generation_mode, is_active, priority);