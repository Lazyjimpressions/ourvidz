# OpenRouter API Integration

**Last Updated:** January 3, 2026
**Status:** ✅ PRODUCTION - NSFW roleplay chat models via database configuration

## Overview

The OpenRouter API integration provides access to uncensored LLM chat models for roleplay, storytelling, and prompt enhancement. OpenRouter aggregates multiple model providers into a single API.

### Scope Clarification

**OpenRouter supports CHAT/TEXT models only:**
- ✅ Roleplay conversations
- ✅ Prompt enhancement
- ✅ Storytelling
- ✅ Character chat
- ❌ Image generation (use Replicate or local SDXL)
- ❌ Video generation (use local WAN)

---

## Architecture

### Integration Point

```
RoleplayChat.tsx → roleplay-chat Edge Function → OpenRouter API
```

**Edge Function:** `supabase/functions/roleplay-chat/index.ts` (lines 273-319)

### Model Routing Logic

```typescript
// From roleplay-chat edge function
if (model_provider === 'chat_worker') {
  // Check local Qwen worker health
  const isHealthy = await checkLocalChatWorkerHealth();
  if (isHealthy) {
    return await callChatWorkerWithHistory(messages);
  } else {
    // Fallback to OpenRouter
    return await callOpenRouterWithConfig(messages, defaultOpenRouterModel);
  }
} else {
  // Direct API routing via api_models configuration
  return await callModelWithConfig(messages, modelConfig);
}
```

---

## Database Configuration

### api_providers Entry

```sql
-- OpenRouter provider
INSERT INTO api_providers (
  name, display_name, base_url,
  auth_scheme, auth_header_name, secret_name, is_active
) VALUES (
  'openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1',
  'bearer', 'Authorization', 'OpenRouter_Roleplay_API_KEY', true
);
```

### api_models Entries

```sql
-- NSFW Roleplay Models (all free tier)
INSERT INTO api_models (
  provider_id, model_key, display_name,
  modality, task, model_family, is_active, is_default, priority
) VALUES
-- Venice Dolphin (primary NSFW model)
((SELECT id FROM api_providers WHERE name = 'openrouter'),
 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
 'Venice Dolphin Mistral 24B',
 'roleplay', 'roleplay', 'mistral', true, true, 1),

-- Dolphin 3.0 R1 (advanced reasoning)
((SELECT id FROM api_providers WHERE name = 'openrouter'),
 'cognitivecomputations/dolphin-3.0-r1-mistral-24b:free',
 'Dolphin 3.0 R1 Mistral 24B',
 'roleplay', 'roleplay', 'mistral', true, false, 2),

-- Dolphin 3.0 (general purpose)
((SELECT id FROM api_providers WHERE name = 'openrouter'),
 'cognitivecomputations/dolphin-3.0-mistral-24b:free',
 'Dolphin 3.0 Mistral 24B',
 'roleplay', 'roleplay', 'mistral', true, false, 3);
```

---

## NSFW Roleplay Models

### Model Comparison

| Model | Cost | Response Time | Uncensored | Best For |
|-------|------|---------------|------------|----------|
| Venice Dolphin 24B | FREE | 4-12s | ✅ Full | Primary NSFW roleplay |
| Dolphin 3.0 R1 24B | FREE | 5-15s | ✅ Full | Advanced reasoning |
| Dolphin 3.0 24B | FREE | 4-10s | ✅ Full | General purpose |

### Model Characteristics

**Venice Dolphin (Recommended):**
- Most uncensored behavior
- User control over alignment
- No default safety layers
- Transparent, predictable responses

**Dolphin 3.0 R1:**
- 800k training traces for enhanced reasoning
- Good for complex scenarios
- Slightly slower but more thoughtful

---

## API Request Format

### Chat Completion

```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://ourvidz.com',
    'X-Title': 'OurVidz Platform'
  },
  body: JSON.stringify({
    model: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 400,
    temperature: 0.9,  // Higher for creative NSFW
    top_p: 0.95
  })
});
```

### Response Format

```json
{
  "id": "gen-xxx",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Character response..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 200,
    "total_tokens": 350
  }
}
```

---

## Fallback Strategy

### Local → OpenRouter Fallback

```typescript
// In roleplay-chat edge function
async function routeChatRequest(messages, modelConfig) {
  if (modelConfig.provider === 'chat_worker') {
    // Try local Qwen first
    const health = await checkLocalChatWorkerHealth();

    if (health.isHealthy) {
      return await callChatWorkerWithHistory(messages);
    }

    // Fallback to OpenRouter
    console.log('⚠️ Local chat worker unhealthy, falling back to OpenRouter');
    const defaultModel = await getDefaultOpenRouterModel();
    return await callOpenRouterWithConfig(messages, defaultModel);
  }

  // Direct OpenRouter routing
  return await callModelWithConfig(messages, modelConfig);
}
```

### Health Check Integration

Health status stored in `system_config.workerHealthCache.chatWorker`:
- `isHealthy`: boolean
- `lastCheck`: timestamp
- `responseTime`: ms

---

## Pricing

### Free Tier Models

| Model | Input Cost | Output Cost |
|-------|-----------|-------------|
| Venice Dolphin 24B | FREE | FREE |
| Dolphin 3.0 R1 24B | FREE | FREE |
| Dolphin 3.0 24B | FREE | FREE |

### Premium Models (if needed)

| Model | Input (per 1K) | Output (per 1K) |
|-------|----------------|-----------------|
| Llama 3.1 8B | $0.0002 | $0.0002 |
| Mistral 7B | $0.0001 | $0.0001 |

---

## Error Handling

### Common Errors

| Status | Error | Solution |
|--------|-------|----------|
| 429 | Rate limit exceeded | Wait and retry, or switch model |
| 402 | Payment required | Add credits to OpenRouter account |
| 503 | Service unavailable | Fall back to local worker |

### Retry Logic

```typescript
const handleOpenRouterError = async (error, retryCount = 0) => {
  if (error.status === 429 && retryCount < 3) {
    const retryAfter = error.headers.get('retry-after') || 5;
    await sleep(retryAfter * 1000);
    return retry(retryCount + 1);
  }

  if (error.status >= 500) {
    // Fall back to local worker
    return await fallbackToLocalWorker();
  }

  throw error;
};
```

---

## Environment Secrets

| Secret | Description |
|--------|-------------|
| `OpenRouter_Roleplay_API_KEY` | OpenRouter API authentication |

Referenced via `api_providers.secret_name` field.

---

## Use Case Optimization

### NSFW Roleplay

```typescript
const nsfwRoleplayConfig = {
  model: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
  temperature: 0.9,      // Higher creativity
  max_tokens: 400,       // Longer responses
  top_p: 0.95,
  // No safety_settings needed - model is uncensored by design
};
```

### Prompt Enhancement

```typescript
const promptEnhanceConfig = {
  model: 'cognitivecomputations/dolphin-3.0-mistral-24b:free',
  temperature: 0.5,      // More focused
  max_tokens: 200,       // Concise output
  top_p: 0.9,
};
```

---

## Testing

### Verify Model Configuration

```sql
-- Check active OpenRouter models
SELECT display_name, model_key, is_default, priority
FROM api_models
WHERE modality = 'roleplay'
  AND is_active = true
  AND provider_id = (SELECT id FROM api_providers WHERE name = 'openrouter')
ORDER BY priority ASC;
```

### Test API Connection

```bash
curl -X POST https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50
  }'
```

---

## Related Documentation

- [ROLEPLAY_API_ALIGNMENT.md](./ROLEPLAY_API_ALIGNMENT.md) - Roleplay system integration
- [PROMPTING_SYSTEM.md](../03-SYSTEMS/PROMPTING_SYSTEM.md) - Template system for chat
- Admin Dashboard: API Providers Tab, API Models Tab
