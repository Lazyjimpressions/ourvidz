# Dynamic Prompting System

**Last Updated:** August 4, 2025  
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

### Core Templates (12 Active)

| Template Name | Model Type | Use Case | Content Mode | Token Limit |
|---------------|------------|----------|--------------|-------------|
| `enhancement_sdxl_sfw` | qwen_instruct | enhancement | sfw | 75 |
| `enhancement_sdxl_nsfw` | qwen_instruct | enhancement | nsfw | 75 |
| `enhancement_wan_sfw` | qwen_base | enhancement | sfw | 100 |
| `enhancement_wan_nsfw` | qwen_base | enhancement | nsfw | 100 |
| `chat_sfw` | qwen_instruct | chat | sfw | 200 |
| `chat_nsfw` | qwen_instruct | chat | nsfw | 200 |
| `generation_sdxl_sfw` | qwen_instruct | generation | sfw | 150 |
| `generation_sdxl_nsfw` | qwen_instruct | generation | nsfw | 150 |
| `generation_wan_sfw` | qwen_base | generation | sfw | 200 |
| `generation_wan_nsfw` | qwen_base | generation | nsfw | 200 |
| `playground_sfw` | qwen_instruct | playground | sfw | 300 |
| `playground_nsfw` | qwen_instruct | playground | nsfw | 300 |

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

- **SDXL:** 75 token limit (prevents CLIP truncation)
- **WAN:** 100 token limit (video generation)
- **Chat:** 200 token limit (conversation)
- **Automatic compression** when limits exceeded

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

- **`enhance-prompt`:** Main enhancement with pure inference
- **`playground-chat`:** Chat interface with template routing
- **`queue-job`:** Job queuing with template selection

### Worker System

**Chat Worker:** Pure inference engine
- **Endpoint:** `/enhance` (new pure inference endpoint)
- **Model:** Qwen Instruct
- **Capability:** Template-driven enhancement
- **Security:** No prompt overrides

**WAN Worker:** Legacy format maintained
- **Endpoint:** `/generate` (existing format)
- **Model:** Qwen Base
- **Capability:** Video generation enhancement
- **Compatibility:** Backward compatible

### Frontend Integration

```typescript
// Enhanced prompt request with logging
const response = await fetch('/functions/v1/enhance-prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: userPrompt,
    jobType: 'sdxl_image',
    quality: 'high',
    selectedModel: 'qwen_instruct',
    user_id: userId
  })
});

// Response includes comprehensive metadata
const result = await response.json();
console.log('Enhancement metadata:', result.enhancement_metadata);
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

### August 4, 2025: Enhanced Logging & Pure Inference

- **Enhanced Logging:** Comprehensive logging throughout enhancement pipeline
- **Pure Inference Integration:** Complete integration with new worker architecture
- **Template Override Elimination:** Security improvement through pure inference
- **Performance Monitoring:** Real-time metrics and fallback tracking
- **Error Handling:** Improved error handling with detailed logging 