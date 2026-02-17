
# Remove Hardcoded `chat_worker` Defaults and Fix Dashboard Filtering

## Problem Summary

`chat_worker` (the local Qwen model identifier) is hardcoded as the default model in **5 locations** across the frontend and edge functions. This means:
- If the user selects a model in the scene setup modal, it gets overwritten by the `chat_worker` default due to a React state race condition
- The edge function defaults to local Qwen if no model is sent, instead of a reliable API model
- Playground conversations appear in the roleplay "Continue" section

## Changes

### 1. Filter Dashboard Conversations (one-line fix)

**File: `src/hooks/useUserConversations.ts`**

Add `.in('conversation_type', ['character_roleplay', 'scene_roleplay', 'roleplay'])` to the query (after line 78's `.eq('status', 'active')`).

This ensures only roleplay sessions appear in "Continue Roleplay."

---

### 2. Fix Default Model in MobileRoleplayChat State Initialization

**File: `src/pages/MobileRoleplayChat.tsx`**

**Line 199**: Change `useState<string>('chat_worker')` to `useState<string>('')`

The actual value gets set by the `useEffect` on line 212 from either navigation state or `initializeSettings()`. Using an empty string as initial prevents accidental use of `chat_worker`.

**Lines 158, 184**: Change the fallback `'chat_worker'` in `initializeSettings()` to use `ModelRoutingService.getDefaultChatModelKey()` -- this returns a reliable OpenRouter model (Dolphin 3.0).

**Line 905 (kickoff call)**: Read model selections directly from `location.state` to bypass stale React state:
```text
const locationState = location.state as { selectedChatModel?: string; selectedImageModel?: string; ... };
const effectiveChatModel = locationState?.selectedChatModel || modelProvider || ModelRoutingService.getDefaultChatModelKey();
const effectiveImageModel = locationState?.selectedImageModel || getValidImageModel();

// Then use in the body:
model_provider: effectiveChatModel,
selected_image_model: effectiveImageModel,
```

This fixes the race condition where `modelProvider` state is still the initial empty/default value when the kickoff fires.

---

### 3. Fix PlaygroundContext Default

**File: `src/contexts/PlaygroundContext.tsx`**

**Line 149**: Change `model_provider: hasCharacter ? 'chat_worker' : 'openrouter'` to use the user's selected model from `settings.chatModel`, with fallback to `ModelRoutingService.getDefaultChatModelKey()`.

---

### 4. Fix Edge Function Default Parameter

**File: `supabase/functions/playground-chat/index.ts`**

**Line 440**: Change `model_provider = 'chat_worker'` default to `model_provider = ''` (empty string).

Then add logic below the destructuring to resolve an empty `model_provider` to the first active default model from the database, or fall back to the hardcoded OpenRouter default (Dolphin 3.0). This makes the edge function self-healing -- it will always route to a working model even if the frontend sends nothing.

**Line 1087**: Change `model_used: model_provider === 'openrouter' ? ... : 'chat_worker'` to use the actual resolved model identifier.

---

### 5. Fix Edge Function Default in roleplay-chat

**File: `supabase/functions/roleplay-chat/index.ts`**

The `chat_worker` references here are **routing logic**, not defaults -- the function checks `if (model_provider === 'chat_worker')` to route to the local worker. These should stay, since `chat_worker` is a valid model identifier when the user explicitly selects it. No change needed here for the routing paths.

However, the type annotation on line 136 (`model_provider: 'chat_worker' | 'openrouter' | ...`) should be widened to `string` since model keys are dynamic.

---

## Result After Changes

| Scenario | Before | After |
|---|---|---|
| User picks Dolphin 3.0 in scene modal | Ignored, sends `chat_worker` | Dolphin 3.0 sent correctly |
| No model selected anywhere | `chat_worker` (local, may be down) | Dolphin 3.0 via ModelRoutingService |
| Playground sessions on dashboard | Shown in "Continue Roleplay" | Filtered out |
| Edge function receives empty model | Routes to local Qwen | Resolves to DB default or OpenRouter fallback |

## Files Changed

| File | Change |
|---|---|
| `src/hooks/useUserConversations.ts` | Add `conversation_type` filter for roleplay types only |
| `src/pages/MobileRoleplayChat.tsx` | Replace `chat_worker` defaults with dynamic defaults; read model from location.state in kickoff |
| `src/contexts/PlaygroundContext.tsx` | Use selected model instead of hardcoded `chat_worker` |
| `supabase/functions/playground-chat/index.ts` | Replace `chat_worker` default param with dynamic resolution |
| `supabase/functions/roleplay-chat/index.ts` | Widen type annotation (routing logic stays) |
