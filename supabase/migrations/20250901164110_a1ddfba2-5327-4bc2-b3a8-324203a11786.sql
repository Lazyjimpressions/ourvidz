-- Add character portrait specific negative prompt for better quality
INSERT INTO negative_prompts (
  model_type, 
  content_mode, 
  is_active, 
  priority, 
  negative_prompt, 
  description
) VALUES (
  'sdxl',
  'sfw', 
  true,
  4,
  'worst quality, low quality, blurry, deformed, disfigured, distorted face, bad anatomy, bad proportions, malformed limbs, extra fingers, missing fingers, duplicate, cropped, out of frame, mutation, ugly, disgusting',
  'Character portrait quality enhancement - prevents common generation artifacts and ensures good anatomy'
)
ON CONFLICT DO NOTHING;