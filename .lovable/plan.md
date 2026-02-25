

# Fix: Source Video Duration Not Reaching Edge Function

## Root Cause

The tail-conditioning logic in the edge function is working correctly, BUT it receives `source_video_duration: 0` because the duration probing only runs when a user **uploads a video file from their device**. When a video is selected **from the library/workspace** (the most common extend workflow), no `File` object exists -- only a URL -- so the HTML5 video probe never fires.

The edge function log proves this:
```
Video extend: duration=0s, totalFrames=0, startFrame=0, maxCond=48
```

With `totalFrames=0`, the tail computation falls through to `startFrame=0`, conditioning from the beginning of the video -- exactly the pre-fix behavior.

## Fix: Probe Duration from URL (Not Just File)

### 1. Add URL-based duration probing
**File:** `src/components/workspace/MobileSimplePromptInput.tsx`

When a video reference is set via URL (from library, workspace, or "Use as Reference"), probe its duration using the same `<video>` element technique but with the URL instead of a blob:

```typescript
// Probe duration from URL for videos used as extend references
const probeVideoDurationFromUrl = async (url: string): Promise<number> => {
  return new Promise((resolve) => {
    const vid = document.createElement('video');
    vid.preload = 'metadata';
    vid.crossOrigin = 'anonymous';
    vid.onloadedmetadata = () => {
      resolve(isFinite(vid.duration) ? vid.duration : 0);
    };
    vid.onerror = () => resolve(0);
    vid.src = url;
  });
};
```

### 2. Call the probe when a library video is set as reference
**File:** `src/pages/MobileSimplifiedWorkspace.tsx`

In the `handleUseAsReference` callback (~line 130), after setting the reference URL for a video asset, probe its duration:

```typescript
case 'single':
  setReferenceImage(null);
  setReferenceImageUrl(url);
  // If this is a video URL, probe its duration for extend tail-conditioning
  if (url && (asset?.type === 'video' || url.includes('.mp4'))) {
    probeAndSetDuration(url);
  }
  break;
case 'start':
  setBeginningRefImage(null);
  setBeginningRefImageUrl(url);
  if (url && (asset?.type === 'video' || url.includes('.mp4'))) {
    probeAndSetDuration(url);
  }
  break;
```

The `probeAndSetDuration` helper fetches metadata from the signed URL and calls `setSourceVideoDuration`.

### 3. Also probe when the extend model auto-switches from file upload
**File:** `src/components/workspace/MobileSimplePromptInput.tsx`

The existing file-based probe (lines 290-308) is correct but may fail on some mobile browsers for large files. Add a fallback: if file probe returns 0, try probing from the uploaded signed URL after upload completes (~line 310-320).

## Files to Change

| File | Change |
|------|--------|
| `src/pages/MobileSimplifiedWorkspace.tsx` | Add `probeAndSetDuration` helper; call it in `handleUseAsReference` for video URLs |
| `src/components/workspace/MobileSimplePromptInput.tsx` | Extract `probeVideoDurationFromUrl` as a shared utility; add fallback URL probe after file upload |

## What This Fixes

- Library videos selected for extend will have their duration probed from the signed URL
- The edge function will receive the actual duration (e.g., 15s)
- Tail-conditioning will compute the correct `start_frame_num` (e.g., frame 400 for a 15s video)
- The model will condition on the last ~1.6s of the source video and generate continuation from the ending
