

# Audit Results and Next Steps

## Legacy Code Found (Cleanup Needed)

### 1. Dead Code: `WorkspaceGridVirtualized` (NOT using AssetTile)
- **File:** `src/components/workspace/WorkspaceGridVirtualized.tsx`
- **Status:** Exported from `src/components/workspace/index.ts` but **never imported** anywhere in the app
- **Issue:** Still uses `aspect-square` (1:1) and raw `img` tag -- does not use `AssetTile`
- **Action:** Delete the file and remove its export from `workspace/index.ts`

### 2. Dead Code: `useLazyUrlGeneration` hook
- **File:** `src/hooks/useLazyUrlGeneration.ts`
- **Status:** **Zero imports** anywhere in the codebase
- **Issue:** Bypasses `UrlSigningService` entirely with its own `sessionStorage` cache and direct `supabase.storage` calls to legacy buckets (`sdxl_image_high`, `image_fast`)
- **Action:** Delete the file

### 3. Legacy Library Folder (partial dead code)
- **Directory:** `src/components/library/legacy/`
- **Files:** `AssetSkeleton.tsx`, `BulkActionBar.tsx`, `LibraryFilters.tsx`, `LibraryHeader.tsx`, `SortableGridHeader.tsx`, `StorageUsageIndicator.tsx`, `README.md`
- **Status:** `LibraryLightboxStatic.tsx` was already deleted. Need to verify if the remaining files are imported anywhere. If not, they should be deleted too.

### 4. `OriginalImageLoader` in `SharedGrid.tsx` duplicates `UrlSigningService`
- **File:** `src/components/shared/SharedGrid.tsx` (lines 13-50)
- **Issue:** `SharedGrid` has its own `OriginalImageLoader` concurrency limiter (max 3 concurrent). `UrlSigningService` already has a `ConcurrencyLimiter` (max 4 concurrent). These two limiters stack, meaning effective concurrency is min(3, 4) = 3 -- but they don't share a queue, so if both are active simultaneously, actual concurrency can reach 7.
- **Risk:** Low (both are defensive), but it is architectural debt. Can be addressed later by having `SharedGrid` rely solely on `UrlSigningService` for throttling.

### 5. `ImagePickerDialog` (Storyboard) uses `aspect-square`
- **File:** `src/components/storyboard/ImagePickerDialog.tsx`
- **Context:** This is a modal dialog picker grid, not a main content grid. Using square thumbnails in a compact 4-column picker is appropriate for this UI -- it is not the same as the main content grids.
- **Action:** No change needed. This is a picker, not a gallery.

## Image Signing Workflow Verification

Tracing the full flow from generation to display:

```text
GENERATION FLOW:
  Edge function generates image
    -> Uploads to `workspace-temp` bucket
    -> Inserts row into `workspace_assets` table (temp_storage_path = "userId/jobId/file.webp")

WORKSPACE DISPLAY:
  SimplifiedWorkspace.tsx
    -> useWorkspaceAssets() fetches workspace_assets rows
    -> useSignedAssets() signs temp_storage_path via urlSigningService
    -> SharedGrid receives SignedAsset[] (thumbUrl = signed URL)
    -> SharedGridCard renders via AssetTile (src = thumbUrl)
    -> If thumbUrl is null, SharedGridCard falls back to signOriginalSafely()
       which uses urlSigningService.getSignedUrl(originalPath, bucket)

SAVE TO LIBRARY:
  User clicks "Save to Library"
    -> File copied from `workspace-temp` to `user-library` bucket
    -> Row inserted into `user_library` table (storage_path = "userId/file.webp")

LIBRARY DISPLAY:
  UpdatedOptimizedLibrary.tsx
    -> useLibraryAssets() fetches user_library rows
    -> useSignedAssets() signs storage_path via urlSigningService
    -> SharedGrid receives SignedAsset[] -> SharedGridCard -> AssetTile

CHARACTER PORTRAITS:
  Edge function generates portrait
    -> Uploads to `user-library` bucket
    -> Inserts row into `character_portraits` (image_url = storage path)

STUDIO DISPLAY:
  PortraitGallery.tsx
    -> usePortraitVersions() fetches character_portraits rows
    -> SignedPortraitTile uses useSignedUrl(portrait.image_url)
    -> useSignedUrl auto-detects bucket ("user-library")
    -> urlSigningService.getSignedUrl(path, "user-library")
    -> Passes signed URL to AssetTile (src = signedUrl)
```

**Verification:** All paths now flow through `urlSigningService` for signing. No component signs URLs directly via `supabase.storage.createSignedUrl()` anymore (except `useLazyUrlGeneration` which is dead code).

## AssetTile Rendering Verification

All consumers now use the same DOM structure:

```text
div (aspect-[3/4], overflow-hidden, rounded-lg)  -- no nested h-full
  img (w-full h-full object-cover)                -- direct child
  {children}                                       -- overlays on top
```

No remaining consumer uses the broken `div > div[h-full] > img` pattern.

## Remaining `aspect-square` Usage (Non-Issues)

These are all contextually correct and should NOT be changed:
- `AnchorReferencePanel.tsx` -- compact anchor thumbnails (different UI context)
- `CharacterDetailPane.tsx` -- avatar preview circle
- `PortraitPanel.tsx` -- roleplay portrait preview
- `CharacterHubSidebar.tsx` -- small anchor squares
- `ImagePickerDialog.tsx` -- compact picker grid
- `sidebar.tsx` -- UI framework component
- `AssetTile.tsx` -- the `1/1` option in `aspectMap` (available but not default)

## Next Steps (Implementation Plan)

### Immediate Cleanup (5 files)

| Action | File | Reason |
|--------|------|--------|
| Delete | `src/components/workspace/WorkspaceGridVirtualized.tsx` | Dead code, never imported, uses legacy aspect-square |
| Delete | `src/hooks/useLazyUrlGeneration.ts` | Dead code, zero imports, bypasses UrlSigningService |
| Modify | `src/components/workspace/index.ts` | Remove WorkspaceGridVirtualized export |
| Audit  | `src/components/library/legacy/*.tsx` | Check imports; delete any that are unused |

### Deferred (Low Priority)

| Item | Risk | Action |
|------|------|--------|
| `OriginalImageLoader` in SharedGrid duplicates UrlSigningService concurrency | Low | Can refactor later to remove duplication |
| `SharedGridCard` has 200+ lines of fallback/thumbnail logic | Medium | Could extract into a hook, but works correctly now |

### Testing Priorities

1. **Mobile iOS Safari**: Verify studio portrait gallery no longer zooms (the core bug fix)
2. **Workspace grid**: Confirm 3:4 aspect renders correctly with square (1:1) generated images
3. **Library grid**: Same 3:4 check
4. **Lightbox navigation**: Test swipe and arrow nav across workspace, library, and studio
5. **URL signing**: Verify images load in all three contexts (workspace, library, studio) -- no broken images

