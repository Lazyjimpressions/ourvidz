

## Fix: Blank Video Tiles in Workspace and Library

### Root Cause

Two interacting bugs prevent video thumbnails from displaying:

**Bug 1: Placeholder SVG blocks client-side thumbnail generation**

In `useSignedAssets.ts` (line 181-183), when a video has no `thumbPath`, the code sets:
```typescript
thumbUrl = '/video-thumbnail-placeholder.svg';
```

Then in `SharedGridCard` (line 330-334), the client-side video thumbnail generator checks:
```typescript
if (asset.type === 'video' && !asset.thumbUrl && ...)
```

Since `thumbUrl` is already set to the placeholder SVG, this condition is **always false** — the client-side canvas-capture thumbnail generation never runs.

**Bug 2: The placeholder SVG file doesn't exist**

The code references `/video-thumbnail-placeholder.svg` but the actual file in `public/system_assets/` is `video-thumbnail-placeholder.png`. So even the placeholder itself shows a broken image (blank tile).

### Fix

**File: `src/lib/hooks/useSignedAssets.ts`** (line 181-183)

Remove the placeholder fallback for videos. Instead of assigning a fake SVG path, leave `thumbUrl` as `null` so `SharedGridCard`'s client-side thumbnail generation can trigger:

```typescript
// REMOVE this block:
if (asset.type === 'video' && !thumbUrl && !asset.thumbPath) {
  thumbUrl = '/video-thumbnail-placeholder.svg';
}
```

This allows the existing `SharedGridCard` useEffect (lines 330-364) to:
1. Sign the video's `originalPath`
2. Create an off-screen `<video>` element
3. Capture a canvas frame at 10% of duration
4. Set the data URL as the thumbnail

**File: `src/components/shared/SharedGrid.tsx`** (line 434)

Update the display URL logic to also use `generatedVideoThumbnail` for videos (already works, no change needed — just confirming the fallback chain is correct once the placeholder is removed).

**File: `src/lib/services/UnifiedUrlService.ts`** (lines 146-149, 312, 316, 320)

Replace all references to `/video-thumbnail-placeholder.svg` with `null` so downstream consumers can trigger client-side generation instead of showing a broken image.

**File: `src/archive/components/workspace/ContentCard.tsx`** and **`src/hooks/useRecentScenes.ts`**

Update remaining SVG references to either `null` or the correct PNG path if a static fallback is needed.

### Summary

| File | Change |
|------|--------|
| `useSignedAssets.ts` | Remove placeholder SVG assignment for videos (return `null` instead) |
| `UnifiedUrlService.ts` | Replace SVG placeholder refs with `null` |
| `useRecentScenes.ts` | Fix placeholder path |
| Archive files | Fix placeholder path (low priority) |

The core fix is a single 3-line deletion in `useSignedAssets.ts`. Once `thumbUrl` is `null` for videos, the existing client-side thumbnail generator in `SharedGridCard` kicks in automatically.

