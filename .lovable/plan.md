

# Fix: LTX Video 422 Error — Invalid Frame Count

## Root Cause

The edge function logs reveal:

```text
🎬 Video: 4s x 30fps = 120 frames
```

LTX models require `num_frames` to be of the form **8n + 1** (e.g., 9, 17, 25, ..., 121, 129, ..., 161). The value **120** is invalid. The model's own default is **121**, confirming this constraint.

The duration-to-frames conversion in `fal-image/index.ts` (line 483) does a simple multiply-and-round without aligning to the required pattern:

```text
let numFrames = Math.round(body.metadata.duration * frameRate);  // 4 * 30 = 120 (INVALID)
```

## Fix

In `supabase/functions/fal-image/index.ts`, after computing `numFrames`, snap to the nearest valid `8n + 1` value for LTX models:

```text
let numFrames = Math.round(body.metadata.duration * frameRate);
// LTX models require num_frames = 8n + 1
if (modelKey.includes('ltx')) {
  numFrames = Math.round((numFrames - 1) / 8) * 8 + 1;
}
// Then clamp to schema min/max as before
```

This turns 120 into 121, 150 into 153, etc.

## File to Modify

| File | Change |
|------|--------|
| `supabase/functions/fal-image/index.ts` | Add `8n+1` alignment after frame count calculation (around line 483-486) |

## Deployment

This is an edge function change -- must be deployed via the Supabase dashboard.

