-- Update extend model's num_frames limits for longer video extension
-- Current: max=161 (~5.3s), default=121 (~4s) at 30fps
-- New: max=257 (~8.5s), default=241 (~8s) at 30fps
UPDATE api_models
SET capabilities = jsonb_set(capabilities, '{input_schema,num_frames,max}', '257'),
    input_defaults = jsonb_set(input_defaults, '{num_frames}', '241')
WHERE model_key = 'fal-ai/ltx-video-13b-distilled/extend';