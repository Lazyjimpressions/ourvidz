
# Video Character Swap — Pose Conditioning Fix v3

## Root Cause
Payload structure was correct but `videos[]` defaulted to `conditioning_type="rgb"` (full RGB preservation), overpowering image identity anchors. Edge function also stripped conditioning fields.

## Changes Made (v3)

### A) ✅ Pose conditioning in frontend (`useLibraryFirstWorkspace.ts`)
- Character-swap mode (images + motion video) now sends `conditioning_type: "pose"`, `preprocess: true`, `strength: 0.8`, `limit_num_frames: true`
- Non-char-swap flows keep default behavior

### B) ✅ Triple identity anchors (`useLibraryFirstWorkspace.ts`)
- Single-image char-swap now places 3 anchors: start (F0), mid (~F60), end (F120)
- Reduces mid-clip identity drift

### C) ✅ Edge function pass-through (`fal-image/index.ts`)
- `videos[]` mapping now preserves: `conditioning_type`, `preprocess`, `strength`, `limit_num_frames`, `max_num_frames`
- Enum validation for conditioning_type (rgb/pose only)
- Enhanced logging of conditioning params

### D) ✅ Preflight UI indicator (`MobileSimplePromptInput.tsx`)
- "🎭 Character Swap Active • Pose mode • Identity anchors: start/mid/end" shown when char-swap conditions met

## Expected Payload After Fix
```json
{
  "images": [
    { "image_url": "...", "start_frame_num": 0, "strength": 1 },
    { "image_url": "...", "start_frame_num": 56, "strength": 1 },
    { "image_url": "...", "start_frame_num": 120, "strength": 1 }
  ],
  "videos": [{
    "video_url": "...",
    "start_frame_num": 0,
    "conditioning_type": "pose",
    "preprocess": true,
    "strength": 0.8,
    "limit_num_frames": true
  }],
  "prompt": "woman dancing in studio. Same appearance as the input image, matching choreography of reference video"
}
```
