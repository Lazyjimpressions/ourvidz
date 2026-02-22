

# Fix Broken Images, Add "Save as Position", and Position Assignment

## Issue 1: Broken Images on Positions Page

**Root cause**: The `character-portrait` edge function saves `output_url` as a raw storage path like `userId/portraits/file.png`. The `useSignedUrl` hook only triggers signing when the URL contains the string `user-library/` or `workspace-temp/`. Since the raw path contains neither, it gets used as-is as the image `src` -- resulting in a broken image.

**Fix**: Update `useSignedUrl` to detect bare storage paths (no protocol, no bucket prefix) and sign them against the correct bucket. The canon images are stored in `user-library`, so any path that doesn't start with `http`, `data:`, or `/` and doesn't already contain a bucket identifier should be treated as a `user-library` path.

**File**: `src/hooks/useSignedUrl.ts`

## Issue 2: "Save as Position" on Portrait Dropdown

Add a new dropdown menu item in `PortraitGallery.tsx` that lets users promote any portrait to a character position. When clicked, it opens a small popover/dialog to select the output type and optional pose key (to assign it to a base position slot).

This requires:
- A new `onSaveAsPosition` callback prop on `PortraitGallery`
- A new `saveCanonFromUrl` function in `useCharacterStudio.ts` that inserts a portrait's existing `image_url` into `character_canon` without re-uploading
- Wiring through `StudioWorkspace.tsx` and `CharacterStudioV3.tsx`

**Files**: `PortraitGallery.tsx`, `useCharacterStudio.ts`, `StudioWorkspace.tsx`, `CharacterStudioV3.tsx`

## Issue 3: Assign Image to Base Position Slot

On the Positions page, allow users to assign any existing canon image (from the grid below) to one of the 6 fixed base position slots. This means adding a small action on each `CanonThumbnail` in the grid that lets the user pick which pose key to assign (e.g., "Set as Front", "Set as Left Side", etc.). This updates the canon entry's `metadata.pose_key` field.

Also, the fixed position slots should support drag-and-drop or a click-to-assign flow from uploaded/existing images.

**Implementation**: Add a dropdown on `CanonThumbnail` hover actions with the available pose keys. When selected, update the canon entry's metadata via a new `assignCanonPoseKey` function.

**Files**: `PositionsGrid.tsx`, `useCharacterStudio.ts`

## Technical Details

### useSignedUrl fix (Issue 1)

Add a check before the `needsSigning` logic: if the URL doesn't start with `http`, `https`, `data:`, or `/`, treat it as a bare `user-library` storage path and prepend the bucket identifier for signing.

### saveCanonFromUrl (Issue 2)

```
saveCanonFromUrl(imageUrl, outputType, tags, label?, poseKey?)
  -> INSERT into character_canon with output_url = imageUrl, metadata = { pose_key }
  -> refresh canon list
```

### assignCanonPoseKey (Issue 3)

```
assignCanonPoseKey(canonId, poseKey)
  -> UPDATE character_canon SET metadata = jsonb_set(metadata, '{pose_key}', '"poseKey"')
  -> refresh canon list
```

### Files Changed Summary

| File | Change |
|------|--------|
| `src/hooks/useSignedUrl.ts` | Detect bare storage paths and sign against `user-library` bucket |
| `src/hooks/useCharacterStudio.ts` | Add `saveCanonFromUrl()` and `assignCanonPoseKey()` functions |
| `src/components/character-studio/PortraitGallery.tsx` | Add "Save as Position" dropdown item with type selector |
| `src/components/character-studio-v3/PositionsGrid.tsx` | Add pose-key assignment action on `CanonThumbnail` hover overlay |
| `src/components/character-studio-v3/StudioWorkspace.tsx` | Pass new callbacks through |
| `src/pages/CharacterStudioV3.tsx` | Wire new callbacks |

