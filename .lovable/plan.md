

# Fix: Remaining `character` Reference in `generateScene` Causes Crash

## Root Cause

Inside `generateScene()`, at line 2681, the code references `character.reference_image_url` and `character.image_url`. But `character` does not exist in this function's scope -- it only exists in the main request handler. The local equivalent, `sceneCharacter`, is not declared until line 2737, which is 56 lines later. This causes a `ReferenceError: character is not defined` crash every time the fallback branch is hit (which is every first scene without a template).

## Fix

Move the `sceneCharacter` database fetch (currently at lines 2737-2758) to **before** line 2660, so it is available when the reference image fallback logic runs at line 2681. Then update lines 2681-2685 to use `sceneCharacter` instead of `character`.

### Specific changes in `supabase/functions/roleplay-chat/index.ts`:

1. **Move the character fetch block** (lines 2737-2758) to right after line 2654 (after `hasCurrentSceneImage`), before the I2I mode decision logic starts at line 2656.

2. **Update lines 2681-2685** to reference `sceneCharacter` instead of `character`:
   ```
   // Before:
   effectiveReferenceImageUrl = character.reference_image_url || character.image_url || undefined;
   ...has_reference: !!character.reference_image_url,
   ...has_avatar: !!character.image_url

   // After:
   effectiveReferenceImageUrl = sceneCharacter?.reference_image_url || sceneCharacter?.image_url || undefined;
   ...has_reference: !!sceneCharacter?.reference_image_url,
   ...has_avatar: !!sceneCharacter?.image_url
   ```

3. **Remove the duplicate fetch** at the original location (lines 2737-2758) since it will have been moved earlier.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/roleplay-chat/index.ts` | Move `sceneCharacter` fetch before reference image resolution; fix `character` to `sceneCharacter` |

## Redeploy

The `roleplay-chat` edge function will need to be redeployed after this change.
