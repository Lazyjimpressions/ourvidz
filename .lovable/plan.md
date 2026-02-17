

# Fix: Wire UI Scene Settings Into Edge Function Call

## Root Cause

There's a race condition in `MobileRoleplayChat.tsx`. The kickoff function already reads `selectedChatModel` and `selectedImageModel` from `location.state` (lines 913-916) to bypass stale React state -- but it does NOT do the same for `scene_style`. Instead, line 945 reads `sceneStyle` from React state, which is still the default `'character_only'` (initialized on line 220) because the state update from `setSceneStyle(effectiveSceneStyle)` (line 272) hasn't flushed yet.

This means:
- You select "both" in the scene modal
- The dashboard navigates with `state.sceneStyle = 'both_characters'`
- The chat page initializes `sceneStyle` state as `'character_only'`
- The model defaults effect calls `setSceneStyle('both_characters')` -- but this is async
- The kickoff fires and reads `sceneStyle` from state = still `'character_only'`
- Edge function receives `scene_style: 'character_only'` instead of `'both_characters'`

The same pattern applies to `imageGenerationMode`.

## Fix

**File:** `src/pages/MobileRoleplayChat.tsx`

In the kickoff function (around lines 912-945), apply the same `location.state` bypass pattern already used for chat/image models:

1. Read `sceneStyle` from `location.state` (already typed at line 232 but never used in kickoff)
2. Read `imageGenerationMode` from `location.state` similarly
3. Use these values in the edge function call body instead of React state

```
// Around line 913, extend the existing location.state read:
const modelState = location.state as { 
  selectedChatModel?: string; 
  selectedImageModel?: string;
  sceneStyle?: 'character_only' | 'pov' | 'both_characters';
  imageGenerationMode?: string;
} | null;

const effectiveChatModel = modelState?.selectedChatModel || modelProvider || ModelRoutingService.getDefaultChatModelKey();
const effectiveImageModel = modelState?.selectedImageModel || getValidImageModel();
const effectiveSceneStyle = modelState?.sceneStyle || sceneStyle;
const effectiveImageGenMode = modelState?.imageGenerationMode || imageGenerationMode;

// Also sync state for subsequent messages
if (modelState?.sceneStyle && modelState.sceneStyle !== sceneStyle) {
  setSceneStyle(modelState.sceneStyle);
}
```

Then on line 945, change:
```
scene_style: effectiveSceneStyle,
```

And update the `scene_generation` field to respect the mode:
```
scene_generation: effectiveImageGenMode !== 'manual',
```

## Fix 2: First-Scene I2I Array for character_only/pov

**File:** `supabase/functions/roleplay-chat/index.ts`

After the existing `canUseMultiReference` block (around line 3848), add a fallback block for first scenes with `character_only` or `pov` styles that builds a 2-element `image_urls` array:

```
if (!useMultiReference && isFirstScene && templatePreviewImageUrl 
    && (character.reference_image_url || character.image_url)) {
  const firstSceneImageUrls = [
    templatePreviewImageUrl,
    (character.reference_image_url || character.image_url)!
  ];
  multiReferenceImageUrls = firstSceneImageUrls;
  useMultiReference = true;
  if (!effectiveI2IModelOverride) {
    effectiveI2IModelOverride = 'fal-ai/bytedance/seedream/v4.5/edit';
  }
}
```

## Fix 3: Skip Redundant Narrative LLM Call

**File:** `supabase/functions/roleplay-chat/index.ts`

When `sceneContext.actions` already has content, use those actions directly as the scene prompt instead of calling `generateSceneNarrativeWithOpenRouter` (saves ~7s):

```
if (sceneContext?.actions?.length > 0) {
  const actionsSummary = sceneContext.actions.slice(0, 3).join('. ');
  const setting = sceneContext.setting || 'the scene';
  const mood = sceneContext.mood || 'engaging';
  scenePrompt = `${setting}. ${actionsSummary}. The mood is ${mood}.`;
} else {
  // Existing narrative LLM call as fallback
}
```

## Summary of Changes

| File | Change | Impact |
|------|--------|--------|
| `src/pages/MobileRoleplayChat.tsx` | Read `sceneStyle` and `imageGenerationMode` from `location.state` in kickoff | UI selections respected by edge function |
| `supabase/functions/roleplay-chat/index.ts` | Add 2-image array for first-scene character_only/pov | Proper I2I with scene + character reference |
| `supabase/functions/roleplay-chat/index.ts` | Skip narrative LLM when actions available | ~7s faster scene generation |

