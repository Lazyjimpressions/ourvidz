

# Fix Library Page Runaway Loading

## Problem Summary

The library page (396 assets, growing) suffers from cascading performance issues:

1. **No pagination** -- fetches all assets in one query
2. **Upfront thumbnail signing** -- `useSignedAssets` tries to sign all 396 assets before anything renders
3. **Loading gate** -- `if (isLoading || isSigning)` blocks the entire UI until every URL is signed
4. **Missing thumbnails** -- only 37 of 396 assets have stored `thumbnail_path`, so the grid falls back to signing full originals for each card
5. **Dependency loop** -- `signedUrls` state feeds back into `pathsToSign` memo, causing redundant re-renders
6. **`toSharedFromLibrary` missing metadata** -- `roleplay_metadata` and `content_category` from the DB are not mapped into `metadata`, so tab filtering uses incomplete data

## Solution

### 1. Server-side pagination in `LibraryAssetService`

Add `limit`/`offset` parameters to `getUserLibraryAssets()`. Default page size: 40 assets.

```
getUserLibraryAssets(limit = 40, offset = 0)
  -> SELECT * FROM user_library ORDER BY created_at DESC LIMIT $limit OFFSET $offset
```

### 2. Paginated hook: update `useLibraryAssets`

Convert from a simple `useQuery` to an `useInfiniteQuery` pattern:
- First page loads immediately (40 assets)
- `fetchNextPage()` triggered by the existing `IntersectionObserver` sentinel
- Remove the manual `visibleCount` slicing -- let pagination control the batch size

### 3. Remove `isSigning` loading gate

In `UpdatedOptimizedLibrary.tsx`, change:

```
// BEFORE (blocks everything)
if (isLoading || isSigning) { return <loading skeleton> }

// AFTER (only block on initial data fetch, not signing)
if (isLoading) { return <loading skeleton> }
```

Assets render immediately with placeholder thumbnails; signed URLs fill in progressively as they arrive.

### 4. Fix `useSignedAssets` dependency loop

The root cause: `signedUrls` is in the dependency array of `pathsToSign` memo. When signing completes and updates `signedUrls`, `pathsToSign` recomputes, triggering the effect again.

Fix: Track which asset IDs have been queued for signing in a `Set` ref (not state), removing `signedUrls` from the `pathsToSign` dependency.

### 5. Fix `toSharedFromLibrary` mapper

Add `roleplay_metadata` and `content_category` to the `metadata` output so tab filtering works correctly:

```typescript
metadata: {
  ...existing fields,
  roleplay_metadata: row.roleplay_metadata,
  content_category: row.content_category
}
```

### 6. Remove `visibleCount` state and manual infinite scroll

With server-side pagination, the sentinel triggers `fetchNextPage()` instead of incrementing a local counter. This eliminates the dual-layer pagination (fetch all + slice visible).

## Files Changed

| File | Change |
|---|---|
| `src/lib/services/LibraryAssetService.ts` | Add `limit`/`offset` params to `getUserLibraryAssets`, return `{ assets, total }` |
| `src/hooks/useLibraryAssets.ts` | Convert to `useInfiniteQuery` with `fetchNextPage` |
| `src/lib/hooks/useSignedAssets.ts` | Fix dependency loop: use `queuedIds` ref instead of `signedUrls` in `pathsToSign` memo |
| `src/lib/services/AssetMappers.ts` | Add `roleplay_metadata` and `content_category` to `toSharedFromLibrary` metadata |
| `src/components/library/UpdatedOptimizedLibrary.tsx` | Remove `isSigning` gate, remove `visibleCount`, wire sentinel to `fetchNextPage()`, flatten paginated data |

## Technical Details

### `useInfiniteQuery` integration

```typescript
export function useLibraryAssets() {
  return useInfiniteQuery({
    queryKey: ['library-assets'],
    queryFn: ({ pageParam = 0 }) =>
      LibraryAssetService.getUserLibraryAssets(40, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, p) => n + p.assets.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    initialPageParam: 0,
  });
}
```

### Dependency loop fix in `useSignedAssets`

```typescript
// Track queued IDs in a ref (not state) to avoid re-render cycles
const queuedIdsRef = useRef<Set<string>>(new Set());

const pathsToSign = useMemo(() => {
  const thumbPaths: string[] = [];
  for (const asset of assets) {
    if (queuedIdsRef.current.has(asset.id)) continue; // already queued
    const p = asset.type === 'image'
      ? (asset.thumbPath || asset.originalPath)
      : asset.thumbPath;
    if (p && !p.startsWith('.') && p.includes('/')) {
      thumbPaths.push(p);
      queuedIdsRef.current.add(asset.id);
    }
  }
  return { thumbPaths };
}, [assets, refreshKey]); // signedUrls removed from deps
```

### Updated library component flow

```
1. useLibraryAssets() fetches page 1 (40 assets)
2. Map to SharedAsset via toSharedFromLibrary (now includes roleplay_metadata)
3. useSignedAssets signs only those 40 thumbnails (no dependency loop)
4. Render grid immediately (no isSigning gate)
5. Sentinel triggers fetchNextPage() -> page 2 loads -> 40 more signed
```

## Expected Impact

- **Initial load**: ~40 signing requests instead of ~396
- **Time to first paint**: Under 2 seconds (was potentially 30+ seconds)
- **No more runaway re-renders** from dependency loop
- **Tab filtering works correctly** with proper metadata mapping
- **Progressive loading** -- users see content immediately, more loads on scroll

