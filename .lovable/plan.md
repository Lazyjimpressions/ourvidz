

## Plan: Unified Storage Migration + Shared Component Alignment

### The Key Question: What happens when a user converts a library image to canon?

**Current behavior (broken)**: Downloads from `user-library` bucket, re-uploads to `reference_images` bucket, creates a `character_canon` row with `output_url` pointing to the new copy, and resets tags to `['role:{outputType}']` — discarding all library tags. Two independent files, two independent DB rows, zero linkage.

**New behavior (unified storage)**: No file copy at all. The `character_canon` row simply references the **same** `user-library` storage path that the library row already points to. Tags from the library asset are carried over to the canon row. The reverse ("Save to Library" from canon) works the same way — DB insert only, same file path.

### What Gets Built

#### 1. Update `SaveToCanonModal` — zero-copy, tag transfer
- Remove all download/re-upload logic
- `output_url` = the existing `user-library` storage path (no copy)
- Accept optional `sourceTags: string[]` prop; merge with `['role:{outputType}']` on insert
- Accept optional `sourceLibraryId: string` prop; store as `metadata.source_library_id` on the canon row for traceability

#### 2. Update `SaveToCanonModal` callers
- `UpdatedOptimizedLibrary.tsx`: pass the asset's existing tags and library ID when opening the modal

#### 3. Update all `reference_images` write paths to use `user-library`
This is the core migration. Every place that uploads to `reference_images` switches to `user-library` with a canonical path convention:

| Current writer | Change |
|---|---|
| `SaveToCanonModal` (client) | Already uses user-library source — just stop copying to reference_images |
| `useCharacterStudio.ts` (canon upload) | Upload to `user-library/{userId}/canon/...` instead of `reference_images` |
| `CreateCharacter.tsx` (ref upload) | Upload to `user-library/{userId}/references/...` |
| `ReferenceImageSlots.tsx` (playground ref) | Upload to `user-library/{userId}/references/...` |
| `fal-image` edge function | Save canon results to `user-library` path |
| `fal-webhook` edge function | Save canon results to `user-library` path |
| `replicate-webhook` edge function | Save canon results to `user-library` path |
| `character-portrait` edge function | Already uses `user-library` — verify path consistency |

#### 4. Update all `reference_images` read/sign paths
- `UrlSigningService` / `useSignedUrl`: Remove `reference_images` from bucket detection; all private assets resolve against `user-library`
- `ImagePickerDialog`: Remove the `reference_images` bucket branch for character source
- `CharacterMediaStrip`, `CharacterCreatePanel`: Remove `reference_images` from known-bucket lists
- `fal-image` edge function `signIfStoragePath`: Remove `reference_images` from candidate buckets
- `character-portrait` edge function: Same

#### 5. Conform shared components across pages
Per the convention preference, ensure these pages all use the same components:
- **Playground** (`ReferenceImageSlots`): uploads should go to `user-library/references/`; picker should reuse `ImagePickerDialog`
- **Roleplay** (scene images): already uses `workspace-temp` for staging → `user-library` for permanent, which aligns
- **Library**, **Character Studio**, **Workspace**: already share `UnifiedLightbox`, `AssetTile`, `TagEditorDrawer`

#### 6. `workspace-temp` stays separate
Ephemeral staging bucket. No change. This is the correct 2-bucket target: `workspace-temp` (staging with TTL) + `user-library` (permanent).

### Migration Safety

- **Existing `character_canon` rows** still have `output_url` pointing to `reference_images` paths. These continue to work because:
  - URL signing will fall back to trying `reference_images` if not found in `user-library`
  - A background backfill script (Phase 2, separate task) can move files and update paths later
- **No breaking change on deploy**: old paths keep working, new paths go to unified bucket

### Files to Modify

| File | Change |
|---|---|
| `src/components/shared/SaveToCanonModal.tsx` | Remove file copy; accept `sourceTags`, use same path |
| `src/components/library/UpdatedOptimizedLibrary.tsx` | Pass asset tags to SaveToCanonModal |
| `src/hooks/useCharacterStudio.ts` | Upload canon files to `user-library` |
| `src/pages/CreateCharacter.tsx` | Upload refs to `user-library` |
| `src/components/playground/ReferenceImageSlots.tsx` | Upload refs to `user-library` |
| `src/lib/services/UrlSigningService.ts` | Simplify bucket detection (primary: `user-library`, fallback: `reference_images` for legacy) |
| `src/hooks/useSignedUrl.ts` | Remove `reference_images` special-casing |
| `src/components/storyboard/ImagePickerDialog.tsx` | Remove `reference_images` bucket branch |
| `src/components/character-studio/CharacterMediaStrip.tsx` | Remove `reference_images` from known buckets |
| `src/components/characters/CharacterCreatePanel.tsx` | Same |
| `supabase/functions/fal-image/index.ts` | Write canon results to `user-library`; update `signIfStoragePath` |
| `supabase/functions/fal-webhook/index.ts` | Write canon results to `user-library` |
| `supabase/functions/replicate-webhook/index.ts` | Write canon results to `user-library` |
| `supabase/functions/character-portrait/index.ts` | Update bucket references |

### Execution Order

1. Edge functions first (write path) — new assets go to `user-library`
2. Client upload paths — `SaveToCanonModal`, `useCharacterStudio`, `CreateCharacter`, `ReferenceImageSlots`
3. Read/sign paths — `UrlSigningService`, `useSignedUrl`, `ImagePickerDialog` (add `reference_images` as legacy fallback only)
4. Component alignment — ensure playground and roleplay use shared pickers/lightboxes
5. Later (separate task): backfill script to migrate existing `reference_images` files

