

## Audit: Character Poses as Dual-Purpose Production Assets

### Completed
- **Phase 1**: Characters tab in ImagePickerDialog with character selector, category filters, `reference_images` bucket signing, enriched metadata in `onSelect`
- **Phase 2**: `contextHint` prop auto-navigates picker to correct tab/category; wired into workspace slots, CharacterStudioV3, CreateCharacter

### Gaps Found

1. **`handlePickerSelect` ignores canon metadata** — The workspace callback (line 693) accepts `_source` but discards the third `metadata` arg. No auto-role-tagging happens when a canon asset is selected.

2. **PositionsGrid lightbox "Send to Workspace" signs against wrong bucket** — Line 662 signs `canon.output_url` against `workspace-temp`, which will fail. Should sign against `reference_images`.

3. **No "Save to Library" action on canon assets** — PositionsGrid lightbox only has "Set Primary", "Send to Workspace", and "Delete". No way to promote a canon pose to the general library for use as a generic template.

4. **No "Save to Canon" action on library assets** — `LibraryAssetActions` has no path to associate a library image with a character's canon.

---

### Recommended Next Step: Phase 3 — Bidirectional Canon ↔ Library Bridge

**Why Phase 3 before Phase 4**: Phase 4 (auto-role) depends on metadata flowing correctly, which is a small wiring fix. Phase 3 is the bigger feature gap — users currently cannot reuse canon assets as generic templates or promote library assets to canon.

#### Changes

**1. Fix PositionsGrid "Send to Workspace" bucket** (`PositionsGrid.tsx` line 662)
- Change signing bucket from `'workspace-temp'` to `'reference_images'`

**2. Add "Save to Library" to PositionsGrid lightbox** (`PositionsGrid.tsx` ~line 660)
- New button in the `bottomSlot` action bar
- On click: copy file from `reference_images` → `user-library` bucket via Supabase `storage.copy()`, insert `user_library` row with tags from canon (`role:position`, `role:clothing`, etc.), character name in title
- Show toast on success

**3. Add "Save to Canon" to Library lightbox** (`UpdatedOptimizedLibrary.tsx`)
- New button in `LibraryAssetActions` or inline in the library's `UnifiedLightbox` bottom slot
- On click: open a small modal (`SaveToCanonModal.tsx`) — pick character + output_type
- Copy file from `user-library` → `reference_images`, insert `character_canon` row
- Show toast on success

**4. Create `SaveToCanonModal.tsx`** (new file)
- Fetches user's characters list
- Character selector + output_type dropdown (portrait, position, clothing, scene)
- Optional label field
- Confirm button triggers the copy + insert

**5. Wire `handlePickerSelect` metadata for Phase 4 prep** (`MobileSimplePromptInput.tsx` line 693)
- Accept the third `metadata` arg
- When present and `metadata.source === 'character_canon'`, auto-toggle the slot's role tag to match `metadata.outputType` (e.g., position → `role:position`)
- Uses existing `toggleRoleTag` utility

#### Files
- `src/components/character-studio-v3/PositionsGrid.tsx` — fix bucket + add Save to Library
- `src/components/library/UpdatedOptimizedLibrary.tsx` — add Save to Canon trigger
- `src/components/shared/LightboxActions.tsx` — optionally add `onSaveToCanon` / `onSaveToLibrary` props
- `src/components/shared/SaveToCanonModal.tsx` — new modal
- `src/components/workspace/MobileSimplePromptInput.tsx` — wire metadata → auto-role

