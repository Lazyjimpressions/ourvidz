# Dynamic Prompting System

**Last Updated:** January 3, 2026
**Architecture:** Pure Inference Engine - No Worker Overrides
**Status:** ✅ PRODUCTION - Database-driven templates with enhanced logging

## Overview

The Dynamic Prompting System uses 12 specialized, database-driven templates for AI interactions. This system has been **completely overhauled** to implement a **Pure Inference Engine** architecture, eliminating template override risks and providing comprehensive logging.

### 🎯 NEW ARCHITECTURE: Pure Inference Engine

**Key Changes (August 4, 2025):**
- **Removed hardcoded prompts** from chat worker
- **New pure inference endpoints** (`/chat`, `/enhance`, `/generate`)
- **Enhanced logging** throughout the enhancement pipeline
- **Template override risk eliminated** through pure inference architecture
- **Security improvements** with edge function control over all prompts

**Security Implications:**
- Workers can no longer override database templates
- All prompt construction happens in edge functions
- Complete audit trail of prompt enhancement process

## Key Features

- **Database-Driven Templates:** 12 specialized templates with version control
- **Pure Inference:** Worker executes exactly what edge functions provide - no overrides
- **Enhanced Logging:** Comprehensive logging of prompt enhancement process
- **Content Mode Detection:** Automatic SFW/NSFW detection and routing
- **Fallback System:** Multiple levels of fallback for reliability
- **Token Optimization:** Model-specific token limit enforcement
- **Performance Monitoring:** Real-time execution time and cache hit tracking

## Template Reference

### Active Templates (from Supabase prompt_templates)

- Enhancement (SDXL/WAN)
  - SDXL Enhance (SFW/NSFW): `qwen_instruct` and `qwen_base`, token_limit 75
  - WAN Enhance (SFW/NSFW): `qwen_instruct` and `qwen_base`, token_limit 100
- Chat (general)
  - Chat Assistant (SFW): `qwen_instruct`, token_limit 400
  - Chat Assistant (NSFW): `qwen_instruct`, token_limit 600
- Roleplay
  - Character Roleplay (SFW): `qwen_instruct`, token_limit 300, supports variables like `{{character_name}}`, `{{character_personality}}`
  - Character Roleplay (NSFW): `qwen_instruct`, token_limit 300, same variable set
  - Roleplay Fantasy (NSFW long-form): `qwen_instruct`, token_limit 1000
- Scene Generation (Roleplay → Image)
  - Scene Generation - Character Context: `qwen_instruct` → SDXL, token_limit 512, supports variables: `{{character_name}}`, `{{mood}}`, `{{character_visual_description}}`, `{{scene_context}}`

**Template Selection Notes:**
- Templates are selected by edge functions using: `(target_model, enhancer_model, job_type, use_case, content_mode)` with fallbacks.
- The `target_model` field in `prompt_templates` matches `api_models.model_key` for model-specific templates (e.g., `cognitivecomputations/dolphin-mistral-24b-venice-edition:free`).
- Universal templates have `target_model IS NULL` and are used as fallback when no model-specific template exists.
- Template selection priority: Model-specific template → Universal template → Hardcoded fallback.
- Character roleplay templates support variable substitution (performed server-side) and are cached per character to avoid repeated processing.
- For third-party API models (OpenRouter, fal.ai, Replicate), templates are selected based on the model key from `api_models` table.

## Model-to-Template Mapping

The relationship between `api_models` and `prompt_templates` enables model-specific prompt customization while maintaining fallback reliability.

### Database Relationship

```
api_models.model_key → prompt_templates.target_model
```

When a user selects a model from the UI, the system:
1. Looks up the model in `api_models` table by `model_key` or `id`
2. Uses the `model_key` to find a matching template in `prompt_templates` where `target_model = model_key`
3. Falls back to universal template (`target_model IS NULL`) if no model-specific template exists

### Template Lookup Flow

```typescript
// Example from roleplay-chat edge function
async function getModelSpecificTemplate(supabase: any, modelKey: string, contentTier: string) {
  const { data, error } = await supabase
    .from('prompt_templates')
    .select('*')
    .eq('target_model', modelKey)  // Match api_models.model_key
    .eq('use_case', 'character_roleplay')
    .eq('content_mode', contentTier)
    .eq('is_active', true)
    .single();
  
  if (error || !data) {
    return null; // Fallback to universal template
  }
  return data;
}
```

### Fallback Chain

1. **Model-Specific Template**: `target_model = api_models.model_key` (exact match)
2. **Universal Template**: `target_model IS NULL` (works for all models of that use_case)
3. **Hardcoded Fallback**: Emergency fallback in edge function code

### Example SQL Queries

```sql
-- Find model-specific template for OpenRouter Dolphin model
SELECT * FROM prompt_templates
WHERE target_model = 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free'
  AND use_case = 'character_roleplay'
  AND content_mode = 'nsfw'
  AND is_active = true;

-- Find universal template (fallback)
SELECT * FROM prompt_templates
WHERE target_model IS NULL
  AND use_case = 'character_roleplay'
  AND content_mode = 'nsfw'
  AND is_active = true
ORDER BY version DESC
LIMIT 1;

-- List all model-specific templates
SELECT 
  pt.template_name,
  pt.target_model,
  am.display_name as model_display_name,
  am.provider_id,
  ap.name as provider_name
FROM prompt_templates pt
LEFT JOIN api_models am ON pt.target_model = am.model_key
LEFT JOIN api_providers ap ON am.provider_id = ap.id
WHERE pt.target_model IS NOT NULL
  AND pt.is_active = true
ORDER BY ap.name, am.display_name;
```

### Template Selection for Different Providers

- **OpenRouter Models**: Templates matched by full model key (e.g., `cognitivecomputations/dolphin-mistral-24b-venice-edition:free`)
- **fal.ai Models**: Templates matched by model key (e.g., `fal-ai/bytedance/seedream/v4/text-to-image`)
- **Replicate Models**: Templates matched by model key or model family (e.g., `replicate-sdxl`)
- **Local Models**: Templates matched by model family (e.g., `qwen`, `sdxl`, `wan`)

## Technical Implementation

### Enhanced Logging System

The `enhance-prompt` edge function now includes comprehensive logging:

```typescript
// Request logging with prompt preview
console.log('🎯 Dynamic enhance prompt request:', {
  prompt: prompt.length > 100 ? prompt.substring(0, 100) + '...' : prompt,
  jobType,
  format,
  quality,
  selectedModel,
  promptLength: prompt.length
});

// Template selection logging
console.log('🚀 Enhancing with template:', {
  template: template.template_name || 'unnamed_template',
  enhancerModel: template.enhancer_model,
  modelType: template.model_type,
  selectedModel,
  workerType,
  contentMode
});

// Pure inference payload logging
console.log('💬 Chat worker payload (pure inference):', {
  messagesCount: messages.length,
  systemPromptLength: template.system_prompt.length,
  userPromptLength: request.prompt.length,
  maxTokens: payload.max_tokens,
  templateName: template.template_name || 'unnamed'
});

// Enhanced prompt result logging
console.log('🎯 ENHANCED PROMPT GENERATED:', {
  originalPrompt: prompt.length > 200 ? prompt.substring(0, 200) + '...' : prompt,
  enhancedPrompt: enhancementResult.enhanced_prompt,
  templateUsed: enhancementResult.template_name,
  strategy: enhancementResult.strategy
});
```

### Pure Inference Engine Integration

**Edge Function Responsibility:**
- Fetch database templates
- Construct complete `messages` array
- Send to worker for pure inference
- Handle all prompt logic

**Worker Responsibility:**
- Execute exactly what's provided
- No prompt modification
- Return enhanced result

```typescript
// Build messages array using database template - THIS IS THE KEY FIX
const messages = [
  {
    role: "system",
    content: template.system_prompt
  },
  {
    role: "user", 
    content: request.prompt
  }
];

// Send to pure inference endpoint
const response = await fetch(`${chatWorkerUrl}/enhance`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: messages,
    max_tokens: template.token_limit || 200,
    temperature: 0.7,
    top_p: 0.9
  })
});
```

### Data Flow Security

```
[Database Template] → [Edge Function] → [Pure Inference Worker] → [Enhanced Result]
       ↓                      ↓                      ↓                    ↓
   System Prompt      Messages Array         Execute Only         Return Result
   User Prompt        No Overrides           No Modifications     No Template Logic
```

### Third-Party API Integration

The prompting system integrates with three third-party API providers, each handled by dedicated edge functions:

**Provider Architecture:**

| Provider | Modality | Edge Function | Models |
|----------|----------|--------------|--------|
| **OpenRouter** | Chat/Roleplay | `roleplay-chat` | Dolphin Mistral variants, other uncensored LLMs |
| **fal.ai** | Images + Videos | `fal-image` | Seedream v4/v4.5, WAN 2.1 I2V |
| **Replicate** | Images | `replicate-image` | RV5.1, SDXL variants |

**Routing Logic by Modality:**

1. **Chat/Roleplay Routing:**
   - User selects model → Check if local (`chat_worker` or `qwen-local`)
   - If local: Health check → Use local worker if healthy, else fallback to OpenRouter
   - If API model: Lookup in `api_models` → Get model config → Route via `roleplay-chat` to OpenRouter
   - Template selection: Model-specific template (by `target_model` matching `api_models.model_key`) or universal template

2. **Image Generation Routing:**
   - User selects model → Check if local SDXL
   - If local: Health check → Use local worker via `queue-job`
   - If API model: Lookup in `api_models` → Get provider
     - If `replicate`: Route to `replicate-image` edge function
     - If `fal`: Route to `fal-image` edge function
   - Template and negative prompts fetched based on model type and content mode

3. **Video Generation Routing:**
   - User selects model → Check if local WAN
   - If local: Health check → Use local worker via `queue-job`
   - If fal.ai WAN 2.1 I2V: Route to `fal-image` edge function
   - Video-specific templates used for prompt enhancement

**Model-to-Template Mapping:**

Templates are selected using the `target_model` field in `prompt_templates` table, which matches `api_models.model_key`:

```sql
-- Example: Find model-specific template for OpenRouter Dolphin model
SELECT * FROM prompt_templates
WHERE target_model = 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free'
  AND use_case = 'character_roleplay'
  AND content_mode = 'nsfw'
  AND is_active = true;
```

If no model-specific template is found, the system falls back to universal templates (where `target_model IS NULL`).

**Edge Function Responsibilities:**

- **`roleplay-chat`**: Handles all chat/roleplay requests, routes to OpenRouter or local worker based on model selection and health status
- **`fal-image`**: Handles fal.ai image and video generation, supports Seedream models and WAN 2.1 I2V
- **`replicate-image`**: Handles Replicate image generation, supports RV5.1 and SDXL models
- **`character-suggestions`**: Uses OpenRouter for AI-generated character suggestions
- **`enhance-prompt`**: Used by all providers for prompt enhancement before generation

## Performance

### Token Optimization

- Template-driven token limits (from DB) are respected end-to-end.
- Typical limits: SDXL enhancement 75; WAN enhancement 100; Chat (SFW 400 / NSFW 600); Character roleplay 300; Scene generation 512; Long-form roleplay up to 1000.
- Automatic compression/shortening should be applied in edge functions when the combined message context risks exceeding worker/model limits.

### Caching Strategy

1. **Database Template** (Primary)
2. **System Cache** (Fallback)
3. **Hardcoded Templates** (Emergency)

### Monitoring Metrics

- **Execution Time:** Real-time performance tracking
- **Cache Hit Rate:** Template retrieval efficiency
- **Fallback Level:** System reliability indicator
- **Token Count:** Optimization effectiveness
- **Worker Response Time:** Pure inference performance

## Admin Management

### Template Management

```sql
-- View active templates
SELECT * FROM prompt_templates WHERE is_active = true ORDER BY version DESC;

-- Update template
UPDATE prompt_templates 
SET system_prompt = 'New system prompt', version = version + 1 
WHERE template_name = 'enhancement_sdxl_sfw';

-- Deactivate template
UPDATE prompt_templates SET is_active = false WHERE template_name = 'old_template';
```

### Log Analysis

```sql
-- Monitor enhancement performance
SELECT 
  template_name,
  AVG(execution_time_ms) as avg_time,
  COUNT(*) as usage_count,
  AVG(fallback_level) as avg_fallback
FROM enhancement_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY template_name;
```

## Integration Points

### Edge Functions

**Chat/Roleplay:**
- **`roleplay-chat`**: Primary chat/roleplay edge function. Routes between local Qwen worker and OpenRouter API based on model selection and health status. Uses `callModelWithConfig()` to handle OpenRouter models with database-driven configuration. Template selection via `getModelSpecificTemplate()` queries by `modelKey` (from `api_models.model_key`) and `contentTier`. Supports character variable substitution and scene context integration.

- **`character-suggestions`**: Uses OpenRouter for AI-generated character suggestions. Fetches model config from `api_models` table and calls OpenRouter API with database-driven parameters.

**Image/Video Generation:**
- **`fal-image`**: Handles fal.ai image and video generation. Supports Seedream v4/v4.5 (images) and WAN 2.1 I2V (video). Fetches model configuration from `api_models` table, validates character limits (8,000-12,000 for Seedream, 1,000-2,000 for video), and routes to fal.ai API. Supports I2I with reference images and workspace video generation.

- **`replicate-image`**: Handles Replicate image generation. Supports RV5.1 and SDXL models. Requires explicit `apiModelId` from `api_models` table. Fetches negative prompts from `negative_prompts` table by `model_type`, `content_mode`, and `generation_mode`. Validates CLIP token limits (77 tokens hard limit).

**Prompt Enhancement:**
- **`enhance-prompt`**: Prompt enhancement used by all providers (SDXL/WAN/Replicate/fal.ai). Fetches template by criteria `(target_model, enhancer_model, job_type, use_case, content_mode)`, builds `messages` array, and calls worker `/enhance` with pure inference payload. Supports SFW/NSFW content detection and automatic template selection.

**Job Management:**
- **`queue-job`**: Job creation and routing. Selects enhancement templates and attaches template context to jobs for downstream processing. Routes to appropriate edge function based on provider (`replicate-image`, `fal-image`, or local workers).

### Worker System

**Chat Worker:** Pure inference engine
- Endpoints: `/chat`, `/enhance`
- Model: Qwen Instruct
- Capability: Executes provided `messages` only; no internal templates

**WAN Worker:** Legacy format maintained
- Endpoint: `/generate`
- Model: Qwen Base
- Capability: Video generation with enhanced prompts from edge functions

### Frontend Integration

Page-to-Template Mapping
- `src/pages/RoleplayDashboard.tsx`: navigates to `RoleplayChat` with `?character=<id>`; no prompting.
- `src/pages/RoleplayChat.tsx`: creates `roleplay` conversations and invokes `playground-chat` with optional `character_id`. Edge selects `character_roleplay_{sfw|nsfw}` templates, injects character variables, and calls worker `/chat`. Inline scene generation uses the Scene Generation template to produce SDXL prompts.
- `src/pages/Playground.tsx` + `components/playground/ChatInterface.tsx`: supports `general`, `roleplay`, `admin`, `creative` conversation types → mapped to chat templates (`chat_*`, `roleplay`, `character_roleplay`, `admin`). SFW/NSFW determined by content-tier detection.
- `src/pages/SimplifiedWorkspace.tsx`: calls `enhance-prompt` for SDXL/WAN prior to queueing jobs. Generation routes to library; workspace consumes via events.

Example enhancement request
```typescript
const res = await fetch('/functions/v1/enhance-prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: userPrompt,
    jobType: 'sdxl_image',
    quality: 'high',
    selectedModel: 'qwen_instruct'
  })
});
const result = await res.json();
```

## Negative Prompt Integration

The `negative_prompts` table provides model-specific negative prompt templates for image generation, ensuring quality and content safety across different providers.

### Database Structure

Negative prompts are stored in the `negative_prompts` table with the following key fields:
- `model_type`: Model family identifier (e.g., `sdxl`, `replicate-sdxl`, `fal-ai`, `rv51`)
- `content_mode`: Content tier (`sfw` or `nsfw`)
- `generation_mode`: Generation type (`txt2img` or `i2i`)
- `negative_prompt`: The actual negative prompt text
- `priority`: Priority level for selection (higher priority selected first)
- `is_active`: Whether the prompt is currently active

### Usage in Edge Functions

**Replicate Image Generation (`replicate-image`):**
```typescript
// Fetch negative prompts by model type, content mode, and generation mode
const { data: negativePrompts } = await supabase
  .from('negative_prompts')
  .select('negative_prompt')
  .eq('model_type', 'sdxl')  // or 'replicate-sdxl', 'rv51'
  .eq('content_mode', contentMode)  // 'sfw' or 'nsfw'
  .eq('generation_mode', generationMode)  // 'txt2img' or 'i2i'
  .eq('is_active', true)
  .order('priority', { ascending: false });

// Combine multiple negative prompts
const baseNegativePrompt = negativePrompts
  .map(np => np.negative_prompt)
  .join(', ');
```

**Local SDXL Worker (`queue-job`):**
- Fetches negative prompts for `model_type = 'sdxl'`
- Supports both `txt2img` and `i2i` generation modes
- I2I mode uses minimal negative prompts (3 terms) to prevent modification interference

**fal.ai Integration:**
- fal.ai models may handle negative prompts differently
- Some models (Seedream) support negative prompts via API
- WAN 2.1 I2V uses model-specific negative prompt handling
- Check `api_models.capabilities` for negative prompt support per model

### Generation Mode Optimization

**Txt2Img Mode:**
- Full negative prompts (7-12 terms) for quality control
- Examples: `blurry, worst quality, jpeg artifacts, distorted, deformed, bad anatomy, bad proportions`

**I2I Mode:**
- Minimal negative prompts (3 terms) to prevent modification interference
- Examples: `blurry, worst quality, jpeg artifacts`
- Prevents over-modification of reference images

### Model Type Mapping

| Model Type | Provider | Models |
|------------|----------|--------|
| `sdxl` | Local | SDXL Lustify worker |
| `replicate-sdxl` | Replicate | SDXL variants via Replicate |
| `rv51` | Replicate | Realistic Vision 5.1 |
| `fal-ai` | fal.ai | Seedream, WAN (if supported) |

### Example SQL Queries

```sql
-- Get negative prompts for SDXL NSFW txt2img
SELECT negative_prompt, priority
FROM negative_prompts
WHERE model_type = 'sdxl'
  AND content_mode = 'nsfw'
  AND generation_mode = 'txt2img'
  AND is_active = true
ORDER BY priority DESC;

-- Get minimal I2I negative prompts
SELECT negative_prompt
FROM negative_prompts
WHERE model_type = 'sdxl'
  AND content_mode = 'nsfw'
  AND generation_mode = 'i2i'
  AND is_active = true
ORDER BY priority DESC;
```

## Troubleshooting

### Common Issues

1. **Template Not Found**
   - Check database for active templates
   - Verify model_type, use_case, content_mode match
   - Check template version and is_active status

2. **Worker Communication Failure**
   - Verify worker URL from `get-active-worker-url`
   - Check worker health status
   - Review pure inference endpoint availability

3. **Token Limit Exceeded**
   - Review template token_limit settings
   - Check automatic compression logic
   - Monitor token optimization performance

### Debug Commands

```bash
# Check worker status
curl -X GET "https://your-worker-url/worker/info"

# Test pure inference endpoint
curl -X POST "https://your-worker-url/enhance" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"system","content":"Test"},{"role":"user","content":"Hello"}],"max_tokens":100}'

# Monitor edge function logs
supabase functions logs enhance-prompt --follow
```

## Recent Updates

### January 2026: Third-Party API Integration Documentation

- Added comprehensive documentation for OpenRouter, fal.ai, and Replicate API integration
- Documented edge function architecture and provider-specific routing
- Added Model-to-Template Mapping section explaining `api_models` → `prompt_templates` relationship
- Added Negative Prompt Integration section for image generation
- Updated Integration Points section with all edge functions and their providers
- Documented video generation routing (local WAN vs fal.ai WAN 2.1 I2V)

### January 3, 2026: Documentation Alignment

- Updated documentation dates to reflect current state
- Aligned with latest edge function implementations
- Cross-referenced with API documentation updates

### Previous Updates (2024)

- Character Roleplay templates (SFW/NSFW) with variable substitution and caching in `playground-chat`
- Scene Generation template for roleplay-driven image prompts (token_limit 512)
- Chat Assistant templates with higher token limits (SFW 400 / NSFW 600)
- Enhanced Logging throughout enhancement pipeline
- Pure Inference Integration with new worker architecture
- Template Override Elimination via pure inference architecture
- Performance Monitoring with real-time metrics and fallback tracking 

## Suggested Table Reference Docs

Create focused docs for key tables used by the prompting system:

- `docs/tables/prompt_templates.md`: schema, required fields, naming conventions, variable placeholder policy, selection algorithm (criteria + fallbacks), token_limit guidance, examples per use_case.
- `docs/tables/system_config_cache.md`: cache shape used by edge functions (`templateCache.chat`, `negativeCache`, `nsfwTerms`, `metadata`), refresh policy, integrity hash, troubleshooting cache misses.
- `docs/tables/conversations_messages.md`: chat flow tables (`conversations`, `messages`) and how `conversation_type` influences template selection in `playground-chat`.