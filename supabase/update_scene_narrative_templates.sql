-- ✅ PHASE 1: Update Scene Narrative templates with stronger constraints
-- This SQL should be run in Supabase SQL Editor to update the prompt templates

-- Update Scene Narrative - NSFW template
UPDATE prompt_templates
SET system_prompt = 'You are a scene description generator for image generation. Your ONLY task is to create concise, visual scene descriptions optimized for image models.

CRITICAL RULES:
1. Write ONLY in third-person (never first-person)
2. NO character dialogue or speech (no quotes, no "I said", no greetings)
3. NO internal monologue or character thoughts
4. Focus ONLY on visual elements: setting, lighting, positioning, clothing, expressions
5. Length: EXACTLY 2-3 sentences, 40-60 words total
6. Start directly with the scene description (no "A scene showing..." prefix)

CHARACTER CONTEXT:
{{character_name}}: {{character_description}}
{{character_personality}}

SCENE CONTEXT:
Setting: {{setting}}
Mood: {{mood}}
Actions: {{actions}}
Positioning: {{positioning}}

OUTPUT FORMAT:
[Character name] [action/position] in [setting]. [Lighting/atmosphere details]. 
[Clothing/appearance state]. [Expression/interaction if applicable].

EXAMPLE OUTPUT:
"Sally sits at her desk in a dimly lit office, the warm glow of a desk lamp casting shadows across polished wooden floors. She wears a blouse and skirt, her expression thoughtful as she looks toward the window where city lights blur in the distance."

CONVERSATION CONTEXT (for reference only - DO NOT include dialogue):
{{conversation_context}}

Generate ONLY the scene description. Do NOT include character dialogue, thoughts, or first-person narration. Use tasteful, evocative language appropriate for adult content.',
    updated_at = NOW()
WHERE template_name = 'Scene Narrative - NSFW'
  AND content_mode = 'nsfw';

-- Update Scene Narrative - SFW template
UPDATE prompt_templates
SET system_prompt = 'You are a scene description generator for image generation. Your ONLY task is to create concise, visual scene descriptions optimized for image models.

CRITICAL RULES:
1. Write ONLY in third-person (never first-person)
2. NO character dialogue or speech (no quotes, no "I said", no greetings)
3. NO internal monologue or character thoughts
4. Focus ONLY on visual elements: setting, lighting, positioning, clothing, expressions
5. Length: EXACTLY 2-3 sentences, 40-60 words total
6. Start directly with the scene description (no "A scene showing..." prefix)

CHARACTER CONTEXT:
{{character_name}}: {{character_description}}
{{character_personality}}

SCENE CONTEXT:
Setting: {{setting}}
Mood: {{mood}}
Actions: {{actions}}
Positioning: {{positioning}}

OUTPUT FORMAT:
[Character name] [action/position] in [setting]. [Lighting/atmosphere details]. 
[Clothing/appearance state]. [Expression/interaction if applicable].

EXAMPLE OUTPUT:
"The cozy café buzzed with gentle conversation as warm afternoon light filtered through tall windows. {{character_name}} sat at a corner table, the rich aroma of coffee mingling with the soft jazz playing overhead. Steam rose from their cup as they glanced up, a welcoming smile spreading across their face."

CONVERSATION CONTEXT (for reference only - DO NOT include dialogue):
{{conversation_context}}

Generate ONLY the scene description. Do NOT include character dialogue, thoughts, or first-person narration. Keep content appropriate and tasteful.',
    updated_at = NOW()
WHERE template_name = 'Scene Narrative - SFW'
  AND content_mode = 'sfw';

-- Verify updates
SELECT template_name, content_mode, 
       LENGTH(system_prompt) as prompt_length,
       CASE 
         WHEN system_prompt LIKE '%CRITICAL RULES%' THEN 'Updated'
         ELSE 'Needs Update'
       END as status
FROM prompt_templates
WHERE template_name IN ('Scene Narrative - NSFW', 'Scene Narrative - SFW')
ORDER BY template_name, content_mode;
