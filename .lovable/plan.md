

# Fix: Workspace Crash on I2V Generation

## Root Cause

When an i2v (image-to-video) job starts, an optimistic placeholder is created as a `UnifiedAsset` with `type: 'video'`. This placeholder gets mapped through `toSharedFromWorkspace()`, which expects workspace DB row format (`asset_type` field) -- not `UnifiedAsset` format (`type` field).

Because the mapper can't find `asset_type` or `assetType`, it defaults to `'image'`. This mistyped placeholder then triggers an infinite retry loop in SharedGridCard's fallback image loader effect, crashing React.

## Two-Part Fix

### 1. Fix type detection in `toSharedFromWorkspace` (AssetMappers.ts, line 106)

Add `row.type` as a fallback so optimistic `UnifiedAsset` objects are typed correctly:

```
// Current
const assetType = row.asset_type || row.assetType || 'image';

// Fixed
const assetType = row.asset_type || row.assetType || row.type || 'image';
```

Also fix the prompt field (line 107) -- optimistic assets use `prompt` not `original_prompt`:

```
// Current
const originalPrompt = row.original_prompt || row.originalPrompt || '';

// Fixed
const originalPrompt = row.original_prompt || row.originalPrompt || row.prompt || '';
```

### 2. Add retry guard in SharedGridCard (SharedGrid.tsx, lines 298-323)

Even with fix #1, any asset with an empty `originalPath` and no thumbnail would still infinite-loop. Add a `failedToLoad` state to prevent retries after a signing failure:

```typescript
const [failedToLoad, setFailedToLoad] = useState(false);

// In the fallback effect guard, add: && !failedToLoad
useEffect(() => {
  if (!asset.thumbUrl && asset.type === 'image' && !fallbackUrl && !isLoadingFallback && isVisible && !failedToLoad) {
    setIsLoadingFallback(true);
    // ...existing code...
    originalImageLoader.load(async () => {
      try {
        const url = await signOriginalSafely(asset);
        setFallbackUrl(url);
      } catch (err) {
        console.warn('Failed to load fallback image for asset', asset.id, err);
        setFailedToLoad(true); // prevent infinite retry
      }
    }).finally(() => {
      clearTimeout(timeout);
      setIsLoadingFallback(false);
    });
  }
}, [asset.thumbUrl, asset.type, asset.id, fallbackUrl, isLoadingFallback, isVisible, signOriginalSafely, failedToLoad]);
```

Apply the same guard to the video thumbnail effect (lines 326-358) for consistency -- add a `failedVideoThumb` state.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/services/AssetMappers.ts` (line 106-107) | Add `row.type` and `row.prompt` fallbacks in `toSharedFromWorkspace` |
| `src/components/shared/SharedGrid.tsx` (lines 213-323) | Add `failedToLoad` state to prevent infinite retry loop on signing failure |

## Why This Fixes the Crash

- Fix 1 ensures optimistic video placeholders retain their correct `'video'` type, so the image fallback effect never fires for them
- Fix 2 is a safety net: if any asset fails to sign, it won't retry infinitely, preventing the React state update storm

