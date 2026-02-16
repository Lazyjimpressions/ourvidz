

# Fix: Honor Custom System Prompts in Playground Chat

## Root Cause

The Compare View sends `system_prompt_override` in the request body (line 162 of CompareView.tsx), but the `playground-chat` edge function never reads or uses this field. It always generates its own system prompt via `getSystemPromptForChat()`, which resolves to the default NSFW chat template: *"Reply as a flirtatious, modern conversational partner..."*

This is why both mimo and grok ignored your Seedream prompt engineering system prompt -- it was silently discarded by the backend.

## Fix

Update `playground-chat/index.ts` to:

1. **Destructure** `system_prompt_override` from the request body (around line 469-482)
2. **Skip** `getSystemPromptForChat()` when `system_prompt_override` is provided -- use the override directly as the system prompt
3. **Still append** NSFW guidance if the content tier is NSFW (to maintain safety rails)
4. **Log** when an override is active for diagnostics

## Technical Changes

### File: `supabase/functions/playground-chat/index.ts`

**Change 1 -- Destructure the new field (line ~469-482)**

Add `system_prompt_override` to the destructured body variables.

**Change 2 -- Use override when present (line ~696-706)**

Before calling `getSystemPromptForChat()`, check if `system_prompt_override` is provided. If so, use it directly instead of the template-resolved prompt. Still append NSFW guidance if applicable.

```text
// Pseudo-logic:
let systemPrompt;
if (system_prompt_override && system_prompt_override.trim()) {
  systemPrompt = system_prompt_override;
  // Still append NSFW guidance for safety
  if (finalTier === 'nsfw' && !systemPrompt.includes(NSFW_GUIDANCE_MARK)) {
    systemPrompt += '\n\n' + NSFW_ROLEPLAY_GUIDANCE;
  }
  console.log('Using system_prompt_override from client');
} else {
  systemPrompt = await getSystemPromptForChat(...);
}
```

**Change 3 -- Diagnostic logging**

Log the override usage so future debugging is clear:
```text
console.log('System prompt source:', system_prompt_override ? 'client_override' : 'template_resolved');
```

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/playground-chat/index.ts` | Destructure `system_prompt_override` from body; use it as system prompt when present, skipping template resolution; append NSFW guidance if needed |

## Expected Result

After this fix, when you type a custom system prompt in the Compare View (like the Seedream prompt engineer instructions), both models will receive and follow that exact system prompt instead of the default NSFW chat template.

