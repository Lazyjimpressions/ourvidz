

# Fix: Video Placeholder SVG Sent to fal.ai as Motion Reference

## Root Cause

The fal.ai 422 error is caused by `/video-thumbnail-placeholder.svg` being sent as the video URL in the `videos[]` array. This happens because **SharedGrid.tsx drag data includes the thumbnail/placeholder URL instead of the actual video storage path**.

In `SharedGrid.tsx` line 387-390:
```typescript
const displayUrl = asset.thumbUrl || generatedVideoThumbnail || (asset.type === 'image' ? fallbackUrl : null);
e.dataTransfer.setData('application/x-ref-image', JSON.stringify({
  url: displayUrl || '',  // ← This is the THUMBNAIL, not the video
  ...
}));
```

For video assets without thumbnails, `displayUrl` resolves to `null` (because of the `asset.type === 'image'` guard). Then `url` becomes `''`. But the motion ref drop handler at line 849 accepts any truthy `url` — and in cases where the thumbnail is the placeholder SVG (`/video-thumbnail-placeholder.svg`), that gets passed through to the generation pipeline.

The edge function then tries to sign `/video-thumbnail-placeholder.svg` as a storage path, fails ("Object not found"), and sends the raw relative path to fal.ai which rejects it.

## Fix

### 1. SharedGrid.tsx — Include `originalPath` in drag data

Add `originalPath` to the drag transfer data so consumers can use the real storage path for video assets:

```typescript
e.dataTransfer.setData('application/x-ref-image', JSON.stringify({
  url: displayUrl || '',
  originalPath: asset.originalPath || '',  // ← ADD THIS
  assetId: asset.id,
  type: asset.type,
}));
```

### 2. MobileSimplePromptInput.tsx — Use `originalPath` for motion ref drops

In the motion ref drop handler (line 846-853), prefer `originalPath` over `url` for video assets:

```typescript
const refData = e.dataTransfer.getData('application/x-ref-image');
if (refData) {
  try {
    const { url, originalPath, type } = JSON.parse(refData);
    const videoUrl = originalPath || url;
    if (videoUrl && !videoUrl.includes('placeholder')) {
      onMotionRefVideoUrlChange?.(videoUrl);
    }
  } catch { /* ignore */ }
  return;
}
```

### 3. MobileSimplePromptInput.tsx — Same fix for QuickBar motion ref drop

The same drop handler pattern exists in the QuickBar's inline motion ref zone. Apply the same `originalPath` preference there.

### 4. Guard in useLibraryFirstWorkspace.ts (defense in depth)

Before setting `inputObj.videos`, validate the URL isn't a placeholder:

```typescript
if (motionRefVideoUrl && !motionRefVideoUrl.includes('placeholder')) {
  inputObj.videos = [{ video_url: stripToStoragePath(motionRefVideoUrl), ... }];
}
```

## Files to Change

| File | Change |
|------|--------|
| `src/components/shared/SharedGrid.tsx` | Add `originalPath` to drag transfer data |
| `src/components/workspace/MobileSimplePromptInput.tsx` | Use `originalPath` for motion ref drops; reject placeholder URLs |
| `src/hooks/useLibraryFirstWorkspace.ts` | Add placeholder guard before building `videos[]` |

