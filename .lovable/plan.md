## Unified Storage Architecture (Implemented)

### Summary
Migrated from dual-bucket (`user-library` + `reference_images`) to unified `user-library` bucket for all permanent assets. `workspace-temp` remains separate for ephemeral staging.

### What Changed

**Edge Functions:**
- `fal-image`: `signIfStoragePath` default bucket → `user-library`; candidate bucket order prioritizes `user-library`
- `character-portrait`: Reference image signing defaults to `user-library` first
- `fal-webhook` / `replicate-webhook`: Already write to `workspace-temp` → `user-library`; no changes needed

**Client Upload Paths:**
- `SaveToCanonModal`: Zero-copy — inserts `character_canon` row pointing to existing `user-library` path; accepts `sourceTags` for tag transfer and `sourceLibraryId` for traceability
- `useCharacterStudio.uploadCanon`: Uploads to `user-library/{userId}/canon/...`
- `ReferenceImageSlots` (Playground): Uploads to `user-library/{userId}/references/...`
- `CreateCharacter`: Uploads refs to `user-library/{userId}/references/...`
- `storage.ts`: `uploadReferenceImage` → `user-library`; `getReferenceImageUrl` → tries `user-library` then `reference_images` fallback

**Read/Sign Paths:**
- `UrlSigningService`: Added `reference_images` to bucket prefix normalization list
- `useReferenceUrls`: Signs against `user-library` first, falls back to `reference_images` for legacy
- `ImagePickerDialog`: Bucket for characters tab → `user-library` with `reference_images` legacy fallback in both thumbnail signing and selection signing
- `CharacterHistoryStrip`, `CharacterStudioPromptBarV2`, `CharacterStudioV2`: Default bucket → `user-library`
- `AssetMappers`: Updated doc comment

### Migration Safety
- All `reference_images` is kept as a legacy fallback bucket in signing paths
- Existing `character_canon.output_url` values pointing to `reference_images` paths continue to work
- Future backfill task can move files and update DB paths

### Architecture (Target State)
```
workspace-temp/  → ephemeral staging (TTL, auto-cleanup)
user-library/    → all permanent user assets:
  {userId}/portraits/...     (character portraits)
  {userId}/canon/...         (canon positions/outfits/styles)
  {userId}/references/...    (uploaded reference images)
  {userId}/scenes/...        (scene images)
  {userId}/workspace/...     (promoted workspace assets)
```

### Remaining Work (Future Tasks)
1. Backfill script to move existing `reference_images` files to `user-library` and update `character_canon.output_url` paths
2. Update `ReferenceImageManager.ts` service (currently unused in active flows)
3. Deprecate `reference_images` bucket after backfill complete
