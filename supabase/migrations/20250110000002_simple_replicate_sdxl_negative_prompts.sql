-- Add negative prompts for Replicate SDXL models
-- This adds 4 rows: regular and i2i prompts for both NSFW and SFW content modes

INSERT INTO public.negative_prompts (model_type, content_mode, negative_prompt, priority, is_active, description) VALUES

-- Regular Replicate SDXL prompts (minimal for better I2I compatibility)
('replicate-sdxl', 'nsfw', 'blurry, low quality, worst quality, jpeg artifacts, signature, watermark, text', 1, true, 'Minimal quality control for Replicate SDXL NSFW - optimized for I2I compatibility'),

('replicate-sdxl', 'sfw', 'blurry, low quality, worst quality, jpeg artifacts, signature, watermark, text, nsfw, explicit, sexual, nude, naked', 1, true, 'Minimal quality control for Replicate SDXL SFW - optimized for I2I compatibility'),

-- I2I-specific Replicate SDXL prompts (very minimal to avoid interference)
('replicate-sdxl', 'nsfw', 'blurry, worst quality, jpeg artifacts', 2, true, 'Minimal I2I prompts for Replicate SDXL NSFW - prevents modification interference'),

('replicate-sdxl', 'sfw', 'blurry, worst quality, jpeg artifacts', 2, true, 'Minimal I2I prompts for Replicate SDXL SFW - prevents modification interference');
