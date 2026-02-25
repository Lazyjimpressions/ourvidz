

# Video Extend: Tail-Conditioning Fix with Server-Side Start Frame Computation

## Problem Summary
The extend model conditions on the **beginning** of the source video because `start_frame_num` defaults to 0. For a 15s video, this means the model sees the first ~1.6s and generates continuation from there -- not from the end. The user expects their video to be extended from where it left off.

## User Workflow (Current vs Fixed)

**Current**: User uploads 15s video -> model reads frames 0-47 -> generates 5s continuation of the opening -> user gets a 5s clip that continues the beginning, not the end.

**Fixed**: User uploads 15s video -> client measures duration (15s) -> edge function computes tail offset (15s x 30fps = 450 frames, start at frame 400) -> model reads last 48 frames -> generates 5s continuation from the ending -> user gets a 5s clip that seamlessly continues where their video left off.

**Constraint**: Each extend call produces up to ~5.3s of new footage. To make a 15s video into 20s, the user would need to stitch the original + extension (future feature). For now, they get the continuation clip and can "Extend Again" iteratively.

## Changes

### 1. Client: Capture source video duration on upload
**File:** `src/components/workspace/MobileSimplePromptInput.tsx` (~line 286)

After uploading the video file, probe its duration using a temporary `<video>` element:

```typescript
const videoDurationMs = await new Promise<number>((resolve) => {
  const vid = document.createElement('video');
  vid.preload = 'metadata';
  vid.onloadedmetadata = () => {
    resolve(vid.duration);
    URL.revokeObjectURL(vid.src);
  };
  vid.onerror = () => resolve(0);
  vid.src = URL.createObjectURL(file);
});
```

Store this as `sourceVideoDuration` state (new prop threaded up to the workspace hook) so the generation payload can include it.

### 2. Client: Pass source duration in generation payload
**File:** `src/hooks/useLibraryFirstWorkspace.ts` (~line 1442)

When building the extend payload, include the source video duration:

```typescript
if (isExtendModel && refImageUrl) {
  inputObj.video = stripToStoragePath(refImageUrl);
  inputObj.source_video_duration = sourceVideoDuration || 0;
  if (extendReverseVideo) inputObj.reverse_video = true;
  if (extendCrf !== 35) inputObj.constant_rate_factor = extendCrf;
}
```

### 3. Edge Function: Compute tail start_frame_num and build full conditioning object
**File:** `supabase/functions/fal-image/index.ts` (~line 451)

Replace the simple `modelInput.video = { video_url }` with full tail-conditioning logic:

```typescript
// Build VideoConditioningInput with tail-conditioning
const fps = modelInput.frame_rate || 30;
const maxCondFrames = 48; // ~1.6s conditioning window
const sourceDuration = body.input.source_video_duration || 0;
const totalFrames = sourceDuration > 0 ? Math.round(sourceDuration * fps) : 0;

let startFrameNum = 0;
if (totalFrames > maxCondFrames) {
  // Tail-conditioning: start from the end minus overlap
  startFrameNum = Math.floor((totalFrames - maxCondFrames) / 8) * 8;
}

modelInput.video = {
  video_url: videoUrl,
  start_frame_num: startFrameNum,
  max_num_frames: maxCondFrames,
  limit_num_frames: true,
  conditioning_type: "rgb",
  strength: 1,
};
```

This ensures: short videos (under ~1.6s) use all frames; longer videos condition on the tail only.

### 4. Webhook: Store source metadata for "Extend Again" chaining
**File:** `supabase/functions/fal-webhook/index.ts` (~line 190)

When `generation_mode` includes `extend`, persist source info in `generation_settings`:

```typescript
generation_settings: {
  ...existingSettings,
  ...(generationMode?.includes('extend') && {
    is_extend_result: true,
    source_video_url: job.metadata?.start_reference_url,
    conditioning_settings: {
      start_frame_num: startFrameNum,
      max_num_frames: 48,
    },
  }),
}
```

### 5. UI: Update tooltip copy
**File:** `src/components/workspace/MobileSettingsSheet.tsx`

Update the "Extend by" tooltip:
- From: *"Amount of new footage to add to your video (up to ~5s)"*
- To: *"Generates up to ~5s of continuation footage conditioned on the end of your source video. The output may include brief overlap frames for continuity."*

### 6. State threading for sourceVideoDuration
**Files:** `MobileSimplePromptInput.tsx`, `MobileSimplifiedWorkspace.tsx`, `useLibraryFirstWorkspace.ts`

- Add `sourceVideoDuration` state in the workspace hook (default 0)
- Thread it from `MobileSimplePromptInput` (where the video file is uploaded and probed) up through `MobileSimplifiedWorkspace` to the generation payload

## Files to Change

| File | Change |
|------|--------|
| `src/components/workspace/MobileSimplePromptInput.tsx` | Probe video duration on upload; call new `onSourceVideoDuration` callback |
| `src/pages/MobileSimplifiedWorkspace.tsx` | Thread `sourceVideoDuration` state between prompt input and workspace hook |
| `src/hooks/useLibraryFirstWorkspace.ts` | Accept `sourceVideoDuration`; include in extend payload as `source_video_duration` |
| `supabase/functions/fal-image/index.ts` | Compute `start_frame_num` from source duration; build full `VideoConditioningInput` |
| `supabase/functions/fal-webhook/index.ts` | Store `is_extend_result`, `source_video_url`, and `conditioning_settings` in asset metadata |
| `src/components/workspace/MobileSettingsSheet.tsx` | Update tooltip to mention tail-conditioning and possible overlap |

## Why Option B (server-side computation) over Option A (client-side trimming)

Client-side video trimming requires either Canvas frame extraction or MediaRecorder APIs, which are unreliable on mobile Safari and add significant complexity. Computing `start_frame_num` server-side from the known duration is an approximation (could be off by a few frames for variable-rate video) but is robust, simple, and works on all browsers. If the approximation proves insufficient, we can add client-side trimming later as an enhancement.
