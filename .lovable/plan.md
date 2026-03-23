

## Plan: Audit & Fix Post-Migration Issues

### Bugs Found

**Bug 1: Duo poses show across ALL characters (cross-character leak)**
`PositionsGrid.tsx` lines 386-396 queries duo poses with NO `character_id` filter — just `tags contains ['role:position', 'duo']`. This is why Amanda New sees a duo pose from another character.

**Fix**: Add `characterId` prop to `PositionsGrid`, pass it from `StudioWorkspace` and `CharacterStudioV3`, and scope the duo query with `.eq('character_id', characterId)`.

**Bug 2: "Save as Position" uses output_type `'pose'` instead of `'position'`**
`CharacterStudioV3.tsx` line 242: `saveCanonFromUrl(imageUrl, 'pose', ...)`. The `loadCanon` query does return this (it excludes only `'portrait'`), but the `PositionsGrid` filter bar uses `normalizeOutputType()` which may not map `'pose'` correctly, causing display issues in filtered views.

**Fix**: Change output_type from `'pose'` to `'position'` in the `onSaveAsPosition` call.

**Bug 3: Base position slots may not populate after migration**
The backfill copied `character_canon.metadata` to `user_library.generation_metadata`. The `getCanonForPoseKey()` function reads `c.metadata` which maps to `generation_metadata` in `loadCanon`. This mapping looks correct: `metadata: (d as any).generation_metadata ?? null`. However, if the original `character_canon` rows had `pose_key` stored differently (e.g., in the `output_type` field rather than `metadata.pose_key`), those slots won't match.

**Fix**: Audit by also checking `output_type` or `label` as fallback for pose_key matching. Additionally, verify with a DB query whether existing canon rows have `pose_key` in their metadata.

**Bug 4: Legacy `reference_images` bucket still used for uploads**
Several files still upload to `reference_images` instead of `user-library`:
- `CharacterStudioSidebar.tsx` (reference image upload, lines 218-229)
- `ReferenceImageManager.ts` (all uploads)
- `storage.ts` `uploadReferenceImage` function

**Fix**: Migrate these upload paths to `user-library/{userId}/references/...`.

**Bug 5: Legacy `character_canon` references in mappers/types**
- `AssetMappers.ts` still has a `character_canon` mapper function
- `ImagePickerDialog.tsx` metadata typing still references `source: 'character_canon'`
- `MobileSimplePromptInput.tsx` checks `metadata?.source === 'character_canon'`

**Fix**: Update these to reference `user_library` with `character_id` filter context.

### Files to Modify

| File | Change |
|------|--------|
| `src/components/character-studio-v3/PositionsGrid.tsx` | Add `characterId` prop; scope duo query to character; remove "Duo Poses" as special section (it's just another tag filter) |
| `src/components/character-studio-v3/StudioWorkspace.tsx` | Pass `characterId` to PositionsGrid |
| `src/pages/CharacterStudioV3.tsx` | Fix `onSaveAsPosition` output_type from `'pose'` to `'position'`; pass characterId |
| `src/components/character-studio/CharacterStudioSidebar.tsx` | Upload refs to `user-library` bucket |
| `src/lib/storage.ts` | Update `uploadReferenceImage` to use `user-library` bucket |
| `src/services/ReferenceImageManager.ts` | Update all `reference_images` references to `user-library` |
| `src/lib/services/AssetMappers.ts` | Remove/update `character_canon` mapper |
| `src/components/storyboard/ImagePickerDialog.tsx` | Update metadata typing from `character_canon` to `user_library` |
| `src/components/workspace/MobileSimplePromptInput.tsx` | Update `character_canon` check |
| `src/components/character-studio/CharacterMediaStrip.tsx` | Remove `reference_images` from known buckets |
| `src/components/character-studio/CharacterHistoryStrip.tsx` | Same |
| `src/pages/CharacterStudioV2.tsx` | Same |

### Execution Order

1. Fix the two immediate bugs (duo pose leak + wrong output_type) -- highest impact
2. Migrate remaining `reference_images` upload paths to `user-library`
3. Clean up legacy `character_canon` references in mappers and types
4. Verify base position slot matching works with migrated data

