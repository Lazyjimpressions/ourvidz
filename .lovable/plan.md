
# Playground Persistence, Response Metrics, and Lightbox Model/Template Display

## 1. Maintain Playground Persistence on Navigation

**Problem**: When a user navigates away from `/playground` and returns, all state (active conversation, messages, current mode, system prompt) is lost because it's held in React component state.

**Solution**: Persist the active conversation ID and mode to `localStorage`. On mount, restore the last active conversation and reload its messages.

### Changes

**`src/contexts/PlaygroundContext.tsx`**
- On `setActiveConversation`, persist `activeConversationId` to `localStorage` key `playground-active-conversation`
- On mount, read the stored conversation ID and auto-load it (call `loadMessages` and set state)
- Clear the stored ID when a conversation is deleted

**`src/components/playground/ChatInterface.tsx`**
- Persist `currentMode` to `localStorage` key `playground-mode`
- Persist `systemPrompt` to `localStorage` key `playground-system-prompt`
- Initialize from stored values on mount

---

## 2. Token and Character Count on Prompt Results

**Problem**: Assistant responses don't show token/character counts, making it hard to evaluate output length.

**Solution**: Add a small stats line below each assistant message showing character count and an estimated token count (chars / 4 approximation, standard for English text).

### Changes

**`src/components/playground/MessageBubble.tsx`**
- For assistant messages, render a stats line in the hover toolbar area:
  `{charCount} chars | ~{tokenEstimate} tokens`
- Use `message.content.length` for chars, `Math.ceil(content.length / 4)` for token estimate

**`src/components/playground/CompareView.tsx`**
- Add the same char/token stats below each assistant message in the panel render

---

## 3. Preserve Response Time and Log in Tables

**Problem**: Response time is tracked in CompareView locally but not in the main Chat flow, and it's never persisted to the database.

**Solution**: 
- Return `generation_time` (already in edge function response) to the PlaygroundContext
- Store it on each assistant message in local state
- Display it in MessageBubble for assistant messages

### Changes

**`src/contexts/PlaygroundContext.tsx`**
- After receiving a successful response, store `data.generation_time` on the assistant message object as `response_time_ms`
- Include `generation_time` in `lastResponseMeta`

**`src/components/playground/MessageBubble.tsx`**
- Display `message.response_time_ms` (if present) in the hover toolbar: e.g., `1.2s`

**`src/components/playground/CompareView.tsx`**
- Already tracks `responseTime` per panel -- also show per-message response time from the edge function's `generation_time` field (the worker inference time, not the full round-trip)

---

## 4. Lightbox Generation Details: Template and Model

**Problem**: The `PromptDetailsSlider` shows template name from `generation_settings.templateName` or the `jobs` table backfill, but never shows the `model_used` column from `workspace_assets`. For library assets, neither is available.

**Solution**: Read the `model_used` column and surface it in the details panel. Also add `template_name` from the `jobs` table backfill (already partially done, just needs display).

### Changes

**`src/hooks/useFetchImageDetails.ts`**
- Add `modelUsed?: string` to the `ImageDetails` interface
- Set `modelUsed: workspaceAsset.model_used` when reading workspace assets
- For library assets, check `user_library.model_used` if available, or extract from tags

**`src/components/lightbox/PromptDetailsSlider.tsx`**
- In the "Generation Summary" section, render the model used:
  ```
  Model: fal-ai/seedream-v4
  ```
- Display as a Badge below the job type badge
- Include `modelUsed` in the "Copy All" metadata output

---

## Technical Summary

| File | Change |
|---|---|
| `src/contexts/PlaygroundContext.tsx` | Persist/restore active conversation ID via localStorage; include `generation_time` in response metadata |
| `src/components/playground/ChatInterface.tsx` | Persist/restore `currentMode` and `systemPrompt` via localStorage |
| `src/components/playground/MessageBubble.tsx` | Show char/token counts and response time for assistant messages |
| `src/components/playground/CompareView.tsx` | Show char/token counts per assistant message |
| `src/hooks/useFetchImageDetails.ts` | Extract `model_used` from workspace_assets column |
| `src/components/lightbox/PromptDetailsSlider.tsx` | Display model used badge in Generation Summary section |
