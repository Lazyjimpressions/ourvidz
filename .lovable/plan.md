
# Video Character Swap — Fix: Conditioning Quality

## Problem
Character swap was technically working (images[] + videos[] reaching fal.ai correctly) but output didn't retain character identity because:
1. `aspect_ratio` was overwritten from `"auto"` to `"1:1"` by metadata in edge function
2. Single image anchor drifted toward motion-video subject over time
3. Hint-only prompts ("Same appearance...") gave model no scene intent

## Changes Made

### 1. ✅ Edge function: aspect_ratio guard (`fal-image/index.ts`)
- When `images[]` is present (MultiCondition), force `aspect_ratio: "auto"` regardless of metadata
- Prevents metadata `aspectRatio` from overwriting the client's explicit `"auto"` setting
- Added logging for verification

### 2. ✅ Identity-lock: end-frame duplication (`useLibraryFirstWorkspace.ts`)
- When exactly 1 image keyframe + motion video, auto-duplicates the portrait to the last frame
- Only triggers when end-keyframe slot is empty (manual end-ref takes priority)
- Anchors character identity at both start AND end, reducing drift

### 3. ✅ Prompt guard: no empty/hint-only submissions (`MobileSimplifiedWorkspace.tsx`)
- `useEffect` augmentation now skips empty prompts — user must type scene description first
- Hints only append once user has written something meaningful

### 4. ✅ Submit validation: hint-only detection (`MobileSimplePromptInput.tsx`)
- Detects character-swap mode (image ref + motion video)
- Blocks generation if prompt is only boilerplate hints with no scene intent
- Shows clear error: "Describe the scene — hints alone aren't enough"

## Expected Payload After Fix
```json
{
  "aspect_ratio": "auto",
  "images": [
    { "image_url": "...", "start_frame_num": 0, "strength": 1 },
    { "image_url": "...", "start_frame_num": 119, "strength": 1 }
  ],
  "videos": [{ "video_url": "...", "start_frame_num": 0 }],
  "prompt": "woman dancing in studio. Same appearance as the input image, matching choreography of reference video"
}
```
