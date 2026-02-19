
# Fix Image Compare: Auto-Sync Reference Images + Fix Freeze Bug

## Overview

Keep the per-panel reference image slots as they are today, but auto-populate Panel B's reference images from Panel A whenever Panel A's images change. Users can then modify Panel B's images independently if they want to test a different image on the same model.

Also fix the page-freeze bug in `ImagePickerDialog`.

## Changes

### File 1: `src/components/storyboard/ImagePickerDialog.tsx` -- Fix Freeze

The `useEffect` on lines 66-118 creates an infinite loop because `filteredAssets` gets a new array reference every render and `signedUrls`/`loadingUrls` (which are updated inside the effect) are also dependencies.

**Fix:**
- Memoize `filteredAssets` with `useMemo`
- Track signed/loading state in a `useRef` instead of depending on `signedUrls` and `loadingUrls` state in the effect
- Keep `signedUrls` as state for rendering, but remove it from the effect dependency array
- Use a stable key (comma-joined asset IDs + `isOpen`) as the effect dependency instead of object references

### File 2: `src/components/playground/ImageCompareView.tsx` -- Auto-Sync Ref Images

**Add a `useEffect`** that watches `panelA.referenceImages`. When Panel A's reference images change and Panel B currently has no images (or still matches the previous sync), auto-populate Panel B with Panel A's images.

Logic:
- When Panel A's `referenceImages` array changes and Panel B's model needs references (`panelNeedsRef`), copy Panel A's images into Panel B (assigning new IDs so they are independent copies)
- Only auto-sync if Panel B's images are empty or were previously auto-synced (track with a ref flag `wasBAutoSynced`)
- If the user manually changes Panel B's images (adds/removes), set `wasBAutoSynced = false` so future Panel A changes no longer overwrite
- When Panel B's model changes to one that needs refs and Panel B has no images, re-sync from Panel A

Implementation detail:
- Add `const wasBAutoSynced = useRef(true)` 
- Add `useEffect` watching `panelA.referenceImages`:
  - If `panelB` needs ref and (`panelB.referenceImages.length === 0` or `wasBAutoSynced.current`):
    - Copy Panel A images with new UUIDs into Panel B
    - Set `wasBAutoSynced.current = true`
- Wrap Panel B's `onChange` for `ReferenceImageSlots` to set `wasBAutoSynced.current = false` when the user manually edits

## Files Changed

| File | Change |
|------|--------|
| `src/components/storyboard/ImagePickerDialog.tsx` | Fix infinite re-render loop by memoizing filteredAssets and using ref-based sign tracking |
| `src/components/playground/ImageCompareView.tsx` | Add useEffect to auto-sync Panel A reference images to Panel B; track manual edits with a ref |
