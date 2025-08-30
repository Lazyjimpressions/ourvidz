# Table: scenes

**Last Updated**: 8/24/25

Purpose: Scene definitions and metadata

Ownership: User

## Schema (key columns)
- id (uuid, pk) - Primary key with auto-generated UUID
- project_id (uuid, NOT NULL) - Foreign key to projects table
- scene_number (integer, NOT NULL) - Sequential scene number within project
- description (text, NOT NULL) - Scene description/prompt
- enhanced_prompt (text, nullable) - Enhanced/processed scene prompt
- image_url (text, nullable) - Generated scene image URL
- approved (boolean, default: false) - Scene approval status
- created_at/updated_at (timestamptz, default: now()) - Timestamps
- final_stitched_url (text, nullable) - Final stitched video URL

## Integration Map
- Pages/Components
  - [List relevant pages/components]
- Edge Functions
  - [List relevant edge functions]
- Services/Hooks
  - [List relevant services/hooks]

## Business Rules
- **Project Relationship**: Every scene must belong to a project (project_id is NOT NULL)
- **Scene Numbering**: scene_number provides sequential ordering within a project
- **Description Required**: Scene description is mandatory for generation
- **Approval Workflow**: Scenes start as unapproved (approved = false)
- **Enhanced Prompts**: Original descriptions can be enhanced for better generation
- **Final Output**: final_stitched_url for completed video scenes

## Example Queries
- Get all scenes for a project
```sql
SELECT id, scene_number, description, approved, image_url
FROM scenes 
WHERE project_id = 'project-uuid-here'
ORDER BY scene_number;
```

- Get unapproved scenes
```sql
SELECT s.id, s.scene_number, s.description, p.title as project_title
FROM scenes s
JOIN projects p ON s.project_id = p.id
WHERE s.approved = false
ORDER BY p.title, s.scene_number;
```

- Get scenes with enhanced prompts
```sql
SELECT id, scene_number, description, enhanced_prompt
FROM scenes 
WHERE enhanced_prompt IS NOT NULL
ORDER BY project_id, scene_number;
```

- Get scene statistics by project
```sql
SELECT 
    project_id,
    COUNT(*) as total_scenes,
    COUNT(CASE WHEN approved = true THEN 1 END) as approved_scenes,
    COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END) as generated_scenes
FROM scenes 
GROUP BY project_id
ORDER BY total_scenes DESC;
```

## Notes
- **Multi-Scene Projects**: Projects can have multiple scenes for complex content
- **Approval Workflow**: Scenes go through approval process before final generation
- **Prompt Enhancement**: Scene descriptions can be enhanced for better AI generation
- **Image Generation**: Each scene can have its own generated image
- **Video Stitching**: final_stitched_url for combining scenes into final video
- **Sequential Ordering**: scene_number ensures proper scene sequence in projects
