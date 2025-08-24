# Table: negative_prompts

**Last Updated**: 8/24/25

Purpose: Negative prompt configurations for content generation

Ownership: Admin

## Schema (key columns)
- id (uuid, pk) - Primary key with auto-generated UUID
- model_type (varchar, NOT NULL, default: 'sdxl') - Target model type
- content_mode (varchar, NOT NULL, default: 'nsfw') - Content mode (sfw/nsfw)
- negative_prompt (text, NOT NULL) - Negative prompt text
- is_active (boolean, default: true) - Whether prompt is active
- priority (integer, default: 1) - Selection priority
- created_at/updated_at (timestamptz, default: now()) - Timestamps
- created_by (uuid, nullable) - Admin who created the prompt
- description (text, nullable) - Prompt description/notes

## Integration Map
- Pages/Components
  - [List relevant pages/components]
- Edge Functions
  - [List relevant edge functions]
- Services/Hooks
  - [List relevant services/hooks]

## Business Rules
- **Model Targeting**: Prompts are specific to model types (sdxl, wan, etc.)
- **Content Mode**: Prompts are categorized by content mode (sfw/nsfw)
- **Active Status**: Only active prompts (is_active = true) are used
- **Priority System**: Higher priority prompts are selected first
- **Admin Creation**: Prompts are created by admin users
- **Prompt Required**: Negative prompt text is mandatory

## Example Queries
- Get active negative prompts for SDXL NSFW
```sql
SELECT id, negative_prompt, priority, description
FROM negative_prompts 
WHERE model_type = 'sdxl' 
  AND content_mode = 'nsfw' 
  AND is_active = true
ORDER BY priority DESC;
```

- Get prompts by model type
```sql
SELECT model_type, content_mode, COUNT(*) as prompt_count
FROM negative_prompts 
WHERE is_active = true
GROUP BY model_type, content_mode
ORDER BY model_type, content_mode;
```

- Get high priority prompts
```sql
SELECT id, model_type, content_mode, negative_prompt, priority
FROM negative_prompts 
WHERE priority > 5 
  AND is_active = true
ORDER BY priority DESC;
```

- Get prompts created by specific admin
```sql
SELECT id, model_type, content_mode, negative_prompt, created_at
FROM negative_prompts 
WHERE created_by = 'admin-uuid-here'
ORDER BY created_at DESC;
```

## Notes
- **Content Safety**: Negative prompts help ensure appropriate content generation
- **Model Specificity**: Different models may require different negative prompts
- **Priority Selection**: System selects prompts based on priority and model/content mode
- **Admin Management**: Only admins can create and manage negative prompts
- **Content Mode**: SFW/NSFW categorization for appropriate prompt selection
- **Prompt Reuse**: Prompts can be reused across different generation requests
