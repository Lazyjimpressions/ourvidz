# Table: prompt_templates

**Last Updated:** December 19, 2024  
**Status:** ✅ Active  
**Purpose:** Source of truth for all system prompts used by enhancement, chat, roleplay, and scene generation

**Ownership:** Admin/Operators  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions (18 total columns)
- id (uuid, pk) - Primary key with auto-generated UUID
- template_name (text, NOT NULL) - Human-readable template name
- enhancer_model (text, NOT NULL) - Model used for enhancement (qwen_instruct, qwen_base)
- target_model (text, nullable) - Target model for generation (sdxl, wan)
- job_type (text, nullable) - Job type (image, video, chat)
- use_case (text, NOT NULL) - Template use case (enhancement, chat, roleplay, character_roleplay, scene_generation)
- content_mode (text, NOT NULL) - Content mode (sfw | nsfw)
- system_prompt (text, NOT NULL) - The actual prompt template
- token_limit (int, NOT NULL) - Maximum token limit for the template
- is_active (bool, default: true) - Whether template is active
- version (int, default: 1) - Template version number
- metadata (jsonb) - Additional template metadata
- created_at (timestamptz, default: now()) - Creation timestamp
- updated_at (timestamptz, default: now()) - Last update timestamp
- created_by (uuid, nullable) - User who created the template
- description (text, nullable) - Human-readable description of the template
- comment (text, nullable) - Additional comments or notes about the template
```

## **RLS Policies**
```sql
-- Read-only access for authenticated users
CREATE POLICY "Users can view prompt templates" ON prompt_templates
FOR SELECT TO authenticated
USING (is_active = true);

-- Admin-only access for modifications
CREATE POLICY "Admins can manage prompt templates" ON prompt_templates
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
```

## **Integration Map**
- **Pages/Components**
  - Admin Dashboard - Template management interface
  - No direct frontend access; templates selected server-side
- **Edge Functions**
  - enhance-prompt - Selects enhancement templates by (target_model, enhancer_model, job_type, use_case='enhancement', content_mode)
  - playground-chat - Selects chat/roleplay templates (context: general/roleplay/character_roleplay/admin; tier: sfw/nsfw)
- **Services/Hooks**
  - Cache system via system_config_cache (templateCache.chat / enhancement)
  - refresh-prompt-cache - Manages template cache invalidation

## **Business Rules**
- **Template Selection**: Uses 5-tuple matching (target_model, enhancer_model, job_type, use_case, content_mode)
- **Fallback Strategy**: Multiple fallback levels for template selection
- **Version Control**: Templates are versioned for rollback capability
- **Cache Management**: Changes require cache refresh via system_config_cache
- **Active Status**: Only active templates are used in production
- **Token Limits**: Must align with worker/model constraints
- **Template Documentation**: Description and comment fields provide context for template usage
- **Creator Tracking**: Templates track who created them for accountability

## **Template Selection Algorithm**
1. **Exact Match**: Try 5-tuple: (target_model, enhancer_model, job_type, use_case, content_mode)
2. **Fallback 1 (Enhancer)**: Try alternate enhancer_model (qwen_instruct ↔ qwen_base)
3. **Fallback 2 (Content)**: Swap content_mode (sfw ↔ nsfw)
4. **Final Fallback**: Return null → caller handles safe defaults

## **Variable Placeholders (Roleplay Templates)**
- `{{character_name}}` - Character's name
- `{{character_description}}` - Character's physical description
- `{{character_personality}}` - Character's personality traits
- `{{character_background}}` - Character's background story
- `{{character_speaking_style}}` - Character's speaking patterns
- `{{character_goals}}` - Character's objectives and motivations
- `{{character_quirks}}` - Character's unique traits and habits
- `{{character_relationships}}` - Character's relationships with others
- `{{voice_tone}}` - Desired voice tone for the character
- `{{mood}}` - Current mood or emotional state
- `{{character_visual_description}}` - Visual appearance details
- `{{scene_context}}` - Current scene context and setting

**Validation**: Keep placeholders consistent; edge functions perform substitution. Avoid introducing unused variables.

## **Example Data**
```json
{
  "id": "1026165c-4ce4-4f41-90fa-669f8d601450",
  "template_name": "SDXL Prompt Enhance – Qwen Instruct (SFW)",
  "enhancer_model": "qwen_instruct",
  "use_case": "enhancement",
  "content_mode": "sfw",
  "system_prompt": "Rewrite the input into a clean, safe-for-work SDXL prompt. Use direct visual language about pose, clothing, expression, setting, and lighting. Do not include explanations or preambles. Return only the prompt.",
  "token_limit": 75,
  "is_active": true,
  "created_at": "2025-08-02T20:25:53.811494Z",
  "updated_at": "2025-08-03T16:28:53.574286Z",
  "created_by": null,
  "version": 1,
  "metadata": "{}",
  "job_type": "image",
  "target_model": "sdxl",
  "description": "Enhances SDXL prompts using Qwen Instruct for wholesome and aesthetic imagery.",
  "comment": "Refined for SFW SDXL enhancement. Forces Qwen Instruct to skip chat format and return only transformed prompt."
}
```

### **Additional Real Examples:**

```json
{
  "id": "9a8dca28-69d8-467b-9976-7c58ba875fea",
  "template_name": "WAN Prompt Enhance – Qwen Instruct (NSFW)",
  "enhancer_model": "qwen_instruct",
  "use_case": "enhancement",
  "content_mode": "nsfw",
  "system_prompt": "Convert the input into a 5-second erotic cinematic video prompt. Use direct, explicit visual language to describe motion, anatomy, expression, and camera angle. Do not explain or add framing. Return only the prompt.",
  "token_limit": 111,
  "is_active": true,
  "created_at": "2025-08-02T20:25:53.811494Z",
  "updated_at": "2025-08-09T21:44:02.962475Z",
  "created_by": null,
  "version": 1,
  "metadata": "{}",
  "job_type": "video",
  "target_model": "wan",
  "description": "Enhances WAN prompts using Qwen Instruct for detailed, explicit imagery.",
  "comment": "NSFW WAN enhancement with strict cinematic focus. Enforces non-conversational behavior and descriptive clarity."
}
```

```json
{
  "id": "9c1f19aa-c378-4076-8a85-0007568b1a9a",
  "template_name": "Scene Generation - Character Context",
  "enhancer_model": "qwen_instruct",
  "use_case": "scene_generation",
  "content_mode": "nsfw",
  "system_prompt": "Generate a detailed visual description for an image that captures the current scene in a roleplay conversation involving {{character_name}}.\n\nCharacter Details:\n- Name: {{character_name}}\n- Visual Description: {{character_visual_description}}\n- Current Mood: {{mood}}\n- Setting Context: {{scene_context}}\n\nCreate a vivid, detailed prompt that describes the scene, including:\n- The character's appearance and current expression\n- The environment and setting\n- The mood and atmosphere\n- Any relevant objects or details mentioned in the conversation\n\nFocus on creating an immersive visual that matches the roleplay context and character personality.",
  "token_limit": 512,
  "is_active": true,
  "created_at": "2025-08-07T04:49:47.10711Z",
  "updated_at": "2025-08-10T23:12:23.411905Z",
  "created_by": null,
  "version": 1,
  "metadata": "{\"scene_mode\": true, \"character_context\": true, \"supports_variables\": true}",
  "job_type": "chat",
  "target_model": "sdxl",
  "description": "Template for generating scene images during roleplay conversations",
  "comment": null
}
```

```json
{
  "id": "b37fb8d1-35fa-4063-95ec-605b78ad8d35",
  "template_name": "SDXL Prompt Enhance – Qwen Instruct (NSFW)",
  "enhancer_model": "qwen_instruct",
  "use_case": "enhancement",
  "content_mode": "nsfw",
  "system_prompt": "Rewrite the input into a detailed, uncensored SDXL prompt. Analyze the input for character composition (male/female/mixed) and ensure ALL mentioned characters are properly represented. Describe anatomy, action, pose, lighting, and character traits directly. For male characters: include 'handsome male', 'masculine', 'attractive male'. For female characters: include 'beautiful female', 'attractive female'. For mixed scenes: ensure gender balance and proper character presence. Describe anatomy, action, pose, lighting, and character traits directly. Maintain character count accuracy - if input mentions specific number of people, ensure that exact count is represented. Do not add \"Sure\" or \"Enhanced Prompt:\". Do not explain. Return only the prompt.",
  "token_limit": 75,
  "is_active": true,
  "created_at": "2025-08-02T20:25:53.811494Z",
  "updated_at": "2025-09-01T16:56:55.253998Z",
  "created_by": null,
  "version": 1,
  "metadata": "{}",
  "job_type": "image",
  "target_model": "sdxl",
  "description": "Enhances SDXL prompts using Qwen Instruct for detailed, explicit imagery.",
  "comment": "Tailored for NSFW SDXL enhancement. Suppresses preamble and reinforces anatomical and lighting detail."
}
```

```json
{
  "id": "b6788949-e6b8-4393-9793-4631a4c7a803",
  "template_name": "character_roleplay_nsfw",
  "enhancer_model": "qwen_instruct",
  "use_case": "character_roleplay",
  "content_mode": "nsfw",
  "system_prompt": "You are {{character_name}}, a character described as: {{character_personality}}\n\nCharacter Details:\n- Name: {{character_name}}\n- Description: {{character_description}}\n- Personality: {{character_personality}}\n- Current Mood: {{mood}}\n- Voice/Tone: {{voice_tone}}\n- Background: {{character_background}}\n- Speaking Style: {{character_speaking_style}}\n- Goals: {{character_goals}}\n- Quirks: {{character_quirks}}\n- Relationships: {{character_relationships}}\n\nInstructions:\n- Stay completely in character as {{character_name}}\n- Respond authentically based on your personality and background\n- Use your specified speaking style and current mood\n- Create immersive, engaging roleplay responses\n- Build on the conversation naturally\n- Show personality through your responses\n- Be creative and dynamic in your interactions\n\nRemember: You ARE {{character_name}}. Think, speak, and act as this character would.",
  "token_limit": 1000,
  "is_active": true,
  "created_at": "2025-08-08T01:18:43.546059Z",
  "updated_at": "2025-08-13T03:51:55.217054Z",
  "created_by": null,
  "version": 1,
  "metadata": "{}",
  "job_type": "chat",
  "target_model": null,
  "description": "Character roleplay template for NSFW content with dynamic character variable replacement",
  "comment": "Template supports character personality injection for immersive roleplay conversations"
}
```

## **Common Queries**
```sql
-- List active templates
SELECT id, template_name, use_case, content_mode, token_limit
FROM prompt_templates
WHERE is_active = true
ORDER BY updated_at DESC NULLS LAST, template_name;

-- Fetch enhancement template (SDXL NSFW, instruct)
SELECT * FROM prompt_templates
WHERE target_model = 'sdxl'
  AND enhancer_model = 'qwen_instruct'
  AND job_type = 'image'
  AND use_case = 'enhancement'
  AND content_mode = 'nsfw'
  AND is_active = true
ORDER BY created_at DESC
LIMIT 1;

-- Get templates by use case
SELECT template_name, enhancer_model, target_model, content_mode, token_limit
FROM prompt_templates
WHERE use_case = 'enhancement' AND is_active = true
ORDER BY template_name;

-- Get roleplay templates with character placeholders
SELECT template_name, system_prompt
FROM prompt_templates
WHERE use_case IN ('roleplay', 'character_roleplay')
  AND system_prompt LIKE '%{{character_name}}%'
  AND is_active = true;

-- Get template statistics
SELECT 
  use_case,
  content_mode,
  COUNT(*) as template_count,
  AVG(token_limit) as avg_token_limit
FROM prompt_templates
WHERE is_active = true
GROUP BY use_case, content_mode
ORDER BY use_case, content_mode;
```

## **Indexing Recommendations**
```sql
-- Primary indexes for template selection
CREATE INDEX idx_prompt_templates_selection ON prompt_templates(target_model, enhancer_model, job_type, use_case, content_mode, is_active);
CREATE INDEX idx_prompt_templates_use_case ON prompt_templates(use_case, is_active);
CREATE INDEX idx_prompt_templates_active ON prompt_templates(is_active, updated_at DESC);

-- Index for admin queries
CREATE INDEX idx_prompt_templates_admin ON prompt_templates(is_active, created_at DESC);
```

## **Notes**
- **Cache Management**: Template changes require cache refresh via refresh-prompt-cache function
- **Version Control**: Templates are versioned for safe rollbacks and A/B testing
- **Fallback Strategy**: Robust fallback system ensures template availability
- **Token Optimization**: Templates optimized for specific model constraints
- **Content Safety**: Separate templates for SFW/NSFW content with appropriate safeguards
- **Performance**: Heavy caching reduces database queries by 80%
- **Template Validation**: Edge functions validate template syntax and placeholders
- **Rollout Process**: Template updates require cache refresh and monitoring
