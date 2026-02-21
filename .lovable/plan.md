

# Fix: ImagePickerDialog Sequential Signing Causes Render Storm

## Root Cause

In `ImagePickerDialog.tsx`, the `signAll` function (line 129) processes assets in a sequential `for` loop. Each successful sign calls `setThumbUrls(prev => ...)`, which triggers a React re-render of the entire dialog including the grid. With 69+ workspace assets, this means 69+ sequential re-renders, each rendering all grid cards. On mobile, this completely freezes the UI.

## Solution: Batch Parallel Signing with Batched State Updates

Replace the sequential loop with parallel batch signing (chunks of 10), updating state once per batch instead of once per asset. This reduces 69 re-renders down to 7.

### File: `src/components/storyboard/ImagePickerDialog.tsx`

Replace the `signAll` function (lines 129-161) with:

```text
const BATCH_SIZE = 10;

const signAll = async () => {
  // Process in parallel batches of 10
  for (let i = 0; i < sharedAssets.length; i += BATCH_SIZE) {
    if (cancelled) break;
    const batch = sharedAssets.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (asset) => {
        const path = asset.thumbPath || asset.originalPath;
        if (!path) return { id: asset.id, failed: true };
        if (path.startsWith('http://') || path.startsWith('https://')) {
          return { id: asset.id, url: path };
        }
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600);
        if (error || !data?.signedUrl) {
          return { id: asset.id, failed: true };
        }
        return { id: asset.id, url: data.signedUrl };
      })
    );

    if (cancelled) break;

    // Single state update per batch (not per asset)
    const batchUrls: Record<string, string> = {};
    const batchFailed: string[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const val = result.value;
        if (val.failed) batchFailed.push(val.id);
        else if (val.url) batchUrls[val.id] = val.url;
      } else {
        // Promise rejected -- shouldn't happen with allSettled, but guard
      }
    }
    setThumbUrls(prev => ({ ...prev, ...batchUrls }));
    if (batchFailed.length > 0) {
      setFailedIds(prev => {
        const next = new Set(prev);
        batchFailed.forEach(id => next.add(id));
        return next;
      });
    }
  }
  if (!cancelled) setSigning(false);
};
```

### Impact

- 69 sequential network requests become 7 parallel batches of 10
- 69 state updates (re-renders) become 7
- Network time drops from ~35s (sequential) to ~3.5s (parallel)
- UI remains responsive during signing

## Files to Change

| File | Change |
|------|--------|
| `src/components/storyboard/ImagePickerDialog.tsx` | Replace sequential signing loop with batched parallel signing |

