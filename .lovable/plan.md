

## Fix: iPhone Portrait Thumbnails Not Appearing

### Root Cause Identified

The bug is in **lines 42-45** of `PortraitTile.tsx`:

```typescript
if (imageUrl.includes('?token=') || imageUrl.includes('&token=')) {
  setSignedUrl(imageUrl);
  return;  // BUG: Missing setIsLoading(false)!
}
```

Combined with `loading="lazy"` on line 105, which causes iOS Safari to never fire `onLoad` events for images in scrollable containers.

### Changes Required

**File: `src/components/shared/PortraitTile.tsx`**

1. **Add `setIsLoading(false)` to all execution paths** (lines 43-45, 52, 55, 58)
2. **Remove `loading="lazy"`** to avoid iOS Safari bug (line 105)

### Technical Details

| Line | Current | Fixed |
|------|---------|-------|
| 43-44 | `setSignedUrl(imageUrl); return;` | `setSignedUrl(imageUrl); setIsLoading(false); return;` |
| 52 | `setSignedUrl(signed);` | `setSignedUrl(signed); setIsLoading(false);` |
| 55 | `setSignedUrl(imageUrl);` | `setSignedUrl(imageUrl); setIsLoading(false);` |
| 58 | `setSignedUrl(imageUrl);` | `setSignedUrl(imageUrl); setIsLoading(false);` |
| 105 | `loading="lazy"` | Remove this attribute |

### Why This Fixes It

- **Before**: Loading state stayed `true` until timeout (2.5s) or `onLoad` (never fires on iOS)
- **After**: Loading state clears immediately when URL is ready, image renders without waiting

