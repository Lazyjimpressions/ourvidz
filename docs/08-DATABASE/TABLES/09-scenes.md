# Table: scenes

**Last Updated:** August 30, 2025  
**Status:** ✅ Active  
**Purpose:** Scene management and organization within projects for storyboard system

**Ownership:** User (via project ownership)  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions
- id (uuid, pk) - Primary key with auto-generated UUID
- project_id (uuid, NOT NULL) - Foreign key to projects table
- scene_number (integer, NOT NULL) - Scene sequence number
- description (text, NOT NULL) - Scene description
- enhanced_prompt (text, nullable) - Enhanced prompt for generation
- image_url (text, nullable) - Generated scene image URL
- approved (boolean, default: false) - Whether scene is approved
- created_at (timestamptz, default: now()) - Creation timestamp
- updated_at (timestamptz, default: now()) - Last update timestamp
- final_stitched_url (text, nullable) - Final stitched video URL
```

## **RLS Policies**
```sql
-- Scenes access policy
CREATE POLICY "Scenes access policy" ON scenes
FOR ALL TO public
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (auth.uid() = (
    SELECT projects.user_id FROM projects WHERE projects.id = scenes.project_id
  ))
);
```

## **Integration Map**
- **Pages/Components**
  - Storyboard System - Scene management and organization
  - Project Editor - Scene editing and approval workflow
  - Video Generation - Scene-to-video processing
- **Edge Functions**
  - queue-job - Scene generation job creation
  - job-callback - Scene generation completion handling
- **Services/Hooks**
  - SceneService - Scene management and operations
  - useScenes - Scene data and operations

## **Business Rules**
- **Project Association**: Each scene must belong to a project (project_id is NOT NULL)
- **Scene Sequencing**: scene_number determines scene order in project
- **Approval Workflow**: Scenes can be approved or pending approval
- **Image Generation**: Scenes can have generated images (image_url)
- **Video Integration**: Scenes can be stitched into final videos (final_stitched_url)
- **Prompt Enhancement**: Enhanced prompts improve generation quality

## **Example Data**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "project_id": "project-uuid-here",
  "scene_number": 1,
  "description": "Sarah discovers an ancient map in an old library",
  "enhanced_prompt": "A young woman with brown hair and green eyes, wearing an explorer's outfit, carefully examining an ancient parchment map spread out on a wooden table in a dimly lit library. Warm golden light streams through stained glass windows, creating an atmosphere of mystery and discovery.",
  "image_url": "https://storage.example.com/scenes/scene_1_discovery.jpg",
  "approved": true,
  "created_at": "2025-08-30T10:00:00Z",
  "updated_at": "2025-08-30T10:00:00Z",
  "final_stitched_url": "https://storage.example.com/videos/project_final.mp4"
}
```

## **Common Queries**
```sql
-- Get all scenes for a project
SELECT * FROM scenes
WHERE project_id = 'project-uuid-here'
ORDER BY scene_number ASC;

-- Get approved scenes for a project
SELECT * FROM scenes
WHERE project_id = 'project-uuid-here' AND approved = true
ORDER BY scene_number ASC;

-- Get scenes with project details
SELECT 
    s.*,
    p.title as project_title,
    p.media_type,
    p.duration
FROM scenes s
JOIN projects p ON s.project_id = p.id
WHERE p.user_id = auth.uid()
ORDER BY p.created_at DESC, s.scene_number ASC;

-- Get scene statistics for a project
SELECT 
    COUNT(*) as total_scenes,
    COUNT(*) FILTER (WHERE approved = true) as approved_scenes,
    COUNT(*) FILTER (WHERE image_url IS NOT NULL) as generated_scenes,
    AVG(scene_number) as avg_scene_number
FROM scenes
WHERE project_id = 'project-uuid-here';

-- Get scenes pending approval
SELECT 
    s.*,
    p.title as project_title
FROM scenes s
JOIN projects p ON s.project_id = p.id
WHERE p.user_id = auth.uid() AND s.approved = false
ORDER BY p.created_at DESC, s.scene_number ASC;

-- Get scenes with generation status
SELECT 
    s.*,
    p.title as project_title,
    CASE 
        WHEN s.image_url IS NOT NULL THEN 'generated'
        WHEN s.enhanced_prompt IS NOT NULL THEN 'prompt_ready'
        ELSE 'pending'
    END as generation_status
FROM scenes s
JOIN projects p ON s.project_id = p.id
WHERE p.user_id = auth.uid()
ORDER BY p.created_at DESC, s.scene_number ASC;

-- Get project completion status
SELECT 
    p.title,
    p.media_type,
    COUNT(s.id) as total_scenes,
    COUNT(s.id) FILTER (WHERE s.approved = true) as approved_scenes,
    COUNT(s.id) FILTER (WHERE s.image_url IS NOT NULL) as generated_scenes,
    ROUND(
        (COUNT(s.id) FILTER (WHERE s.approved = true)::float / COUNT(s.id)) * 100, 2
    ) as completion_percentage
FROM projects p
LEFT JOIN scenes s ON p.id = s.project_id
WHERE p.user_id = auth.uid()
GROUP BY p.id, p.title, p.media_type
ORDER BY p.created_at DESC;
```

## **Indexing Recommendations**
```sql
-- Primary indexes for performance
CREATE INDEX idx_scenes_project_number ON scenes(project_id, scene_number);
CREATE INDEX idx_scenes_project_approved ON scenes(project_id, approved);
CREATE INDEX idx_scenes_created ON scenes(created_at DESC);
CREATE INDEX idx_scenes_updated ON scenes(updated_at DESC);
```

## **Notes**
- **Project Organization**: Scenes organized by project with sequential numbering
- **Approval Workflow**: Scenes go through approval process before final use
- **Image Generation**: Each scene can have AI-generated image
- **Video Integration**: Scenes can be stitched into final video output
- **Prompt Enhancement**: Enhanced prompts improve AI generation quality
- **Sequential Ordering**: scene_number ensures proper scene sequence
- **Project Integration**: Scenes tightly integrated with project management
