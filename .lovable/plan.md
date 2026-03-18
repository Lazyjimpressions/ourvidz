

# Fix: Video Thumbnails Not Loading in Library Modal

## Problem

When browsing videos in the `ImagePickerDialog`, thumbnails fail to load because:

1. Video assets in `user_library` typically have no separate `thumbnail_path` -- it's null
2. The signing code falls back to `asset.thumbPath || asset.originalPath`, which resolves to the `.mp4` file path
3. The signed URL is then passed to an `<img>` tag (line 389), which cannot render `.mp4` files
4. Result: all video thumbnails show as "Failed" or broken

## Solution

Update `ImagePickerDialog.tsx` to render a `<video>` element instead of `<img>` when the asset type is `video`. The `<video>` element with `preload="metadata"` will load just the first frame as a thumbnail preview.

### File: `src/components/storyboard/ImagePickerDialog.tsx`

**Change 1**: In the asset rendering grid (~line 389-405), detect if the asset is a video and render a `<video>` element instead:

```tsx
{asset.type === 'video' ? (
  <video
    src={signedUrl}
    className="w-full h-full object-cover"
    preload="metadata"
    muted
    playsInline
    onError={(e) => {
      // same fallback logic as img
    }}
  />
) : (
  <img
    src={signedUrl}
    alt={asset.title || asset.prompt || 'Image'}
    className="w-full h-full object-cover"
    loading="lazy"
    onError={...}
  />
)}
```

**Change 2**: Add a small video icon overlay in the bottom-left corner for video assets so users can distinguish them from images at a glance. Use the existing `lucide-react` `Play` or `Film` icon.

This approach avoids needing separate thumbnail generation infrastructure -- the browser's native `<video>` element handles extracting the first frame automatically.

