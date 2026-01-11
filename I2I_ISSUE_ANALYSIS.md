# I2I Issue Analysis - Scene Template and Prompt

**Date:** 2026-01-11  
**Issue:** Scene is using "Scene Narrative - NSFW" instead of "Scene Iteration - NSFW" for I2I

## Root Cause

The database shows:
- `generation_mode: "t2i"` (should be "i2i")
- `use_i2i_iteration: "false"` (should be "true")
- `is_first_scene: "true"` (should be "false")
- `previous_scene_id: "6c8dd716-4648-4e28-89df-9233c418897f"` ✅ EXISTS
- `previous_scene_image_url: null` ❌ **THIS IS THE PROBLEM**

The previous scene (`6c8dd716-4648-4e28-89df-9233c418897f`) DOES have an `image_url` in the database:
- `image_url: "workspace-temp/3348b481-8fb1-4745-8e6c-db6e9847e429/92525029-60af-4f55-a4e8-45a099f8f1fa_1768099380936.png"`

## Why This Happens

1. **Scene Creation Timing**: The scene record is created in `character_scenes` table BEFORE the image is generated
2. **Image URL Update**: When the image completes, `fal-image` updates the `image_url` in the database
3. **Frontend Caching**: The frontend's `useSceneContinuity` hook caches the scene info (with `image_url: null`) when the scene is first created
4. **I2I Detection Failure**: When the next scene is generated, the frontend passes `previous_scene_image_url: null` to the edge function
5. **Edge Function Fallback**: The edge function's verification check fails because `previous_scene_image_url` is null, so it treats it as a first scene and uses T2I mode with "Scene Narrative" template

## The Fix

The edge function should re-verify the previous scene from the database even if `previous_scene_image_url` is null, as long as `previous_scene_id` is provided. The current code does this, but only if BOTH are provided:

```typescript
if (previousSceneId && previousSceneImageUrl) {
  // Verify the previous scene actually exists and has an image
  ...
}
```

**Solution**: The edge function should also check the database if `previousSceneId` is provided but `previousSceneImageUrl` is null, and retrieve the `image_url` from the database.

## Current Behavior

1. Frontend passes `previous_scene_id` but `previous_scene_image_url: null`
2. Edge function checks: `if (previousSceneId && previousSceneImageUrl)` → FALSE
3. Edge function treats as first scene → uses T2I mode
4. Uses "Scene Narrative" template instead of "Scene Iteration" template
5. Applies the original prompt to the reference image (which is actually the previous scene, but treated as character reference)

## Expected Behavior

1. Frontend passes `previous_scene_id` (even if `previous_scene_image_url` is null)
2. Edge function checks database for previous scene using `previous_scene_id`
3. Edge function retrieves `image_url` from database
4. Edge function verifies previous scene exists and has image
5. Edge function uses I2I mode with "Scene Iteration" template
6. Generates iterative prompt optimized for continuity
