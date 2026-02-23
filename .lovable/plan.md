

# Wire Up MultiCondition: images[] Array from Client to Edge Function

## Problem

The MultiCondition model (`fal-ai/ltx-video-13b-distilled/multiconditioning`) expects an `images` array with temporal frame positions, but:

1. **Client side** (`useLibraryFirstWorkspace.ts` line 868-873): The end reference image is explicitly dropped for all API video models with the message "End reference ignored for API video model"
2. **Client side** (line 1362-1378): Only a single `image_url` string is sent -- never an `images[]` array
3. **Edge function** (`fal-image/index.ts` line 495): The `alwaysAllowed` set doesn't include `images` or `videos`, so even if sent, they'd be stripped by schema filtering
4. **Edge function**: No code exists to sign URLs inside an `images[]` array

## Changes

### 1. `src/types/videoSlots.ts` (NEW FILE)

Create the `VideoRefSlot` interface and `autoSpaceFrames` utility:

```typescript
export interface VideoRefSlot {
  url: string | null;
  isVideo: boolean;
  frameNum: number; // 0-160, multiples of 8
}

export function autoSpaceFrames(count: number, maxFrame: number = 160): number[] {
  if (count <= 1) return [0];
  const step = Math.floor(maxFrame / (count - 1) / 8) * 8;
  return Array.from({ length: count }, (_, i) => Math.min(i * step, maxFrame));
}

export function getFrameLabel(frameNum: number): string {
  return `F${frameNum}`;
}
```

### 2. `src/hooks/useLibraryFirstWorkspace.ts`

**a) Remove the "end reference ignored" block (lines 867-874)**

Stop dropping the end reference for API models. Instead, compute `endRefUrl` for all video modes:

```typescript
// Before (drops end ref for API):
const endRefUrl = (mode === 'video' && isLocalRoute) ? ... : undefined;

// After (always compute):
const endRefUrl = mode === 'video'
  ? (overrideEndingRefImageUrl || endingRefImageUrl || ...)
  : undefined;
```

**b) Add MultiCondition detection and images[] construction (lines 1362-1378)**

After the existing extend/i2v logic, add a branch for multi:

```typescript
if (isFalVideo) {
  const refImageUrl = startRefUrl || effRefUrl;
  const isExtendModel = cachedCaps?.input_schema?.video?.required === true;
  const isMultiModel = selectedModel.tasks?.includes('multi') || 
                       cachedCaps?.input_schema?.images !== undefined;

  if (isExtendModel && refImageUrl) {
    // Existing extend logic...
    inputObj.video = refImageUrl;
    if (extendReverseVideo) inputObj.reverse_video = true;
  } else if (isMultiModel && refImageUrl && endRefUrl) {
    // MultiCondition: build images[] with temporal positions
    const filledUrls = [refImageUrl, endRefUrl].filter(Boolean);
    const frames = autoSpaceFrames(filledUrls.length, 
      cachedCaps?.input_schema?.num_frames?.max || 160);
    inputObj.images = filledUrls.map((url, i) => ({
      url, start_frame_num: frames[i]
    }));
    // Don't set image_url -- multi uses images[] array
    delete inputObj.image_url;
  } else if (refImageUrl) {
    inputObj.image_url = refImageUrl; // Standard I2V
  }
  inputObj.duration = videoDuration || 5;
}
```

### 3. `supabase/functions/fal-image/index.ts`

**a) Add `images` and `videos` to `alwaysAllowed` (line 495)**

```typescript
// Before:
const alwaysAllowed = new Set(['prompt', 'image_url', 'image_urls', 'video']);

// After:
const alwaysAllowed = new Set(['prompt', 'image_url', 'image_urls', 'video', 'images', 'videos']);
```

**b) Add images[] URL signing block (after the I2V image_url block, around line 457-466)**

Inside the `isVideo` section, add handling for the `images` array before the single `image_url` fallback:

```typescript
// MultiCondition: images[] array with temporal frame positions
if (body.input.images && Array.isArray(body.input.images)) {
  const signedImages = [];
  for (const img of body.input.images) {
    const signed = await signIfStoragePath(supabase, img.url, 'user-library');
    if (signed) {
      signedImages.push({ url: signed, start_frame_num: img.start_frame_num || 0 });
    }
  }
  if (signedImages.length > 0) {
    modelInput.images = signedImages;
    delete modelInput.image_url;
    console.log(`✅ MultiCondition: ${signedImages.length} temporal images set`);
  }
}

// MultiCondition: videos[] array
if (body.input.videos && Array.isArray(body.input.videos)) {
  const signedVideos = [];
  for (const vid of body.input.videos) {
    const url = typeof vid === 'string' ? vid : vid.url;
    const signed = await signIfStoragePath(supabase, url, 'reference_images');
    if (signed) signedVideos.push({ url: signed });
  }
  if (signedVideos.length > 0) {
    modelInput.videos = signedVideos;
    console.log(`✅ MultiCondition: ${signedVideos.length} video refs set`);
  }
}
```

## Files Summary

| File | Action | What |
|------|--------|------|
| `src/types/videoSlots.ts` | Create | VideoRefSlot, autoSpaceFrames utility |
| `src/hooks/useLibraryFirstWorkspace.ts` | Modify | Stop dropping end ref; detect multi model; build images[] array with frame positions |
| `supabase/functions/fal-image/index.ts` | Modify | Sign URLs in images[]/videos[] arrays; add to alwaysAllowed set |

## What This Enables

- Start + End images are sent as `images: [{ url, start_frame_num: 0 }, { url, start_frame_num: 160 }]`
- The MultiCondition model receives properly signed temporal references
- Standard I2V (single ref) and Extend flows remain unchanged
- Foundation is laid for the full 10-slot timeline UI (next phase)

