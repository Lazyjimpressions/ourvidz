

# Fix: Workspace Performance Freezing on Mobile

## Problem

Two issues are causing the workspace to freeze and become unresponsive on mobile:

### Issue 1: Re-signing storm from queuedIdsRef.clear()

A recent fix added `useEffect(() => { queuedIdsRef.current.clear(); }, [assets])` to `useSignedAssets.ts`. This was meant for the ImagePickerDialog tab-switching scenario, but it has a devastating side effect on the always-mounted workspace:

- The workspace query (`useAssetsWithDebounce`) refetches on window focus, polling, and after generation
- Each refetch creates a new array reference for `workspaceAssets`
- `mappedAssets` (via `useMemo`) produces a new array reference
- This triggers the `useEffect`, clearing `queuedIdsRef`
- The `pathsToSign` memo re-runs, finding ALL 69+ assets unqueued
- ALL thumbnails get re-signed sequentially (batches of 20, but still ~4 network roundtrips)
- On mobile, this blocks the main thread and causes freezing

### Issue 2: 69+ individual IntersectionObservers in SharedGrid

Each `SharedGridCard` creates its own `IntersectionObserver` instance (line 173 of SharedGrid.tsx). With 69+ assets rendered at once, that is 69+ observers running concurrently on mobile -- a significant performance drain.

## Solution

### Fix 1: Stabilize queuedIdsRef clearing (useSignedAssets.ts)

Instead of clearing on every `assets` array change, only clear when the **asset IDs actually change**. This ensures the ImagePickerDialog tab-switch still works (different assets = different IDs) while preventing the workspace re-signing storm (same assets, new array reference).

```text
// Replace: useEffect(() => { queuedIdsRef.current.clear(); }, [assets]);
// With: a stable key based on sorted asset IDs

const assetIdKey = useMemo(() => assets.map(a => a.id).sort().join(','), [assets]);

useEffect(() => {
  queuedIdsRef.current.clear();
}, [assetIdKey]);
```

This way:
- Workspace refetch with same assets: IDs unchanged, no re-sign
- ImagePickerDialog tab switch (workspace to library): different IDs, clears correctly
- New asset added after generation: IDs change, clears correctly

### Fix 2: Single shared IntersectionObserver in SharedGrid

Replace per-card observers with a single observer for the entire grid. This reduces 69 observer instances to 1.

```text
// SharedGrid.tsx: Create one observer at the grid level
// Pass visibility state down to cards via a Set<string> of visible IDs
// Cards receive isVisible as a prop instead of computing it themselves
```

### Fix 3: Remove isLoading gate from isSigning (MobileSimplifiedWorkspace.tsx)

Line 537: `isLoading={isGenerating || isSigning}` -- while signing is in progress, the entire grid shows skeleton loaders instead of progressively rendering. This means ANY re-sign (even for 1 new asset) causes the whole grid to flash to skeletons.

Change to: `isLoading={isGenerating && sharedAssets.length === 0}` -- only show skeletons when actually generating with no existing content.

## Files to Change

| File | Change |
|------|--------|
| `src/lib/hooks/useSignedAssets.ts` | Replace `assets` dependency with stable `assetIdKey` for queuedIdsRef clearing |
| `src/components/shared/SharedGrid.tsx` | Single shared IntersectionObserver instead of per-card |
| `src/pages/MobileSimplifiedWorkspace.tsx` | Fix isLoading prop to not gate on isSigning |

## Technical Details

### useSignedAssets.ts -- Stable asset identity

```text
// Line 41-44: Replace the effect
const assetIdKey = useMemo(
  () => assets.map(a => a.id).sort().join(','),
  [assets]
);

useEffect(() => {
  queuedIdsRef.current.clear();
}, [assetIdKey]);
```

### SharedGrid.tsx -- Single observer pattern

```text
// At grid level (SharedGrid component):
const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
const observerRef = useRef<IntersectionObserver | null>(null);

useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      setVisibleIds(prev => {
        const next = new Set(prev);
        entries.forEach(entry => {
          const id = entry.target.getAttribute('data-asset-id');
          if (id) {
            if (entry.isIntersecting) next.add(id);
            else next.delete(id);
          }
        });
        return next;
      });
    },
    { rootMargin: '200px' }
  );
  observerRef.current = observer;
  return () => observer.disconnect();
}, []);

// Pass observerRef to cards for registration, visibleIds for rendering
```

### MobileSimplifiedWorkspace.tsx -- Loading prop

```text
// Line 537: Change from
isLoading={isGenerating || isSigning}
// To
isLoading={isGenerating && sharedAssets.length === 0}
```

