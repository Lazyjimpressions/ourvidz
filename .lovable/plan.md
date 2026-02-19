
# Fix ImagePickerDialog Freeze -- Root Cause and Proper Solution

## Root Cause (Why 4 Previous Fixes Failed)

The previous fixes all focused on optimizing the signing loop inside `ImagePickerDialog` (batching, refs, single flush, etc.). But the actual problem is architectural:

**`ImagePickerDialog` uses `LibraryAssetService.generateSignedUrl()` which bypasses the caching layer entirely.** Every time the dialog opens, it makes 40+ fresh HTTP POST requests to Supabase Storage -- one per asset -- with no caching, no concurrency limiting, and 2 `console.log` calls per asset (80 logs total).

Meanwhile, the rest of the app (Library page, Workspace, etc.) uses `urlSigningService` via the `useSignedAssets` hook, which provides:
- In-memory URL cache (so previously signed URLs are instant)
- Concurrency limiting (max 4 parallel requests)
- Deduplication (prevents signing the same path twice)
- Batch signing via `getSignedUrls()`

If the user has visited the Library page before opening the picker, all those URLs are already cached in `urlSigningService` -- but `ImagePickerDialog` ignores that cache and makes 40 fresh network requests anyway, flooding the browser.

## Solution

Replace the entire custom signing implementation in `ImagePickerDialog` with the proven `useSignedAssets` hook pattern used by the Library and Workspace pages.

## Technical Changes

### File: `src/components/storyboard/ImagePickerDialog.tsx`

**Remove:**
- `signedUrls` state (Map)
- `loadingUrls` state (Set)
- `signedRef` and `loadingRef` refs
- `filteredAssetIds` memo
- The entire signing `useEffect` (lines 80-145)
- The cleanup `useEffect` that clears signing caches (lines 148-158)

**Add:**
- Import `toSharedFromLibrary` from `AssetMappers`
- Import `useSignedAssets` from `lib/hooks/useSignedAssets`
- Map `filteredAssets` to `SharedAsset[]` using `toSharedFromLibrary` (or a lightweight inline mapper)
- Pass the mapped assets to `useSignedAssets('user-library')`
- Use `signedAssets[i].thumbUrl` for rendering thumbnails
- On selection, call `signedAsset.signOriginal()` to get the full-res URL (single request, cached)

**Rendering changes:**
- Replace `signedUrls.get(asset.id)` with `signedAsset.thumbUrl`
- Replace `loadingUrls.has(asset.id)` with `!signedAsset.thumbUrl`
- On "Use Selected" click, await `signOriginal()` to get the full URL before calling `onSelect()`

### File: `src/components/playground/ImageCompareView.tsx`

No changes needed -- the auto-sync logic from the previous fix is already in place.

## Why This Works

1. **Cache hits**: If the user visited the Library page, all thumbnail URLs are already cached in `urlSigningService`. Opening the picker will show images instantly with zero network requests.

2. **Concurrency control**: `urlSigningService` limits to 4 parallel signing requests (vs the current 6-per-batch with no global limit). This prevents flooding.

3. **Single state update**: `useSignedAssets` collects all results and does one state flush, which is already battle-tested on the Library page with 40+ assets.

4. **No re-render loops**: `useSignedAssets` uses `queuedIdsRef` to track what's been queued without re-triggering the effect -- the exact pattern that was attempted manually but kept breaking.

5. **Lazy original signing**: Thumbnails load fast (smaller files). The full-resolution URL is only signed when the user clicks "Use Selected", keeping the dialog snappy.

## Files Changed

| File | Change |
|------|--------|
| `src/components/storyboard/ImagePickerDialog.tsx` | Replace custom signing logic with `useSignedAssets` hook; remove all signing state/refs/effects |
