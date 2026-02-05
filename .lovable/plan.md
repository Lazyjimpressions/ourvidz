

# Fix Admin Prompt Builder: Proper Edge Function Integration

## Problem Summary

The Admin Prompt Builder fails because `PlaygroundContext` calls `roleplay-chat` which **requires** `character_id` as a mandatory field. Admin tools have no character, so the request fails with a 400 error.

---

## Solution: Route Admin Chat Through `playground-chat`

The `playground-chat` edge function already handles general conversations without requiring a character. We need to:
1. Add OpenRouter model routing to `playground-chat` (it currently only supports local Qwen worker)
2. Update `PlaygroundContext.sendMessage` to route based on context (use `playground-chat` for admin/general, keep `roleplay-chat` for character-based roleplay)

---

## Implementation Steps

### Phase 1: Upgrade `playground-chat` Edge Function

**File**: `supabase/functions/playground-chat/index.ts`

Add OpenRouter API integration:
1. Accept `model_provider` and `model_variant` parameters
2. Add OpenRouter API call function (similar to `roleplay-chat`)
3. Load API model config from `api_models` table
4. Use `prompt_template_id` for template selection

Key changes:
- Add `callOpenRouterWithConfig()` function
- Add model config lookup from `api_models` table
- Support `model_provider: 'openrouter'` in request body
- Return model metadata in response (for admin debugging)

### Phase 2: Update PlaygroundContext Routing

**File**: `src/contexts/PlaygroundContext.tsx`

Change `sendMessage` to:
1. Use `playground-chat` for admin/general/creative conversations
2. Use `roleplay-chat` only when `selectedCharacter` is set (roleplay mode)

```typescript
const edgeFunction = state.selectedCharacter?.id 
  ? 'roleplay-chat' 
  : 'playground-chat';

const { data, error } = await supabase.functions.invoke(edgeFunction, {
  body: {
    message: messageText,
    conversation_id: conversationId,
    // Different params based on function
    ...(state.selectedCharacter?.id 
      ? { character_id: state.selectedCharacter.id, model_provider: 'openrouter' }
      : { model_provider: 'openrouter', model_variant: settings.chatModel }
    ),
    content_tier: settings.contentMode,
    prompt_template_id: settings.promptTemplateId || undefined,
  },
});
```

### Phase 3: Update ChatInterface Admin Handler

**File**: `src/components/playground/ChatInterface.tsx`

Ensure `handleStartAdminTool` properly sets up the conversation context:
1. Create conversation with type `admin`
2. Send structured system message
3. Store tool context for reference

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/playground-chat/index.ts` | Add OpenRouter integration, model config lookup |
| `src/contexts/PlaygroundContext.tsx` | Route to correct edge function based on context |
| `src/components/playground/ChatInterface.tsx` | Minor cleanup of admin tool handler |

---

## Technical Details

### OpenRouter Integration in playground-chat

Add function to call OpenRouter:

```typescript
async function callOpenRouter(
  systemPrompt: string,
  userMessage: string,
  modelKey: string,
  contentTier: string,
  supabase: any,
  userId?: string
): Promise<string> {
  const apiKey = Deno.env.get('OpenRouter_Roleplay_API_KEY');
  if (!apiKey) throw new Error('OpenRouter API key not configured');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ourvidz.lovable.app',
    },
    body: JSON.stringify({
      model: modelKey,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
```

### Request Body Schema for playground-chat

```typescript
interface PlaygroundChatRequest {
  conversation_id: string;
  message: string;
  model_provider?: 'openrouter' | 'chat_worker';  // Default: 'openrouter'
  model_variant?: string;                         // e.g., 'gryphe/mythomax-l2-13b'
  content_tier?: 'sfw' | 'nsfw';                  // Default: 'nsfw'
  prompt_template_id?: string;                    // Optional template override
  character_id?: string;                          // Optional, for character context
  context_type?: string;                          // 'admin' | 'general' | 'creative'
}
```

---

## Validation Criteria

After implementation, the admin should be able to:

1. Go to `/playground` → Admin tab
2. Click "Admin Tools" → Select "Prompt Builder"
3. Choose target model (e.g., Seedream v4 from `api_models`)
4. Choose template (e.g., "Admin Assistant" from `prompt_templates`)
5. Enter purpose: "Help me create an NSFW scene prompt"
6. Click "Start Prompt Builder"
7. **Conversation starts successfully** (no 400 error)
8. AI responds with prompt-building guidance
9. Admin can continue chatting to refine prompts

---

## Edge Function Flow Diagram

```text
User clicks "Start Prompt Builder"
          │
          ▼
ChatInterface.handleStartAdminTool()
          │
          ├─► createConversation('Admin: Prompt Builder', null, 'admin')
          │
          ▼
sendMessage(systemMessage, { conversationId })
          │
          ├─► No character selected
          │
          ▼
PlaygroundContext.sendMessage()
          │
          ├─► Detects: no selectedCharacter
          │
          ▼
supabase.functions.invoke('playground-chat', {
  body: {
    message: "[System: Prompt Builder Mode]...",
    conversation_id: "uuid",
    model_provider: 'openrouter',
    model_variant: 'gryphe/mythomax-l2-13b',
    content_tier: 'nsfw',
    context_type: 'admin'
  }
})
          │
          ▼
playground-chat edge function
          │
          ├─► Load model config from api_models
          ├─► Build system prompt for admin context
          ├─► Call OpenRouter API
          ├─► Save messages to database
          │
          ▼
Return response to frontend
          │
          ▼
UI displays AI response
```

---

## Dependencies

- Existing `OpenRouter_Roleplay_API_KEY` secret (already configured)
- `api_models` table with OpenRouter models
- `prompt_templates` table with admin templates
- RLS policies allow authenticated users to read models/templates

