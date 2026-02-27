

# LTX MultiCondition: Full Capability Review and UI Integration Plan

## Current State

The LTX 13B MultiCondition API accepts **both** `images[]` and `videos[]` arrays for conditioning, allowing mixed-media temporal keyframes. Our system currently:

- Builds the `images[]` array correctly with `image_url` and `start_frame_num`
- Has per-keyframe `strength` sliders in the Settings Sheet UI
- **But drops `strength`** when passing to the edge function (only `image_url` + `start_frame_num` are sent)
- **Never builds a `videos[]` array** from the workspace -- video references in slots are treated as images or ignored
- Has video slot indicators (`isVideo` flag) in the QuickBar but no code path to route them into `videos[]`
- Misses several useful API parameters: `enable_detail_pass`, `temporal_adain_factor`, `tone_map_compression_ratio`, `first/second_pass_num_inference_steps`

## Use Cases This Unlocks

1. **Identity Lock + Motion Transfer**: Drop a character portrait at Frame 0, a motion reference video, and an end-pose image at Frame 120 -- the model interpolates identity from the images while copying motion dynamics from the video
2. **Style Transfer via Video**: Use a short stylized clip as a video condition to transfer its visual language onto prompted content
3. **Multi-character scenes**: Place different character reference images at different temporal positions with varying strengths
4. **Detail Pass**: Enable a second refinement pass (2x cost) for higher-quality output via `enable_detail_pass`

## Proposed Changes

### 1. Edge Function: Pass `strength` through for images

The `fal-image/index.ts` MultiCondition handler (line 516) currently drops `strength`. Update to:

```text
signedImages.push({
  image_url: signed,
  start_frame_num: img.start_frame_num || 0,
  strength: img.strength ?? 1,
});
```

This makes the per-keyframe strength sliders already in the Settings Sheet actually functional.

### 2. Client: Route video slots into `videos[]` array

In `useLibraryFirstWorkspace.ts` (around line 1455-1482), the MultiCondition branch gathers all filled slots into `images[]`. Update to split entries by media type:

- Check each slot's `isVideo` flag (already tracked in `videoRefSlots`)
- Image entries go to `inputObj.images`
- Video entries go to `inputObj.videos` (new array, matching `{ url: signedUrl }` format the API expects)

This requires passing the `isVideo` metadata for each slot into the generation function, which means threading it through from `MobileSimplePromptInput`'s `videoRefSlots` into the hook.

### 3. Edge Function: Pass video `strength` and frame fields

The `videos[]` handler in `fal-image/index.ts` (lines 528-538) currently only passes `{ url }`. The API likely supports additional conditioning fields for videos similar to images. Update to pass through any extra fields (`start_frame_num`, `strength`) if provided.

### 4. Settings Sheet: Add MultiCondition-specific controls

Add a collapsible "Advanced Video" section (visible only when multi task is active) to `MobileSettingsSheet.tsx`:

| Control | API Field | UI Element | Default |
|---------|-----------|------------|---------|
| Detail Pass | `enable_detail_pass` | Toggle switch | Off |
| CRF | `constant_rate_factor` | Slider (20-60) | 29 |
| Temporal AdaIN | `temporal_adain_factor` | Slider (0-1) | 0.5 |
| Tone Map Compression | `tone_map_compression_ratio` | Slider (0-1) | 0 |
| 1st Pass Steps | `first_pass_num_inference_steps` | Slider (2-20) | 8 |
| 2nd Pass Steps | `second_pass_num_inference_steps` | Slider (2-20) | 8 |

The Detail Pass toggle should show a "(2x cost)" badge. CRF is already partially exposed for extend mode -- reuse that control.

### 5. QuickBar: Visual distinction for video vs image slots

The QuickBar already renders video thumbnails with a Film icon overlay when `isVideo` is true. No changes needed here -- just ensure the `isVideo` flag propagates correctly when a user drops a video file into a multi-condition slot.

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/fal-image/index.ts` | Add `strength` to images[] passthrough; add fields to videos[] passthrough |
| `src/hooks/useLibraryFirstWorkspace.ts` | Split filled slots into `images[]` vs `videos[]` based on isVideo flag; pass new advanced params |
| `src/components/workspace/MobileSettingsSheet.tsx` | Add "Advanced Video" section with Detail Pass, Temporal AdaIN, Tone Map, and inference steps controls |
| `src/components/workspace/MobileSimplePromptInput.tsx` | Thread `isVideo` metadata and new advanced video params to hook |

## Sequencing

1. Edge function fix (strength passthrough) -- immediate value, unblocks existing UI
2. Client video/image split -- enables video conditioning
3. Settings Sheet advanced controls -- progressive disclosure of power-user features
4. Deploy edge function

