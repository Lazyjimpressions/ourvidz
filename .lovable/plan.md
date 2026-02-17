

# Deliver Dialogue First + Show Full fal.ai Prompt in Edit Modal

## Problem 1: Dialogue Blocked by Scene Generation (~60s wait)

Currently the edge function flow is fully sequential and synchronous:

```text
Client awaits -->  [Chat LLM ~10s] --> [Save Message] --> [generateScene ~60s] --> Return JSON
```

The dialogue text is ready after step 2 (~10s), but the user waits ~70s total because the edge function does not return until scene generation completes. The user cannot read the dialogue or type a response during that time.

### Fix: Fire-and-forget scene generation

After saving the assistant message, return the dialogue response to the client immediately. Fire `generateScene()` without awaiting it, using `EdgeRuntime.waitUntil()` (Supabase edge functions support this for background work that continues after the response is sent).

**File:** `supabase/functions/roleplay-chat/index.ts` (around lines 636-768)

Change the flow to:

```text
Client awaits -->  [Chat LLM ~10s] --> [Save Message] --> Return JSON immediately
                                                      \-> [generateScene runs in background]
```

Steps:
1. After saving the assistant message (line 614), build the response JSON with `scene_generated: true` and a placeholder (the scene_id and job_id will be discovered by the client via the existing `subscribeToJobCompletion` realtime subscription).
2. Use `EdgeRuntime.waitUntil(promise)` to keep the function alive while scene generation completes in the background.
3. The client already has polling/subscription logic (`subscribeToJobCompletion`) that watches for job completion -- no client changes needed for image delivery.
4. For the scene metadata (scene_id, job_id), the background task will update the message metadata in the DB after generation completes, and the client can pick it up via realtime or polling.

Since the client needs the `scene_job_id` to start polling, we need a two-phase approach:
- Create the `character_scenes` DB record (with `job_id: null`) BEFORE returning the response, so we have a `scene_id`.
- Return the `scene_id` in the response immediately.
- In the background task, run the actual image generation, get the `job_id`, and update the scene record + message metadata.

The client-side `subscribeToJobCompletion` will need a small adjustment to also support subscribing by `scene_id` (watching for `job_id` to appear on the scene record), or we can use a Supabase realtime subscription on `character_scenes` filtered by `scene_id`.

**Alternative simpler approach:** Create the scene record AND submit the fal.ai job synchronously (this is fast -- just an API queue submission, ~1-2s), then return immediately with the `job_id`. The actual image generation happens asynchronously on fal.ai's side already. The bottleneck is the narrative LLM call + prompt building, not the fal.ai submission itself.

Looking at the current code, `generateScene()` already submits to fal.ai's queue API which returns a `job_id` immediately. The ~60s is fal.ai processing time, which already happens async. So the real question is: what takes the edge function so long?

Based on the logs, the edge function itself takes ~20-30s (chat LLM + narrative LLM + scene record creation + fal.ai queue submission). The fal.ai processing is already async. So the fix is simpler:

- Skip the narrative LLM call (already planned, saves ~7s)
- The remaining ~15-20s is the chat LLM call + scene record + fal.ai submission
- We can further decouple by moving the scene record creation + fal.ai submission into a `waitUntil()` background task

**Recommended approach:**
1. After chat LLM response + message save, return dialogue immediately
2. Use `waitUntil()` for scene generation (record creation + fal.ai submission)
3. Client subscribes to `character_scenes` table filtered by `conversation_id` for new scene records
4. When a scene record appears with a `job_id`, client starts `subscribeToJobCompletion` as usual

### Client-side changes needed

**File:** `src/pages/MobileRoleplayChat.tsx`

- When receiving the response, show the dialogue immediately (already works)
- Add a Supabase realtime subscription on `character_scenes` for the conversation to detect when the background scene generation creates a record with a `job_id`
- Re-enable the input field as soon as dialogue is received (before image arrives)
- Show a subtle loading indicator on the message while scene generates in background

## Problem 2: Edit Modal Not Showing Full fal.ai Prompt

### Root cause
The `original_scene_prompt` stored in `generation_metadata` (line 3232) is `cleanScenePrompt || scenePrompt` -- this is the raw narrative text BEFORE the Figure notation, character descriptions, composition rules, etc. are added.

The actual full prompt sent to fal.ai is `enhancedScenePrompt` (built at lines 3354-3418) and then `optimizedPrompt` (after char_limit truncation at line 3430). This full prompt is never stored anywhere.

### Fix
Store `optimizedPrompt` (the final prompt sent to fal.ai) in the scene record's `generation_metadata` as a new field `fal_prompt` or replace `original_scene_prompt` with the full prompt.

**File:** `supabase/functions/roleplay-chat/index.ts`

1. After `optimizedPrompt` is built (line 3430), update the scene record's `generation_metadata` to include the full prompt:
   ```
   // Update scene record with full fal.ai prompt
   if (sceneId) {
     await supabase.from('character_scenes')
       .update({ 
         scene_prompt: optimizedPrompt,
         generation_metadata: { ...existingMetadata, fal_prompt: optimizedPrompt }
       })
       .eq('id', sceneId);
   }
   ```

2. Also update the return value's `original_scene_prompt` to use `optimizedPrompt` instead of `cleanScenePrompt`.

**File:** `src/components/roleplay/ScenePromptEditModal.tsx`

3. Update the prompt priority to check `fal_prompt` first:
   ```
   const actualPrompt = sceneData?.generation_metadata?.fal_prompt
     || sceneData?.generation_metadata?.original_scene_prompt
     || sceneData?.scene_prompt
     || currentPrompt;
   ```

**File:** `src/components/roleplay/ChatMessage.tsx`

4. Update line 628 to also check `fal_prompt`:
   ```
   currentPrompt={message.metadata?.generation_metadata?.fal_prompt 
     || message.metadata?.generation_metadata?.original_scene_prompt 
     || message.metadata?.scene_prompt}
   ```

## Problem 3: Skip Narrative LLM (from previous plan, still needed)

When `sceneContext.actions` are available, use them directly instead of calling `generateSceneNarrativeWithOpenRouter`. This saves ~7s.

## Summary of Changes

| File | Change | Impact |
|------|--------|--------|
| `supabase/functions/roleplay-chat/index.ts` | Return dialogue before scene generation using `waitUntil()` | User sees dialogue in ~10s instead of ~70s |
| `supabase/functions/roleplay-chat/index.ts` | Store `optimizedPrompt` as `fal_prompt` in `generation_metadata` | Full prompt available for editing |
| `supabase/functions/roleplay-chat/index.ts` | Skip narrative LLM when actions available | ~7s faster scene generation |
| `supabase/functions/roleplay-chat/index.ts` | Update `original_scene_prompt` return value to use full prompt | Client receives full prompt |
| `src/pages/MobileRoleplayChat.tsx` | Add realtime subscription on `character_scenes` for background scene detection | Picks up scene from background generation |
| `src/pages/MobileRoleplayChat.tsx` | Re-enable input immediately after dialogue received | User can type while image generates |
| `src/components/roleplay/ScenePromptEditModal.tsx` | Check `fal_prompt` field first for prompt display | Shows full prompt in editor |
| `src/components/roleplay/ChatMessage.tsx` | Pass `fal_prompt` as currentPrompt to edit modal | Full prompt flows to editor |

