

## Fix: Library Shows Only First Page & Videos Tab Empty

### Problems

1. **Only first page loads**: The infinite scroll sentinel triggers `fetchNextPage` when it enters the viewport, but if all 40 items from page 1 fit without scrolling (or the user doesn't scroll far enough), subsequent pages never load. With 429 total assets, pages 2-11 are never fetched.

2. **Videos tab appears empty**: The "Videos" tab client-side filters `rawAssets` for `type === 'video'`, but only page 1 (40 items sorted by date) is loaded. The 23 videos are scattered across all pages and likely few (or none) land on page 1.

### Root Cause
Client-side tab filtering applied to server-side paginated data. The query fetches all asset types sorted by date, but the tab filter expects all data to be present.

### Solution

**Approach: Server-side filtering with tab-aware queries**

When a tab is active (characters, scenes, videos), pass a filter to the query so Supabase returns only matching assets, paginated correctly.

**File: `src/hooks/useLibraryAssets.ts`**
- Add an optional `assetType` filter parameter to `useLibraryAssets(filter?)`
- Include the filter in the query key so tab switches refetch correctly
- Pass filter down to `LibraryAssetService.getUserLibraryAssets`

**File: `src/lib/services/LibraryAssetService.ts`**
- Update `getUserLibraryAssets` to accept an optional `assetType` filter
- When `assetType === 'video'`, add `.eq('asset_type', 'video')` to the query
- For 'characters' and 'scenes', filter by `content_category` or tags

**File: `src/components/library/UpdatedOptimizedLibrary.tsx`**
- Pass `activeTab` to `useLibraryAssets` so the query filters server-side
- Remove the client-side tab filtering from `sharedAssets` memo (server already filtered)
- Keep the 'all' tab with no filter (existing behavior)
- Also: eagerly fetch page 2 on mount to ensure the sentinel approach works for the "all" tab — add a `useEffect` that calls `fetchNextPage()` once after initial load when `hasNextPage` is true

### Changes Summary

| File | Change |
|------|--------|
| `src/lib/services/LibraryAssetService.ts` | Add optional filter params to `getUserLibraryAssets` |
| `src/hooks/useLibraryAssets.ts` | Accept filter arg, include in query key |
| `src/components/library/UpdatedOptimizedLibrary.tsx` | Pass tab as filter, remove client-side tab filtering, add eager page 2 fetch |

