# I2I Scene Continuity Audit Summary

**Date:** 2026-01-11  
**Status:** Testing Required

## Changes Implemented vs Plan

### ✅ Fix 1.1: Mode Detection - REQUIRES Previous Scene Image for I2I
**Status:** ✅ IMPLEMENTED
- **Location:** `supabase/functions/roleplay-chat/index.ts` lines 2130-2226
- **Implementation:** 
  - Verifies previous scene exists in database if ID is provided
  - Only uses I2I mode if `verifiedPreviousSceneImageUrl` is available
  - Falls back to T2I if previous scene missing
- **Matches Plan:** Yes, follows the plan exactly

### ✅ Fix 1.2: Ensure Scene Records Are Created
**Status:** ✅ IMPLEMENTED (Already existed)
- **Location:** `supabase/functions/roleplay-chat/index.ts` lines 3198-3204
- **Implementation:** Scene records are created with `job_id` updated after generation
- **Matches Plan:** Yes

### ✅ Fix 1.3: Ensure Scene Image URL Is Updated
**Status:** ✅ IMPLEMENTED (Already existed)
- **Location:** `supabase/functions/fal-image/index.ts` lines 1292-1311
- **Implementation:** Scene image URL is updated in `character_scenes` table
- **Matches Plan:** Yes

### ✅ Fix 3: Use Scene Iteration Templates for I2I
**Status:** ✅ IMPLEMENTED
- **Location:** `supabase/functions/roleplay-chat/index.ts` lines 2291-2301, 2461
- **Implementation:** 
  - `generateSceneNarrativeWithOpenRouter` accepts `useI2IIteration` parameter
  - Selects "Scene Iteration - NSFW/SFW" for I2I, "Scene Narrative - NSFW/SFW" for T2I
  - Passed correctly when calling the function
- **Matches Plan:** Yes

### ✅ Fix: Store scene_id in generation_settings
**Status:** ✅ IMPLEMENTED
- **Location:** `supabase/functions/fal-image/index.ts` line ~580
- **Implementation:** `scene_id` is stored in `workspace_assets.generation_settings`
- **Matches Plan:** Yes (added as part of fix)

### ✅ Fix: Frontend scene_id Tracking
**Status:** ✅ IMPLEMENTED
- **Location:** `src/pages/MobileRoleplayChat.tsx` lines 843-927, 1237-1241
- **Implementation:** 
  - Uses `messageSceneIdsRef` to store `scene_id` when message is created
  - Retrieves `scene_id` from multiple sources (generation_settings, ref, message metadata, asset_id)
  - Calls `setLastScene` when job completes
- **Matches Plan:** Yes (added as part of fix)

## Potential Issues Identified

### Issue 1: Edge Function May Not Be Deployed
- **Problem:** The `fal-image` edge function fix (storing `scene_id` in `generation_settings`) may not be deployed
- **Impact:** `scene_id` won't be available in `workspace_assets.generation_settings`
- **Workaround:** Frontend uses ref to store `scene_id` from edge function response
- **Action Required:** Deploy `fal-image` edge function to Supabase

### Issue 2: Previous Scene Verification May Fail
- **Problem:** If previous scene exists but `image_url` is null, verification fails
- **Impact:** I2I mode won't be used even if continuity is enabled
- **Current Behavior:** Falls back to T2I (correct behavior)
- **Action Required:** Ensure scene image URLs are always updated

### Issue 3: Scene Continuity Hook May Not Have Previous Scene
- **Problem:** `useSceneContinuity` hook may not have `previousSceneId` or `previousSceneImageUrl`
- **Impact:** Frontend won't pass continuity parameters to edge function
- **Current Behavior:** Logs show "Found cached scene for conversation" - should be working
- **Action Required:** Test to verify hook is returning correct values

## Testing Plan

1. **Test Scene Continuity State**
   - Check browser console for scene continuity logs
   - Verify `previousSceneId` and `previousSceneImageUrl` are available

2. **Test First Scene Generation (T2I)**
   - Send message to trigger scene generation
   - Verify scene is created with `generation_mode: 't2i'`
   - Verify `is_first_scene: true` in database

3. **Test Second Scene Generation (I2I)**
   - Send another message to trigger second scene
   - Verify `previous_scene_id` and `previous_scene_image_url` are passed to edge function
   - Verify scene is created with `generation_mode: 'i2i'`
   - Verify correct model (`fal-ai/bytedance/seedream/v4.5/edit`) is used
   - Verify "Scene Iteration" template is used

4. **Check Edge Function Logs**
   - Monitor console logs for:
     - "Previous scene verified" message
     - "Continuation mode: I2I from previous scene" message
     - Model override to v4.5/edit

## Next Steps

1. Run browser test to verify I2I flow
2. Check console logs for scene continuity state
3. Verify edge function receives continuity parameters
4. Check database for correct `generation_mode` values
5. Deploy `fal-image` edge function if not already deployed
