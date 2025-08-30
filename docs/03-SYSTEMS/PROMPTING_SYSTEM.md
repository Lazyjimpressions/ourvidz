# Dynamic Prompting System

**Last Updated:** August 8, 2025  
**Architecture:** Pure Inference Engine - No Worker Overrides  
**Status:** ✅ Production Ready with Enhanced Logging

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

Notes
- Templates are selected by edge functions using: `(target_model, enhancer_model, job_type, use_case, content_mode)` with fallbacks.
- Character roleplay templates support variable substitution (performed server-side) and are cached per character to avoid repeated processing.

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

- **`enhance-prompt`**: Prompt enhancement (SDXL/WAN). Fetches template by criteria, builds `messages` and calls worker `/enhance` with pure inference payload.
- **`playground-chat`**: Conversational/roleplay chat. Resolves context (general, roleplay, character_roleplay, admin, creative) and content tier (sfw/nsfw), loads templates from cache/DB, performs character variable substitution for `character_roleplay`, and calls worker `/chat` with constructed `messages`. Supports optional `character_id` and conversation-type routing.
- **`queue-job`**: Job creation. Selects enhancement templates and attaches template context to jobs for downstream processing.

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

### August 8, 2025: Roleplay and Scene-Gen Templates Added

- Added Character Roleplay templates (SFW/NSFW) with variable substitution and caching in `playground-chat`.
- Added Scene Generation template for roleplay-driven image prompts (token_limit 512).
- Updated Chat Assistant templates with higher token limits (SFW 400 / NSFW 600).
- Documentation now maps frontend pages to template selection paths.

### August 4, 2025: Enhanced Logging & Pure Inference

- **Enhanced Logging:** Comprehensive logging throughout enhancement pipeline
- **Pure Inference Integration:** Complete integration with new worker architecture
- **Template Override Elimination:** Security improvement through pure inference
- **Performance Monitoring:** Real-time metrics and fallback tracking
- **Error Handling:** Improved error handling with detailed logging 

## Suggested Table Reference Docs

Create focused docs for key tables used by the prompting system:

- `docs/tables/prompt_templates.md`: schema, required fields, naming conventions, variable placeholder policy, selection algorithm (criteria + fallbacks), token_limit guidance, examples per use_case.
- `docs/tables/system_config_cache.md`: cache shape used by edge functions (`templateCache.chat`, `negativeCache`, `nsfwTerms`, `metadata`), refresh policy, integrity hash, troubleshooting cache misses.
- `docs/tables/conversations_messages.md`: chat flow tables (`conversations`, `messages`) and how `conversation_type` influences template selection in `playground-chat`.