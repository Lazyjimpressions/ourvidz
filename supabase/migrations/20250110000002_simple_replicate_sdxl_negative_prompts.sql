-- Add negative prompts for Replicate SDXL models
-- This adds 4 rows: regular and i2i prompts for both NSFW and SFW content modes
-- Updated to match edge function logic with generation_mode column

-- First, add generation_mode column if it doesn't exist
ALTER TABLE public.negative_prompts 
ADD COLUMN IF NOT EXISTS generation_mode text DEFAULT 'txt2img';

-- Add negative prompts for Replicate SDXL models
INSERT INTO public.negative_prompts (model_type, content_mode, generation_mode, negative_prompt, priority, is_active, description) VALUES

-- Regular Replicate SDXL prompts (minimal for better I2I compatibility)
('replicate-sdxl', 'nsfw', 'txt2img', 'blurry, low quality, worst quality, jpeg artifacts, signature, watermark, text', 1, true, 'Minimal quality control for Replicate SDXL NSFW - optimized for I2I compatibility'),

('replicate-sdxl', 'sfw', 'txt2img', 'blurry, low quality, worst quality, jpeg artifacts, signature, watermark, text, nsfw, explicit, sexual, nude, naked', 1, true, 'Minimal quality control for Replicate SDXL SFW - optimized for I2I compatibility'),

-- I2I-specific Replicate SDXL prompts (very minimal to avoid interference)
('replicate-sdxl', 'nsfw', 'i2i', 'blurry, worst quality, jpeg artifacts', 2, true, 'Minimal I2I prompts for Replicate SDXL NSFW - prevents modification interference'),

('replicate-sdxl', 'sfw', 'i2i', 'blurry, worst quality, jpeg artifacts', 2, true, 'Minimal I2I prompts for Replicate SDXL SFW - prevents modification interference');

-- Fix existing I2I entries that were incorrectly set to txt2img
UPDATE negative_prompts 
SET generation_mode = 'i2i' 
WHERE model_type = 'replicate-sdxl' 
  AND description LIKE '%I2I%' 
  AND priority = 2;
