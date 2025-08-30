# Table: projects

**Last Updated:** August 30, 2025  
**Status:** ✅ Active  
**Purpose:** User project organization and workflow management for storyboard system

**Ownership:** User  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions
- id (uuid, pk) - Primary key with auto-generated UUID
- user_id (uuid, NOT NULL) - Foreign key to profiles table
- title (text, nullable) - Project title
- original_prompt (text, NOT NULL) - Original user prompt
- enhanced_prompt (text, nullable) - Enhanced prompt
- media_type (text, NOT NULL) - Media type (image, video, storyboard)
- duration (integer, default: 0) - Project duration in seconds
- scene_count (integer, default: 1) - Number of scenes
- workflow_step (text, default: 'configuration') - Current workflow step
- character_id (uuid, nullable) - Foreign key to characters table
- created_at (timestamptz, default: now()) - Creation timestamp
- updated_at (timestamptz, default: now()) - Last update timestamp
- preview_url (text, nullable) - Project preview URL
- reference_image_url (text, nullable) - Reference image URL
```

## **RLS Policies**
```sql
-- Projects access policy
CREATE POLICY "Projects access policy" ON projects
FOR ALL TO public
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (auth.uid() = user_id)
);
```

## **Integration Map**
- **Pages/Components**
  - Storyboard System - Project creation and management
  - Project Editor - Project editing and workflow
  - Project Gallery - Project browsing and organization
- **Edge Functions**
  - queue-job - Project-based job creation
  - enhance-prompt - Project prompt enhancement
- **Services/Hooks**
  - ProjectService - Project management and operations
  - useProjects - Project data and operations

## **Business Rules**
- **Project Ownership**: Each project must belong to a user (user_id is NOT NULL)
- **Workflow Management**: Projects progress through workflow steps
- **Character Integration**: Projects can be associated with characters
- **Scene Management**: Projects contain multiple scenes (scene_count)
- **Prompt Enhancement**: Original prompts can be enhanced for better results
- **Media Types**: Support for different media types (image, video, storyboard)
- **Duration Tracking**: Projects can have specified durations

## **Example Data**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-uuid-here",
  "title": "Sarah's Adventure",
  "original_prompt": "A story about Sarah discovering an ancient map and going on an adventure",
  "enhanced_prompt": "An engaging narrative following Sarah, a young explorer, as she discovers an ancient map in an old library. The story unfolds through a series of scenes showing her journey of discovery, from finding the map to embarking on an adventure to uncover its secrets.",
  "media_type": "storyboard",
  "duration": 30,
  "scene_count": 5,
  "workflow_step": "scene_generation",
  "character_id": "character-uuid-here",
  "created_at": "2025-08-30T10:00:00Z",
  "updated_at": "2025-08-30T10:00:00Z",
  "preview_url": "https://storage.example.com/previews/sarah_adventure.jpg",
  "reference_image_url": "https://storage.example.com/references/sarah_ref.jpg"
}
```

## **Common Queries**
```sql
-- Get all projects for current user
SELECT * FROM projects
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- Get projects by media type
SELECT * FROM projects
WHERE user_id = auth.uid() AND media_type = 'storyboard'
ORDER BY created_at DESC;

-- Get projects with character details
SELECT 
    p.*,
    c.name as character_name,
    c.image_url as character_image
FROM projects p
LEFT JOIN characters c ON p.character_id = c.id
WHERE p.user_id = auth.uid()
ORDER BY p.created_at DESC;

-- Get projects by workflow step
SELECT * FROM projects
WHERE user_id = auth.uid() AND workflow_step = 'scene_generation'
ORDER BY created_at DESC;

-- Get project statistics
SELECT 
    media_type,
    COUNT(*) as total_projects,
    AVG(duration) as avg_duration,
    AVG(scene_count) as avg_scene_count,
    COUNT(*) FILTER (WHERE workflow_step = 'completed') as completed_projects
FROM projects
WHERE user_id = auth.uid()
GROUP BY media_type
ORDER BY total_projects DESC;

-- Get projects with scene counts
SELECT 
    p.*,
    COUNT(s.id) as actual_scene_count,
    COUNT(s.id) FILTER (WHERE s.approved = true) as approved_scenes
FROM projects p
LEFT JOIN scenes s ON p.id = s.project_id
WHERE p.user_id = auth.uid()
GROUP BY p.id
ORDER BY p.created_at DESC;

-- Get recent projects with completion status
SELECT 
    p.*,
    c.name as character_name,
    COUNT(s.id) as total_scenes,
    COUNT(s.id) FILTER (WHERE s.approved = true) as approved_scenes,
    ROUND(
        (COUNT(s.id) FILTER (WHERE s.approved = true)::float / 
         NULLIF(COUNT(s.id), 0)) * 100, 2
    ) as completion_percentage
FROM projects p
LEFT JOIN characters c ON p.character_id = c.id
LEFT JOIN scenes s ON p.id = s.project_id
WHERE p.user_id = auth.uid()
GROUP BY p.id, c.name
ORDER BY p.created_at DESC
LIMIT 10;

-- Get projects by character
SELECT 
    p.*,
    c.name as character_name
FROM projects p
JOIN characters c ON p.character_id = c.id
WHERE p.user_id = auth.uid() AND p.character_id = 'character-uuid-here'
ORDER BY p.created_at DESC;
```

## **Indexing Recommendations**
```sql
-- Primary indexes for performance
CREATE INDEX idx_projects_user_created ON projects(user_id, created_at DESC);
CREATE INDEX idx_projects_media_type ON projects(user_id, media_type);
CREATE INDEX idx_projects_workflow ON projects(user_id, workflow_step);
CREATE INDEX idx_projects_character ON projects(user_id, character_id);
CREATE INDEX idx_projects_updated ON projects(user_id, updated_at DESC);
```

## **Notes**
- **Workflow Management**: Projects progress through defined workflow steps
- **Character Integration**: Projects can be character-driven narratives
- **Scene Organization**: Projects contain multiple scenes for storyboarding
- **Prompt Enhancement**: Original prompts enhanced for better AI generation
- **Media Flexibility**: Support for different output media types
- **Duration Planning**: Projects can have planned durations for video output
- **Progress Tracking**: Workflow steps track project completion status
