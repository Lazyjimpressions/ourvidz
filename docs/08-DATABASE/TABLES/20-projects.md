# Table: projects

**Last Updated**: 8/24/25

Purpose: Project definitions and metadata

Ownership: User

## Schema (key columns)
- id (uuid, pk) - Primary key with auto-generated UUID
- user_id (uuid, NOT NULL) - Foreign key to profiles table
- title (text, nullable) - Project title/name
- original_prompt (text, NOT NULL) - Initial user prompt
- enhanced_prompt (text, nullable) - Enhanced/processed prompt
- media_type (text, NOT NULL) - Type of media (image, video)
- duration (integer, default: 0) - Duration in seconds (for videos)
- scene_count (integer, default: 1) - Number of scenes in project
- workflow_step (text, default: 'configuration') - Current workflow stage
- character_id (uuid, nullable) - Associated character (for roleplay)
- created_at/updated_at (timestamptz, default: now()) - Timestamps
- preview_url (text, nullable) - Preview image/video URL
- reference_image_url (text, nullable) - Reference image for generation

## Integration Map
- Pages/Components
  - [List relevant pages/components]
- Edge Functions
  - [List relevant edge functions]
- Services/Hooks
  - [List relevant services/hooks]

## Business Rules
- **User Ownership**: Every project must belong to a user (user_id is NOT NULL)
- **Prompt Required**: Original prompt is mandatory for project creation
- **Workflow Steps**: Projects progress through different workflow stages
- **Character Integration**: Projects can be associated with characters for roleplay
- **Media Types**: Supports both image and video projects
- **Scene Management**: Projects can have multiple scenes (scene_count)

## Example Queries
- Get all projects for a user
```sql
SELECT id, title, media_type, workflow_step, created_at
FROM projects 
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC;
```

- Get projects by workflow step
```sql
SELECT id, title, media_type, scene_count
FROM projects 
WHERE workflow_step = 'configuration'
ORDER BY created_at DESC;
```

- Get projects with characters
```sql
SELECT p.id, p.title, p.media_type, c.name as character_name
FROM projects p
LEFT JOIN characters c ON p.character_id = c.id
WHERE p.user_id = 'user-uuid-here'
ORDER BY p.created_at DESC;
```

- Get video projects with duration
```sql
SELECT id, title, duration, scene_count
FROM projects 
WHERE media_type = 'video' 
  AND duration > 0
ORDER BY duration DESC;
```

## Notes
- **Workflow Management**: Projects follow a defined workflow from configuration to completion
- **Prompt Enhancement**: Original prompts can be enhanced for better generation results
- **Character Integration**: Projects can be tied to characters for roleplay scenarios
- **Scene Support**: Multi-scene projects are supported for complex content
- **Preview System**: Projects can have preview images/videos for quick identification
- **Reference Images**: Reference images help guide content generation
