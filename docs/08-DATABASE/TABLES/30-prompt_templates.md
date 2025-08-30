# Table: prompt_templates

Purpose: Source of truth for all system prompts used by enhancement, chat, roleplay, and scene generation.

Ownership: Admin/Operators. Changes require cache refresh.

## Schema (key columns)
- id (uuid, pk)
- template_name (text)
- enhancer_model (text) – e.g., qwen_instruct, qwen_base
- target_model (text|null) – e.g., sdxl, wan
- job_type (text|null) – e.g., image, video, chat
- use_case (text) – e.g., enhancement, chat, roleplay, character_roleplay, scene_generation
- content_mode (text) – sfw | nsfw
- system_prompt (text)
- token_limit (int)
- is_active (bool)
- version (int)
- metadata (jsonb)
- created_at/updated_at

## Integration Map
- Pages/Components
  - None directly; selected server-side.
- Edge Functions
  - enhance-prompt: selects by (target_model, enhancer_model, job_type='image'|'video', use_case='enhancement', content_mode)
  - playground-chat: selects chat/roleplay templates (context: general/roleplay/character_roleplay/admin; tier: sfw/nsfw)
- Services/Hooks
  - Cache via system_config (templateCache.chat / enhancement)

## Selection Algorithm
1) Exact match on 5-tuple: (target_model, enhancer_model, job_type, use_case, content_mode)
2) Fallback 1 (enhancer): try alternate enhancer_model (qwen_instruct ↔ qwen_base)
3) Fallback 2 (content): swap content_mode (sfw ↔ nsfw)
4) If still missing, return null → caller handles safe defaults

## Variable Placeholders (roleplay templates)
- `{{character_name}}`, `{{character_description}}`, `{{character_personality}}`, `{{character_background}}`
- `{{character_speaking_style}}`, `{{character_goals}}`, `{{character_quirks}}`, `{{character_relationships}}`
- `{{voice_tone}}`, `{{mood}}`, `{{character_visual_description}}`, `{{scene_context}}`

Validation: Keep placeholders consistent; edge functions perform substitution. Avoid introducing unused variables.

## Example Queries
- List active templates
```sql
select id, template_name, use_case, content_mode, token_limit
from prompt_templates
where is_active = true
order by updated_at desc nulls last, template_name;
```

- Fetch enhancement template (SDXL NSFW, instruct)
```sql
select * from prompt_templates
where target_model = 'sdxl'
  and enhancer_model = 'qwen_instruct'
  and job_type = 'image'
  and use_case = 'enhancement'
  and content_mode = 'nsfw'
  and is_active = true
order by created_at desc
limit 1;
```

## Rollout Notes
- After updates, refresh cache (see system_config_cache.md). Ensure token_limit aligns with worker/model constraints.
