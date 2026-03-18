
# Video Character Swap — Field Name Fix v4

## Root Cause
`start_frame_num` was wrong — fal.ai API requires `start_frame_number`. All frame positioning was silently ignored. Additionally, `conditioning_type`, `preprocess`, `limit_num_frames` are not in the LTX MultiCondition schema.

## Changes Made (v4)

### A) ✅ Field name fix: `start_frame_num` → `start_frame_number`
- `src/hooks/useLibraryFirstWorkspace.ts` — images[] and videos[] arrays
- `supabase/functions/fal-image/index.ts` — signing, sanitization, logging
- `src/lib/services/ClipOrchestrationService.ts` — all frame references

### B) ✅ Removed unsupported video conditioning fields
- Removed `conditioning_type`, `preprocess`, `limit_num_frames`, `max_num_frames` from character-swap videos[]
- Only `video_url`, `start_frame_number`, `strength` sent (per official API schema)

### C) ✅ Tuned strengths per fal.ai best practices
- Image anchors: F0=0.85, mid=0.5, end=0.4 (was all 1.0)
- Video conditioning: strength=0.7 (was 0.8)
- "Layer conditioning strategically" — high start, lower later anchors

### D) ✅ Updated preflight UI
- Shows anchor strengths and video strength instead of "Pose mode"

## Expected Payload After Fix
```json
{
  "images": [
    { "image_url": "...", "start_frame_number": 0, "strength": 0.85 },
    { "image_url": "...", "start_frame_number": 56, "strength": 0.5 },
    { "image_url": "...", "start_frame_number": 120, "strength": 0.4 }
  ],
  "videos": [{
    "video_url": "...",
    "start_frame_number": 0,
    "strength": 0.7
  }],
  "prompt": "..."
}
```
