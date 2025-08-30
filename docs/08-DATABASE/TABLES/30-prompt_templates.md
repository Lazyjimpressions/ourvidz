# Table: prompt_templates

**Last Updated:** August 30, 2025  
**Status:** ✅ Active  
**Purpose:** Source of truth for all system prompts used by enhancement, chat, roleplay, and scene generation

**Ownership:** Admin/Operators  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions
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
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "template_name": "SDXL Enhancement - High Quality",
  "enhancer_model": "qwen_instruct",
  "target_model": "sdxl",
  "job_type": "image",
  "use_case": "enhancement",
  "content_mode": "sfw",
  "system_prompt": "You are an expert prompt engineer. Enhance the following prompt to create a stunning, high-quality image. Focus on visual details, lighting, composition, and artistic quality. Make it more descriptive and engaging while maintaining the original intent.",
  "token_limit": 2000,
  "is_active": true,
  "version": 1,
  "metadata": {
    "category": "enhancement",
    "quality_level": "high",
    "specialized_for": "landscape_photography"
  },
  "created_at": "2025-08-30T10:00:00Z",
  "updated_at": "2025-08-30T10:00:00Z"
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
