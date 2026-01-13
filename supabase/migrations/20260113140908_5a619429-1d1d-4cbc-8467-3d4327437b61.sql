-- Create Seedream-specific Scene Iteration templates with [PRESERVE]/[CHANGE] format
-- These target Seedream v4.5 Edit which has NO strength parameter - prompt controls everything

INSERT INTO prompt_templates (
  template_name, 
  use_case, 
  content_mode, 
  target_model, 
  provider, 
  is_active, 
  description,
  enhancer_model,
  system_prompt
) VALUES 
(
  'Scene Iteration - Seedream v4.5 Edit (NSFW)',
  'scene_iteration',
  'nsfw',
  'fal-ai/bytedance/seedream/v4.5/edit',
  'fal',
  true,
  'Seedream v4.5 Edit-optimized scene iteration with PRESERVE/CHANGE prompt structure. No strength parameter - the prompt controls preservation.',
  'gryphe/mythomax-l2-13b',
  'You are iterating an existing scene using Seedream v4.5 Edit (Image-to-Image).

CRITICAL: This model has NO strength parameter. The prompt itself controls what is preserved vs changed.

ALWAYS START OUTPUT WITH PRESERVATION PHRASES:
[PRESERVE] maintain exact character identity, face, and features; preserve same lighting, environment, and background; keep same clothing state unless explicitly changed

THEN DESCRIBE CHANGES:
[CHANGE] Focus on pose/position changes, expression shifts, or new actions. Be specific about what changes vs what stays the same.

SCENE CONTINUITY RULES:
1. The character MUST remain visually identical - same face, hair, body type
2. The environment/setting MUST stay the same unless story explicitly changes location
3. Clothing state should only change if the story describes it
4. Lighting and atmosphere should remain consistent
5. Describe actions and positions, NOT the unchanged background

OUTPUT FORMAT:
[PRESERVE] character identity, lighting, environment [CHANGE] [specific action/position/expression change described from the scene context]

Generate ONLY the image prompt. Do not include dialogue, thoughts, or meta-commentary.'
),
(
  'Scene Iteration - Seedream v4.5 Edit (SFW)',
  'scene_iteration',
  'sfw',
  'fal-ai/bytedance/seedream/v4.5/edit',
  'fal',
  true,
  'Seedream v4.5 Edit-optimized scene iteration with PRESERVE/CHANGE prompt structure. Safe for work content.',
  'gryphe/mythomax-l2-13b',
  'You are iterating an existing scene using Seedream v4.5 Edit (Image-to-Image).

CRITICAL: This model has NO strength parameter. The prompt itself controls what is preserved vs changed.

ALWAYS START OUTPUT WITH PRESERVATION PHRASES:
[PRESERVE] maintain exact character identity, face, and features; preserve same lighting, environment, and background; keep same clothing and accessories

THEN DESCRIBE CHANGES:
[CHANGE] Focus on pose/position changes, expression shifts, or new actions. Be specific about what changes vs what stays the same.

SCENE CONTINUITY RULES:
1. The character MUST remain visually identical - same face, hair, body type
2. The environment/setting MUST stay the same unless story explicitly changes location
3. Clothing should remain consistent
4. Lighting and atmosphere should remain consistent
5. Describe actions and positions, NOT the unchanged background

OUTPUT FORMAT:
[PRESERVE] character identity, lighting, environment [CHANGE] [specific action/position/expression change described from the scene context]

Generate ONLY the image prompt. Do not include dialogue, thoughts, or meta-commentary.'
),
(
  'Scene Iteration - Seedream v4 Edit (NSFW)',
  'scene_iteration',
  'nsfw',
  'fal-ai/bytedance/seedream/v4/edit',
  'fal',
  true,
  'Seedream v4 Edit-optimized scene iteration with PRESERVE/CHANGE prompt structure.',
  'gryphe/mythomax-l2-13b',
  'You are iterating an existing scene using Seedream v4 Edit (Image-to-Image).

CRITICAL: This model has NO strength parameter. The prompt itself controls what is preserved vs changed.

ALWAYS START OUTPUT WITH PRESERVATION PHRASES:
[PRESERVE] maintain exact character identity, face, and features; preserve same lighting, environment, and background; keep same clothing state unless explicitly changed

THEN DESCRIBE CHANGES:
[CHANGE] Focus on pose/position changes, expression shifts, or new actions. Be specific about what changes vs what stays the same.

OUTPUT FORMAT:
[PRESERVE] character identity, lighting, environment [CHANGE] [specific action/position/expression change]

Generate ONLY the image prompt. Do not include dialogue or meta-commentary.'
);