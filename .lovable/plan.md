
# Video Character Swap — Holistic Fix v2

## Root Causes Identified

1. **Prompt visibility regression**: UI-time hint injection was removed, so textarea never showed augmented prompt
2. **Loose appearance-hint detection**: Generic regex (`/reference image/`) skipped canonical phrase
3. **Frame math mismatch**: `duration*fps-1` → 119 → snapped to 112, but LTX 8n+1 needs frame 120
4. **Incomplete char-swap detection**: `MobileSimplePromptInput` checked image-mode refs only, missed `beginningRefImageUrl`

## Changes Made (v2)

### A) ✅ Shared utility: `src/lib/utils/characterSwapPrompt.ts`
- `augmentCharacterSwapPrompt()` — idempotent canonical phrase enforcement (strict regex)
- `hasSceneIntent()` — detects hint-only prompts
- `computeLtxNumFrames()` / `getLastValidFrame()` — correct 8n+1 math
- `snapFrameToMultipleOf8()` — clamp + snap helper

### B) ✅ UI prompt visibility: `MobileSimplifiedWorkspace.tsx`
- Restored `useEffect` that visibly augments prompt when char-swap conditions met
- Only triggers when user has written scene content (no empty-prompt pollution)
- Auto-routes model to `multi` when motion video + keyframe image detected

### C) ✅ Deterministic submit: `MobileSimplePromptInput.tsx`
- Detects char-swap using BOTH `referenceImageUrl` AND `beginningRefImageUrl`
- Augments prompt via shared utility before `onGenerate()` call
- Updates UI (`onPromptChange`) so textarea matches sent payload

### D) ✅ Generation hook safety net: `useLibraryFirstWorkspace.ts`
- Replaced loose regex with shared `augmentCharacterSwapPrompt()` utility
- Fixed frame math: uses `getLastValidFrame()` → 120 for 121-frame clip
- Identity-lock anchor now lands on correct frame (multiple of 8)

### E) ✅ Edge function defensive sanitization: `fal-image/index.ts`
- Snaps ALL `images[].start_frame_num` to nearest multiple of 8
- Clamps to [0, maxValidFrame] range
- Same sanitization for `videos[].start_frame_num`
- Logs all adjustments for debugging

## Expected Payload After Fix
```json
{
  "aspect_ratio": "auto",
  "images": [
    { "image_url": "...", "start_frame_num": 0, "strength": 1 },
    { "image_url": "...", "start_frame_num": 120, "strength": 1 }
  ],
  "videos": [{ "video_url": "...", "start_frame_num": 0 }],
  "prompt": "woman dancing in studio. Same appearance as the input image, matching choreography of reference video"
}
```
