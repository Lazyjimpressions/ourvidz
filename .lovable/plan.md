

## Fix: Videos Downloading as QuickTime

### Problem

Line 187 in `UpdatedOptimizedLibrary.tsx` extracts the extension from `mimeType` by splitting on `/`:
```typescript
asset.mimeType.split('/').pop()  // "video/quicktime" → "quicktime"
```

This produces a `.quicktime` extension. The browser associates this with QuickTime Player instead of treating it as a standard `.mp4` or `.mov` file.

The same issue exists in `AssetMappers.ts`'s `resolveFileExtension` helper — it would pass through `"quicktime"` as a valid extension.

### Fix

#### 1. `src/lib/services/AssetMappers.ts` — Add MIME-to-extension normalization

Add a mapping for non-standard MIME suffixes in `resolveFileExtension`:
```typescript
const mimeExtMap: Record<string, string> = {
  quicktime: 'mov',
  'x-matroska': 'mkv',
  'x-msvideo': 'avi',
  'x-ms-wmv': 'wmv',
};
```

When extracting from MIME type, look up the map before returning raw suffix.

#### 2. `src/components/library/UpdatedOptimizedLibrary.tsx` — Same normalization in download

Apply the same mapping in the inline `ext` resolution on line 187 so `"quicktime"` becomes `"mov"`.

#### 3. `src/pages/MobileSimplifiedWorkspace.tsx` — Same fix on line 1034

The workspace download also needs the normalization for consistency.

### Files Changed

| File | Change |
|------|--------|
| `src/lib/services/AssetMappers.ts` | Add MIME suffix normalization map in `resolveFileExtension` |
| `src/components/library/UpdatedOptimizedLibrary.tsx` | Normalize MIME suffix in download extension logic |
| `src/pages/MobileSimplifiedWorkspace.tsx` | Normalize MIME suffix in workspace download |

