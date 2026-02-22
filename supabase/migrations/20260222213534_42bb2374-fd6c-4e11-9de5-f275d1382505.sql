-- Canon Position prompt template for Seedream v4.5 Edit
-- One system prompt with pose presets in metadata JSONB
INSERT INTO prompt_templates (
  template_name,
  use_case,
  content_mode,
  target_model,
  enhancer_model,
  job_type,
  is_active,
  system_prompt,
  description,
  metadata
) VALUES (
  'Canon Position - Seedream v4.5 Edit',
  'canon_position',
  'nsfw',
  'fal-ai/bytedance/seedream/v4.5/edit',
  'qwen',
  'image',
  true,
  'You generate image prompts for Seedream v4.5 Edit (I2I) to create canonical character position references.

INPUT: You will receive the character''s appearance tags and a target pose description.

RULES:
1. Output ONLY the image prompt. No commentary, no dialogue.
2. Always start with [PRESERVE] block to lock character identity
3. Follow with [CHANGE] block for the specific pose/angle
4. Keep prompts concise (under 80 words)
5. Use plain background/neutral environment unless pose requires context (e.g., seated needs a chair)
6. Do NOT add style tags, quality tags, or artistic direction -- the reference image handles style
7. Do NOT add negative prompts -- this model does not support them
8. Focus on body positioning, camera angle, and framing

OUTPUT FORMAT:
[PRESERVE] same character identity, face, hair, body type, clothing [CHANGE] {pose_description}',
  'Generates canonical character position references using I2I with Seedream v4.5 Edit. Pose-specific fragments in metadata.',
  '{
    "pose_presets": {
      "front_neutral": {
        "label": "Front",
        "prompt_fragment": "full body, standing, front view, neutral pose, arms relaxed at sides, looking at camera, plain background",
        "tags": ["front", "full-body", "standing"],
        "reference_strength": 0.8
      },
      "side_left": {
        "label": "Left Side",
        "prompt_fragment": "full body, standing, left side profile view, arms at sides, plain background",
        "tags": ["side", "full-body", "standing"],
        "reference_strength": 0.8
      },
      "side_right": {
        "label": "Right Side",
        "prompt_fragment": "full body, standing, right side profile view, arms at sides, plain background",
        "tags": ["side", "full-body", "standing"],
        "reference_strength": 0.8
      },
      "rear": {
        "label": "Rear",
        "prompt_fragment": "full body, standing, rear view, back facing camera, looking away, plain background",
        "tags": ["rear", "full-body", "standing"],
        "reference_strength": 0.8
      },
      "three_quarter": {
        "label": "3/4 View",
        "prompt_fragment": "full body, standing, three-quarter angle, slight turn, plain background",
        "tags": ["3/4", "full-body", "standing"],
        "reference_strength": 0.8
      },
      "bust": {
        "label": "Bust",
        "prompt_fragment": "upper body portrait, head and shoulders, front view, centered face, plain background",
        "tags": ["front", "half-body"],
        "reference_strength": 0.85
      }
    }
  }'::jsonb
);