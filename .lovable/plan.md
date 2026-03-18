
# Video Character Swap via Existing Workspace — IMPLEMENTED

## Summary

Character swap is supported natively through the existing Video Multi Mode workflow. No new UI panels needed. Two gaps were closed:

## Changes Made

### 1. ✅ `reference_images` bucket increased to 200MB
- Migration: `UPDATE storage.buckets SET file_size_limit = 209715200 WHERE name = 'reference_images'`
- Supports HD dance/source video uploads

### 2. ✅ LTX MultiCondition pricing added to `fal-image`
- Added `'fal-ai/ltx-video-13b-distilled/multiconditioning': 0.20` to `FAL_PRICING` map
- Ensures accurate cost tracking

### 3. ✅ Character swap hint in `MobileSettingsSheet`
- When both a motion reference video AND an image keyframe are loaded, shows:
  "✨ Character swap mode — appearance from image, motion from video"

### 4. ✅ Library "Videos" tab added
- 4th tab in `UpdatedOptimizedLibrary.tsx` filtering by `asset.type === 'video'`
- Grid changed from `grid-cols-3` to `grid-cols-4` to accommodate
- Users can now browse saved videos separately for reuse as motion references

### 5. ✅ Video thumbnail generation improved
- `SharedGrid.tsx` now generates video thumbnails eagerly on mount
- Previously required visibility intersection before triggering
- Videos show thumbnails faster instead of blank tiles

## User Workflow: Character Swap

1. Switch to **Video mode** in workspace
2. Load character portrait into **Start keyframe slot** (appearance anchor)
3. Load dance/source video into **Motion Reference** drop zone
4. Write a prompt describing the scene
5. Hit **Generate** — LTX MultiCondition auto-selected via smart model switching
6. Save result to Library → appears in **Videos** tab for reuse

## User Workflow: Loading Source Videos

1. Upload video via Motion Reference "Upload file" or drag-drop into workspace
2. After generation, save the result to Library via the Save button on the tile
3. Browse saved videos in Library → **Videos** tab
4. Use `ImagePickerDialog` with `mediaType="video"` to select from library later

## Files Modified
- `supabase/functions/fal-image/index.ts` — Added pricing entries
- `src/components/workspace/MobileSettingsSheet.tsx` — Added contextual swap hint
- `src/components/library/UpdatedOptimizedLibrary.tsx` — Added Videos tab
- `src/components/shared/SharedGrid.tsx` — Eager video thumbnail generation
- DB: `reference_images` bucket file_size_limit → 200MB
