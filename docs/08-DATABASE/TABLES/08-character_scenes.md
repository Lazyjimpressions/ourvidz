# Table: character_scenes

**Last Updated:** December 19, 2024  
**Status:** ✅ Active  
**Purpose:** Character-scene associations and scene generation for storyboard system

**Ownership:** User (via character ownership)  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions (10 total columns)
- id (uuid, pk) - Primary key with auto-generated UUID
- character_id (uuid, nullable) - Foreign key to characters table
- conversation_id (uuid, nullable) - Foreign key to conversations table
- image_url (text, nullable) - Generated scene image URL
- scene_prompt (text, NOT NULL) - Scene description/prompt
- generation_metadata (jsonb, nullable, default: '{}') - Generation parameters and metadata
- job_id (uuid, nullable) - Foreign key to jobs table
- created_at (timestamptz, default: now()) - Creation timestamp
- updated_at (timestamptz, default: now()) - Last update timestamp
- system_prompt (text, nullable) - System prompt for scene generation
```

## **RLS Policies**
```sql
-- Users can view their own character scenes only
CREATE POLICY "Users can view their own character scenes only" ON character_scenes
FOR SELECT TO public
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (character_id IN (
    SELECT characters.id FROM characters WHERE characters.user_id = auth.uid()
  ))
);

-- Users can create character scenes
CREATE POLICY "Users can create character scenes" ON character_scenes
FOR INSERT TO public
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (character_id IN (
    SELECT characters.id FROM characters WHERE characters.user_id = auth.uid()
  ))
);

-- Users can update character scenes
CREATE POLICY "Users can update character scenes" ON character_scenes
FOR UPDATE TO public
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (character_id IN (
    SELECT characters.id FROM characters WHERE characters.user_id = auth.uid()
  ))
);

-- Users can delete character scenes
CREATE POLICY "Users can delete character scenes" ON character_scenes
FOR DELETE TO public
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (character_id IN (
    SELECT characters.id FROM characters WHERE characters.user_id = auth.uid()
  ))
);
```

## **Integration Map**
- **Pages/Components**
  - Storyboard System - Character scene generation and management
  - Character Gallery - Character scene display
  - Scene Generation - AI-powered scene creation
- **Edge Functions**
  - queue-job - Scene generation job creation
  - job-callback - Scene generation completion handling
- **Services/Hooks**
  - SceneService - Scene generation and management
  - useCharacterScenes - Character scene operations

## **Business Rules**
- **Character Ownership**: Users can only manage scenes for their own characters
- **Scene Generation**: Scenes are generated through AI jobs (job_id)
- **Metadata Preservation**: Generation parameters stored as JSONB
- **Conversation Integration**: Scenes can be linked to conversations
- **Image Storage**: Generated scene images stored in cloud storage
- **Prompt Management**: Scene prompts guide AI generation
- **System Prompts**: System prompts provide additional generation context and instructions

## **Example Data**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "character_id": "character-uuid-here",
  "conversation_id": "conversation-uuid-here",
  "image_url": "https://storage.example.com/scenes/sarah_adventure.jpg",
  "scene_prompt": "Sarah standing on a mountain peak at sunset, looking out over a vast landscape with golden light",
  "generation_metadata": {
    "model_used": "sdxl",
    "prompt": "Sarah standing on a mountain peak at sunset, looking out over a vast landscape with golden light",
    "negative_prompt": "blurry, low quality, distorted",
    "seed": 12345,
    "guidance_scale": 7.5,
    "steps": 50,
    "width": 1024,
    "height": 1024,
    "enhancement_strategy": "qwen_compel"
  },
  "job_id": "job-uuid-here",
  "created_at": "2025-08-30T10:00:00Z",
  "updated_at": "2025-08-30T10:00:00Z"
}
```

## **Common Queries**
```sql
-- Get character scenes for a specific character
SELECT cs.*, c.name as character_name
FROM character_scenes cs
JOIN characters c ON cs.character_id = c.id
WHERE c.user_id = auth.uid() AND cs.character_id = 'character-uuid-here'
ORDER BY cs.created_at DESC;

-- Get scenes from a conversation
SELECT cs.*, ch.name as character_name
FROM character_scenes cs
JOIN characters ch ON cs.character_id = ch.id
JOIN conversations conv ON cs.conversation_id = conv.id
WHERE conv.user_id = auth.uid() AND cs.conversation_id = 'conversation-uuid-here'
ORDER BY cs.created_at ASC;

-- Get recent character scenes
SELECT 
    cs.*,
    ch.name as character_name,
    ch.image_url as character_image
FROM character_scenes cs
JOIN characters ch ON cs.character_id = ch.id
WHERE ch.user_id = auth.uid()
ORDER BY cs.created_at DESC
LIMIT 20;

-- Get scene generation statistics
SELECT 
    ch.name as character_name,
    COUNT(cs.id) as total_scenes,
    COUNT(cs.id) FILTER (WHERE cs.image_url IS NOT NULL) as completed_scenes,
    AVG(LENGTH(cs.scene_prompt)) as avg_prompt_length
FROM character_scenes cs
JOIN characters ch ON cs.character_id = ch.id
WHERE ch.user_id = auth.uid()
GROUP BY ch.id, ch.name
ORDER BY total_scenes DESC;

-- Get scenes by generation status
SELECT 
    cs.*,
    ch.name as character_name,
    j.status as job_status
FROM character_scenes cs
JOIN characters ch ON cs.character_id = ch.id
LEFT JOIN jobs j ON cs.job_id = j.id
WHERE ch.user_id = auth.uid()
ORDER BY cs.created_at DESC;

-- Get scenes with job details
SELECT 
    cs.*,
    ch.name as character_name,
    j.status as job_status,
    j.error_message as job_error
FROM character_scenes cs
JOIN characters ch ON cs.character_id = ch.id
LEFT JOIN jobs j ON cs.job_id = j.id
WHERE ch.user_id = auth.uid() AND j.status = 'failed'
ORDER BY cs.created_at DESC;
```

## **Indexing Recommendations**
```sql
-- Primary indexes for performance
CREATE INDEX idx_character_scenes_character ON character_scenes(character_id, created_at DESC);
CREATE INDEX idx_character_scenes_conversation ON character_scenes(conversation_id, created_at ASC);
CREATE INDEX idx_character_scenes_job ON character_scenes(job_id);
CREATE INDEX idx_character_scenes_created ON character_scenes(created_at DESC);
```

## **Notes**
- **Character Integration**: Links characters to specific scenes and contexts
- **Conversation Context**: Scenes can be generated from conversation context
- **Job Tracking**: Generation jobs tracked for status monitoring
- **Metadata Storage**: Complete generation context preserved for reproducibility
- **Image Management**: Generated images stored with organized URLs
- **Prompt Engineering**: Scene prompts guide AI generation for character consistency
- **Performance**: Optimized for character-specific scene queries
