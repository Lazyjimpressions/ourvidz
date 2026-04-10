

## Fix: Images Downloading as `.image`

### Root Cause

In `src/lib/services/AssetMappers.ts` line 247, the `format` field falls back to `asset.type`:

```typescript
format: asset.format || asset.type,  // asset.type = "image" → format = "image"
```

Then in `UpdatedOptimizedLibrary.tsx` line 184, the download filename uses `format` as the extension:

```typescript
a.download = `${asset.title || asset.id}.${asset.format || ...}`;
// Result: "my-photo.image" instead of "my-photo.jpg"
```

The `format` field contains `"image"` (the asset type) instead of a proper file extension like `"png"` or `"jpg"`.

### Fix

#### 1. AssetMappers.ts — Sanitize `format` to a real extension

Add a helper that extracts a proper file extension from the `format`, `mimeType`, or `type` fields. If `format` equals `"image"` or `"video"` (i.e., it's just the type, not a real format), fall back to the mime type or sensible defaults (`png` for images, `mp4` for videos).

#### 2. UpdatedOptimizedLibrary.tsx — Defensive extension logic in download

Add a small utility at the download call site that ensures the extension is never `"image"` or `"video"`:

```typescript
const getExtension = (asset: any) => {
  const fmt = asset.format;
  if (fmt && !['image', 'video'].includes(fmt)) return fmt;
  if (asset.mimeType) return asset.mimeType.split('/').pop(); // "image/png" → "png"
  return asset.type === 'video' ? 'mp4' : 'png';
};
```

#### 3. Audit other download locations

Apply the same fix to:
- `GeneratedImagesDisplay.tsx` (hardcoded `.jpg` — acceptable but could use mime)
- `GeneratedImageGallery.tsx` (hardcoded `.png` — fine)
- `MessageActions.tsx` / `ChatMessage.tsx` (hardcoded `.png` — fine)
- `PortraitGallery.tsx` — check if it has the same issue

### Files Changed

| File | Change |
|------|--------|
| `src/lib/services/AssetMappers.ts` | Sanitize `format` so it never stores raw type strings like `"image"` |
| `src/components/library/UpdatedOptimizedLibrary.tsx` | Add defensive extension resolution in `handleDownload` |

