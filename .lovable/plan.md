

# Fix: Image Picker Dialog - Complete Rewrite of Signing Logic

## Problem

The `ImagePickerDialog` uses `useSignedAssets`, a hook designed for always-mounted components (workspace grid, library page). It breaks in dialog contexts due to:

- A mutable ref (`queuedIdsRef`) modified inside `useMemo` (React anti-pattern -- memos must be pure)
- Race conditions between `useEffect` (runs after render) clearing the ref and `useMemo` (runs during render) reading it
- The `refresh()` call on tab switch introduces additional timing conflicts
- Individual path signing failures are silently swallowed, leaving assets stuck in spinner state forever

This affects both the Character Studio and Playground image pickers since they share `ImagePickerDialog`.

## Solution: Direct Signing in ImagePickerDialog

Remove the `useSignedAssets` dependency from `ImagePickerDialog` and sign URLs directly using `supabase.storage.from(bucket).createSignedUrl()` per asset. This is simpler, more debuggable, and eliminates all the ref/memo timing issues.

### File: `src/components/storyboard/ImagePickerDialog.tsx`

**Remove**: `useSignedAssets` import and usage

**Add**: A self-contained signing approach inside the dialog:

1. After `sharedAssets` is computed, run a `useEffect` that:
   - Takes the current `sharedAssets` array and `bucket`
   - For each asset, calls `supabase.storage.from(bucket).createSignedUrl(path, 3600)`
   - Stores results in a local `Record<string, string>` state mapping asset ID to signed thumb URL
   - Tracks failed IDs in a separate `Set<string>` state
   - Has proper cleanup via `cancelled` flag

2. On `activeSource` change: the `sharedAssets` array identity changes, which naturally re-triggers the effect -- no manual `refresh()` needed

3. Image rendering:
   - If signed URL exists: show image with `onError` fallback
   - If in failed set: show broken-image icon
   - Otherwise: show spinner (with a 15-second timeout to auto-mark as failed)

4. Selection: when user picks an image, sign the original path on-demand (same `createSignedUrl` call)

**Key code structure:**

```text
// State
const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
const [signing, setSigning] = useState(false);

// Effect: sign all thumbnails when assets or bucket change
useEffect(() => {
  if (!isOpen || sharedAssets.length === 0) return;
  let cancelled = false;
  setSigning(true);
  setThumbUrls({});
  setFailedIds(new Set());

  const signAll = async () => {
    for (const asset of sharedAssets) {
      if (cancelled) break;
      const path = asset.thumbPath || asset.originalPath;
      if (!path) { mark failed; continue; }
      try {
        const { data } = await supabase.storage
          .from(bucket).createSignedUrl(path, 3600);
        if (!cancelled && data?.signedUrl) {
          setThumbUrls(prev => ({ ...prev, [asset.id]: data.signedUrl }));
        }
      } catch {
        if (!cancelled) setFailedIds(prev => new Set(prev).add(asset.id));
      }
    }
    if (!cancelled) setSigning(false);
  };
  signAll();
  return () => { cancelled = true; };
}, [sharedAssets, bucket, isOpen]);
```

This is intentionally simple -- no caching, no refs, no memos for signing state. The dialog is short-lived and the `UrlSigningService` cache handles deduplication at the service layer anyway.

### File: `src/lib/hooks/useSignedAssets.ts`

**No changes**. The hook continues to work fine for its intended use cases (always-mounted workspace/library grids). We just stop using it in the dialog.

### File: `src/components/playground/ReferenceImageSlots.tsx`

**No changes needed**. This component already uses `ImagePickerDialog`, so fixing the dialog fixes the Playground picker automatically. The `source` prop flows through correctly.

## What This Fixes

- **Character Studio**: Browse dropdown (Workspace / Library) shows images that load and are selectable
- **Playground**: Reference Image Slots "From library" and "From workspace" options show loadable images
- **Error visibility**: Failed signings show a broken-image icon instead of spinning forever
- **Tab switching**: Switching between Workspace and Library tabs cleanly resets and re-signs

## Files Changed

| File | Change |
|------|--------|
| `src/components/storyboard/ImagePickerDialog.tsx` | Replace `useSignedAssets` with direct Supabase signing |

