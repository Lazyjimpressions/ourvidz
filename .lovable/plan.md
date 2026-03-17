

## Investigation: Seedream v4.5 Edit Model Selection & Image Quality

### Root Cause: Why Seedream v4.5 Edit Cannot Be Selected

**The UI allows selecting an I2I model (`selectedI2IModel` state in MobileRoleplayChat), but the value is never sent to the edge function.**

The frontend stores `selectedI2IModel` in state and persists it to `localStorage`, but none of the ~8 places that call the `roleplay-chat` edge function include `selected_i2i_model` in the request body. The edge function expects this field (line 224: `selected_i2i_model?: string`) and passes it to `generateScene()` as `i2iModelOverride`, but it always receives `undefined`.

**Result:** The `getI2IModelKey()` function in the edge function always falls through to Priority 2 (database default), which is **Flux-2 Flash i2i** (`fal-ai/flux-2/flash/edit`) because it has `default_for_tasks: ['i2i']`. Seedream v4.5 Edit is only the default for `i2i_multi`, not `i2i`.

### Why This Affects Image Quality

From the edge function logs, the hot tub scenario uses `both_characters` scene style with 3 reference images (scene + character + user). The flow:

1. `effectiveImageModel` resolves to Flux-2 Flash i2i (the default)
2. When 2+ images are detected (line 3608), `getI2IModelKey(true)` is called for `i2i_multi`
3. This correctly resolves to **Seedream v4.5 Edit** (default for `i2i_multi`)
4. So the `model_key_override` is set to `fal-ai/bytedance/seedream/v4.5/edit`

**However**, the `apiModelId` in the request still points to Flux-2 Flash (`962211a7`), and the `fal-image` edge function logs confirm it routes to `fal-ai/flux-2/flash/edit`. The `model_key_override` should take precedence, but the logs show the actual call goes to `https://fal.run/fal-ai/flux-2/flash/edit` -- meaning the override may not be working correctly or is being ignored.

### Fix Plan

**1. Wire `selectedI2IModel` to edge function calls** (MobileRoleplayChat.tsx)

Add `selected_i2i_model: selectedI2IModel !== 'auto' ? selectedI2IModel : undefined` to all ~8 places that build the `roleplay-chat` request body. These are around lines 962, 1550, 1727, 1923, 2051, 2187, 2337.

**2. Fix 3 build errors**

- **useClipOrchestration.ts (line 283):** `job_id` doesn't exist on `UpdateClipInput`. Add `job_id?: string` to `UpdateClipInput` in `src/types/storyboard.ts`.
- **StoryboardService.ts (line 665):** The object cast to `Character` is missing `description` and `image_url`. Add those fields to the object literal.
- **CharacterStudioV2.tsx (line 113):** `tags` is required in `CharacterPortrait` but not provided. Add `tags: []` to the portrait object.

### Impact

Once wired, users who select Seedream v4.5 Edit in settings will have that model used for all I2I iterations. For multi-reference scenes (both_characters), Seedream v4.5 Edit should already be used via `getI2IModelKey(true)` -- but the override wiring ensures it's also used for single-reference I2I continuity scenes, which is where the quality difference is most noticeable.

