-- Seedream Best Practice Prompt Templates for Scene Continuity
-- Based on Seedream model guide recommendations for I2I modifications
-- Execute this in Supabase SQL Editor

-- Scene Iteration templates (for I2I continuation)
INSERT INTO prompt_templates (template_name, content_mode, use_case, system_prompt, job_type, enhancer_model, is_active, description)
VALUES 
  (
    'Scene Iteration - NSFW',
    'nsfw',
    'scene_iteration',
    'Continue the scene with visual continuity. Maintain the same character identity, clothing state, lighting, and environment from the previous scene. Make subtle changes that progress the narrative while preserving visual consistency. Use explicit but tasteful language appropriate for adult content. Always include phrases like "maintain the same character identity", "keep the same lighting and environment", and "subtle change" to ensure continuity.',
    'roleplay',
    'qwen',
    true,
    'Seedream best practice template for I2I scene continuation with NSFW content'
  ),
  (
    'Scene Iteration - SFW',
    'sfw',
    'scene_iteration',
    'Continue the scene with visual continuity. Maintain the same character identity, clothing state, lighting, and environment from the previous scene. Make subtle changes that progress the narrative while preserving visual consistency. Always include phrases like "maintain the same character identity", "keep the same lighting and environment", and "subtle change" to ensure continuity.',
    'roleplay',
    'qwen',
    true,
    'Seedream best practice template for I2I scene continuation with SFW content'
  );

-- Scene Modification templates (for targeted edits)
INSERT INTO prompt_templates (template_name, content_mode, use_case, system_prompt, job_type, enhancer_model, is_active, description)
VALUES 
  (
    'Scene Modification - Clothing',
    'nsfw',
    'scene_modification',
    'Modify clothing state while maintaining the same character identity, pose, lighting, and setting. Use phrases like "maintain the same character identity", "keep the same lighting and environment", and "subtle change" to ensure continuity. For NSFW content, use explicit but tasteful language.',
    'roleplay',
    'qwen',
    true,
    'Seedream best practice template for clothing modifications with NSFW content'
  ),
  (
    'Scene Modification - Position',
    'nsfw',
    'scene_modification',
    'Change character position/pose while maintaining the same character identity, clothing, lighting, and setting. Use phrases like "maintain the same character identity", "keep the same lighting and environment", and "slight adjustment" to ensure continuity.',
    'roleplay',
    'qwen',
    true,
    'Seedream best practice template for position/pose modifications'
  ),
  (
    'Scene Modification - Setting',
    'nsfw',
    'scene_modification',
    'Change scene setting/location while maintaining the same character identity, clothing, and pose. Use phrases like "maintain the same character identity" and "keep the same lighting" to ensure character continuity across location changes.',
    'roleplay',
    'qwen',
    true,
    'Seedream best practice template for setting/location modifications'
  );
