

## Phase 2-4: Character Poses as Dual-Purpose Production Assets — Next Steps

Phase 1 is complete: the "Characters" tab exists in `ImagePickerDialog` with character selector, category filters, and correct `reference_images` bucket signing.

---

### Phase 2: Smart Context Filtering

**Goal**: Auto-select the right tab and filter when the picker opens from a specific context.

**Changes**:

1. **Add `contextHint` prop to `ImagePickerDialog`** — optional enum: `'identity' | 'pose' | 'outfit' | 'scene' | 'style' | 'general'`
   - When set, auto-selects the Characters tab and pre-filters `activeCategory` to the matching `output_type`
   - `'identity'` → Characters tab, `character` category
   - `'pose'` → Characters tab, `position` category
   - `'outfit'` → Characters tab, `clothing` category
   - `'general'` / undefined → keep current behavior (Library tab, All)

2. **Wire context hints into consumers**:
   - `MobileSimplePromptInput.tsx`: Map `SLOT_FILTER_TAGS` values to `contextHint` — slot 0/1 (character) → `'identity'`, slot 2 (position) → `'pose'`, slot 3 (scene) → `'scene'`, slot 4 (clothing) → `'outfit'`
   - `CreateCharacter.tsx` / `VisualsTab.tsx`: `contextHint='identity'`
   - `AnchorReferencePanel.tsx`: `contextHint='identity'`
   - `CharacterStudioV3.tsx`: `contextHint='identity'`
   - Storyboard / roleplay pickers: `contextHint='general'`

3. **Update `handlePickerSelect`** in `MobileSimplePromptInput.tsx` to accept the third `metadata` arg from canon selections — currently ignores it. When canon metadata is present, auto-apply the matching slot role tag via existing role-tagging infrastructure.

**Files**: `ImagePickerDialog.tsx`, `MobileSimplePromptInput.tsx`, `CreateCharacter.tsx`, `VisualsTab.tsx`, `AnchorReferencePanel.tsx`, `CharacterStudioV3.tsx`

---

### Phase 3: Bidirectional Canon ↔ Library Bridge

**Goal**: Let users promote library assets to a character's canon, or save canon assets to library for general reuse.

**Changes**:

1. **"Save to Library" action on canon assets** — Add to `LightboxActions.tsx` or create a new `CanonAssetActions` variant
   - Copies file from `reference_images` bucket to `user-library` bucket
   - Inserts a `user_library` row with tags carried over from canon (`role:position`, etc.)
   - Accessible from `UnifiedLightbox` when viewing canon assets (e.g., Positions grid lightbox)

2. **"Save to Canon" action on library assets** — Add to existing `LibraryAssetActions`
   - Opens a mini modal: pick character + output_type (pose, outfit, style, scene)
   - Copies file from `user-library` to `reference_images` bucket
   - Inserts `character_canon` row with selected character_id and output_type
   - Reuses existing character selector pattern from `ImagePickerDialog`

3. **Deduplication badge** — Before showing "Save to Canon"/"Save to Library", check if the asset already exists in the other system (by storage_path hash or original prompt match). Show a subtle "Already in Library" / "Already in Canon" indicator.

**Files**: `LightboxActions.tsx`, new `SaveToCanonModal.tsx`, `PositionsGrid.tsx` (lightbox actions), library grid lightbox actions

---

### Phase 4: Role Auto-Assignment

**Goal**: When a canon asset is selected from the picker, auto-configure the consuming slot.

**Changes**:

1. **Workspace auto-role**: In `MobileSimplePromptInput.tsx`, when `handlePickerSelect` receives canon metadata:
   - `outputType: 'position'` → auto-set slot role to `role:position` via existing `onRoleTagToggle`
   - `outputType: 'clothing'` → auto-set `role:clothing`
   - `outputType: 'portrait'` → auto-set `role:character`

2. **Storyboard auto-tag**: In `StoryboardEditor.tsx`, when a canon asset is selected as clip reference, auto-set `reference_image_source: 'library'` (already done) and attach `characterId` to clip metadata for downstream prompt building.

3. **Picker thumbnail enrichment**: On the Characters tab grid, show character name + output type as a small badge overlay (partially done — extend with character name).

**Files**: `MobileSimplePromptInput.tsx`, `StoryboardEditor.tsx`, `ImagePickerDialog.tsx`

---

### Implementation Order

Phase 2 first (small, high UX impact — users land on the right tab automatically). Phase 3 next (enables the "use this pose for other characters" workflow). Phase 4 last (automation polish).

### Technical Notes

- `contextHint` replaces the existing `filterTag` prop for the Characters tab — `filterTag` continues to work for Library category filtering
- No database migrations needed for any phase
- Canon ↔ Library bridge uses Supabase storage `copy()` for cross-bucket file duplication
- All changes use existing shared infrastructure: `UnifiedLightbox`, `SharedAsset`, role tags, `urlSigningService`

