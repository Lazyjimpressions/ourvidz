
# Fix First Scene I2I + Efficiency Improvements

## Problem 1: First Scene Not Using Multi-Reference I2I

**Root cause:** For the first scene (`isFirstScene: true`), the `sceneStyle` was `character_only` but even when it's `both_characters`, the `canUseMultiReference` logic at line 3807 only builds `image_urls` for `both_characters`. For `character_only` and `pov` styles on the first scene, the code falls to the single-reference branch (line 3869) which sends `image_url: templatePreviewImage` as a single string -- NOT an `image_urls` array.

This means:
- The prompt references "Figure 1" and "Figure 2" (scene + character)
- But only 1 image (template preview) is sent to fal.ai
- The character reference image is **never included** for first-scene `character_only`/`pov`

**Fix:** Add a first-scene I2I branch for `character_only`/`pov` styles that builds an `image_urls` array with [template_preview, character_reference], similar to the multi-reference block but with 2 images instead of 3.

In `supabase/functions/roleplay-chat/index.ts` around line 3807, after the existing `canUseMultiReference` block, add:

```
// FIRST-SCENE I2I for character_only/pov: 
// Build image_urls with [template_preview, character_ref]
if (!useMultiReference && isFirstScene && templatePreviewImageUrl 
    && (character.reference_image_url || character.image_url)) {
  const imageUrlsArray = [
    templatePreviewImageUrl,  // Figure 1: Scene
    (character.reference_image_url || character.image_url)!  // Figure 2: Character
  ];
  multiReferenceImageUrls = imageUrlsArray;
  useMultiReference = true;
  if (!effectiveI2IModelOverride) {
    effectiveI2IModelOverride = 'fal-ai/bytedance/seedream/v4.5/edit';
  }
}
```

## Problem 2: Sequence Efficiency

**Current flow (sequential, ~76-82s total):**
1. Chat LLM call (OpenRouter) -- 8-13s
2. Scene narrative LLM call (OpenRouter/MythoMax) -- 7s  
3. fal.ai image generation -- 58s

Steps 1 and 2 are fully sequential. The narrative call adds ~7s before image generation even starts.

**Fix: Parallelize chat response + scene narrative generation**

The scene narrative generation only needs the chat response text + scene context. However, the current code generates the chat text first, then passes it to `generateSceneNarrativeWithOpenRouter`. 

We can parallelize by firing the narrative generation concurrently with the chat response streaming, using the scene template context (which is available before the chat response). The narrative prompt already uses the scene template description + character actions. For the first scene (kickoff), the character's first_message is already known, so the narrative can be generated in parallel.

For subsequent scenes, we can start the narrative generation as soon as the chat response is available, but the main optimization is to **fire the fal.ai request as early as possible**.

**Specific optimization:** Move the scene narrative generation to run concurrently with the OpenRouter chat call when possible (kickoff scenes where the first_message is known). For subsequent scenes, consider using the scene template context directly without the extra LLM narrative call, since the action is already extracted from `sceneContext.actions`.

## Technical Changes

### File: `supabase/functions/roleplay-chat/index.ts`

1. **First-scene I2I array fix** (~line 3848): Add block to build 2-element `image_urls` array for `character_only`/`pov` first scenes

2. **Efficiency: Skip redundant narrative LLM call when actions are available** (~line 2850-2880): When `sceneContext.actions` already contains extracted actions from the chat response, use those directly as the scene narrative instead of making a second LLM call to rephrase them. The extra call to `gryphe/mythomax-l2-13b` just reformulates what's already in the response -- saving ~7s per scene.

   Before: chat response -> extract actions -> call MythoMax to "narrate" -> build prompt -> call fal.ai
   After: chat response -> extract actions -> build prompt directly -> call fal.ai

   The narrative LLM call would only be used as fallback when no actions are extracted.

### Deployment
- Deploy `roleplay-chat` edge function after changes
