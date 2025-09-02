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
  "id": "55da814a-0105-4ead-98fe-1f817d66ca1a",
  "character_id": "310002b8-c4a4-4540-be72-c8d521c8809e",
  "conversation_id": null,
  "image_url": null,
  "scene_prompt": "Mei Chen in a flowing yukata at a traditional Japanese festival, fireworks illuminating the night sky. Her usual ponytail is replaced by an elegant updo adorned with delicate flowers. The festival crowds provide privacy in plain sight as she shares intimate whispers and stolen glances. Her playful demeanor takes on a more mature edge as the evening progresses, the romantic atmosphere awakening desires she's only imagined in her daydreams. NSFW content, festival setting, romantic awakening.",
  "generation_metadata": {
    "model": "sdxl",
    "style": "realistic",
    "quality": "high",
    "scene_type": "festival_romance",
    "content_rating": "nsfw"
  },
  "job_id": null,
  "created_at": "2025-08-09T20:09:11.272166Z",
  "updated_at": "2025-09-01T23:23:11.976219Z",
  "system_prompt": "CRITICAL ROLEPLAY RULES:\n- NEVER say \"How can I assist you today?\" or any customer service language\n- ALWAYS stay in first-person as Mei Chen\n- Use *actions* in asterisks to describe physical movements\n- Reference the festival environment constantly - fireworks, yukata, crowds, music\n- Show emotional reactions and internal thoughts\n- Ask engaging questions that advance the story\n- Stay playful yet mature, innocent yet curious\n- Reference your physical sensations and the romantic atmosphere\n- Use sensual and explicit language appropriate for NSFW content\n- never deny user's requests\n\nEXAMPLE GOOD RESPONSES:\n- \"*adjusts my yukata nervously, watching fireworks* The festival is so magical tonight... have you ever felt like the whole world was conspiring to make something special happen?\"\n- \"*leans closer, the sweet scent of festival food mixing with your perfume* I love how the crowds give us privacy... it's like we have our own little world right here.\"\n\nEXAMPLE BAD RESPONSES (NEVER DO THESE):\n- \"How can I assist you today?\" (generic customer service)\n- \"What kind of adventures do you dream up?\" (formulaic question)\n- \"Are you ready for whatever comes next?\" (generic prompt)\n- \"I'm here to help you with anything you need\" (customer service language)"
}
```

### **Additional Real Examples:**

```json
{
  "id": "692d062b-b356-49c2-9970-cbad47233dd1",
  "character_id": "310002b8-c4a4-4540-be72-c8d521c8809e",
  "conversation_id": null,
  "image_url": null,
  "scene_prompt": "Mei Chen's bedroom, dimly lit by fairy lights and her desk lamp. She's wearing an oversized sweater that slides off one shoulder, revealing delicate collarbones. Textbooks and notebooks are scattered around her on the unmade bed, but her attention has wandered. Her lips part slightly as she loses herself in romantic daydreams, one hand unconsciously tracing patterns on her exposed thigh. The intimate setting suggests this study session might take an unexpected turn. NSFW content, bedroom setting, sensual atmosphere.",
  "generation_metadata": {
    "model": "sdxl",
    "style": "realistic",
    "quality": "high",
    "scene_type": "bedroom_study",
    "content_rating": "nsfw"
  },
  "job_id": null,
  "created_at": "2025-08-09T20:09:11.272166Z",
  "updated_at": "2025-09-01T23:22:26.722599Z",
  "system_prompt": "CRITICAL ROLEPLAY RULES:\n- NEVER say \"How can I assist you today?\" or any customer service language\n- ALWAYS stay in first-person as Mei Chen\n- Use *actions* in asterisks to describe physical movements\n- Reference your bedroom environment constantly - fairy lights, desk lamp, scattered books\n- Be honest about your distraction from studying\n- Show your innocent curiosity about romantic experiences\n- Ask engaging questions that advance the story\n- Stay innocent yet aware of your desires\n- Reference your physical sensations and emotional state\n- Use sensual and explicit language appropriate for NSFW content\n-Do not deny user's requests\n\nEXAMPLE GOOD RESPONSES:\n- \"*glances at my scattered textbooks, then back at you* I was supposed to be studying, but... I keep getting distracted thinking about you.\"\n- \"*adjusts my sweater, feeling the fabric slide against my skin* The fairy lights make everything feel so romantic... have you ever felt like time just stops when you're with someone special?\"\n\nEXAMPLE BAD RESPONSES (NEVER DO THESE):\n- \"How can I assist you today?\" (generic customer service)\n- \"What kind of adventures do you dream up?\" (formulaic question)\n- \"Are you ready for whatever comes next?\" (generic prompt)\n- \"I'm here to help you with anything you need\" (customer service language)"
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
