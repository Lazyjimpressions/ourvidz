
# Video Character Replacement via LTX 13B MultiCondition — IMPLEMENTED

## Summary

Character swap is supported natively through the existing Video Multi Mode workflow — no new UI panels needed.

## Changes Made

### 1. ✅ `reference_images` bucket increased to 200MB
- Migration: `UPDATE storage.buckets SET file_size_limit = 209715200 WHERE name = 'reference_images'`
- Supports HD dance/source video uploads

### 2. ✅ LTX MultiCondition pricing added to `fal-image`
- Added `'fal-ai/ltx-video-13b-distilled/multiconditioning': 0.20` and normalized variant to `FAL_PRICING` map
- Ensures accurate cost tracking instead of falling back to `default_video`

### 3. ✅ Character swap hint in `MobileSettingsSheet`
- When both a motion reference video AND an image keyframe are loaded, the Motion Reference section shows:
  "✨ Character swap mode — appearance from image, motion from video"
- Otherwise shows default: "Optional video to guide movement and camera"

### 4. ✅ LTX MultiCondition model verified in `api_models`
- `id: 0fae432e-d8a1-4d71-a4a2-0276394d2ca8`
- `tasks: ['multi']`, `default_for_tasks: ['multi']`, `is_active: true`, `is_default: true`
- Already fully wired through `fal-image` edge function

## How Users Perform Character Swap

1. Switch to **Video mode** in workspace
2. Load character portrait into **Start keyframe slot** (appearance anchor)
3. Load dance/source video into **Motion Reference** drop zone
4. Write a prompt (e.g., "A woman dancing energetically, same appearance as the input image, matching choreography of reference video")
5. Hit **Generate** — LTX MultiCondition auto-selected via smart model switching

## Files Modified
- `supabase/functions/fal-image/index.ts` — Added pricing entries
- `src/components/workspace/MobileSettingsSheet.tsx` — Added contextual swap hint
- DB: `reference_images` bucket file_size_limit → 200MB
