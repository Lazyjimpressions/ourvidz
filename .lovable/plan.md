


## Character Poses as Dual-Purpose Production Assets

### Completed: Phase 1 — Surface Canon Assets in ImagePickerDialog

**Changes made:**

1. **`src/lib/services/AssetMappers.ts`** — Added `toSharedFromCanon()` mapper
   - Converts `character_canon` rows (with joined `characters` data) to `SharedAsset`
   - Maps `output_url` → `originalPath`, sets bucket to `reference_images`
   - Builds title from character name + label/output_type

2. **`src/components/storyboard/ImagePickerDialog.tsx`** — Added "Characters" source tab
   - Three-tab source toggle: Workspace | Library | Characters
   - Character selector (pill filters) to pick which character's canon to browse
   - Category filter tabs (All, Characters, Positions, Scenes, Outfits) mapped to `output_type`
   - Signs against `reference_images` bucket for canon assets
   - Passes enriched metadata (`characterId`, `outputType`, `tags`) in `onSelect` callback
   - Output type badge on hover overlay for canon assets

3. **`src/pages/StoryboardEditor.tsx`** — Fixed type compatibility
   - Maps `'characters'` source to `'library'` for storyboard's reference_image_source

### Completed: Phase 2 — Smart Context Filtering

**Changes made:**

1. **`src/components/storyboard/ImagePickerDialog.tsx`** — Added `contextHint` prop
   - New `PickerContextHint` type: `'identity' | 'pose' | 'outfit' | 'scene' | 'style' | 'general'`
   - `CONTEXT_HINT_DEFAULTS` map auto-selects source tab + category filter on open
   - `contextHint` takes priority over `source`/`filterTag` props
   - Merged two separate `useEffect`s into one for source/filter sync

2. **`src/components/workspace/MobileSimplePromptInput.tsx`** — Wired `contextHint` to slot mapping
   - `SLOT_CONTEXT_HINTS` array maps slot indices → context hints: identity, identity, pose, scene, outfit
   - `handlePickerSelect` now accepts `'characters'` source type
   - Picker passes `contextHint` prop so slots auto-navigate to Characters tab

3. **`src/pages/CharacterStudioV3.tsx`** — Added `contextHint="identity"` to both ImagePickerDialog instances

4. **`src/pages/CreateCharacter.tsx`** — Added `contextHint="identity"` to character portrait picker

### Completed: Phase 3 — Bidirectional Canon ↔ Library Bridge

**Changes made:**

1. **`src/components/character-studio-v3/PositionsGrid.tsx`** — Fixed bucket + added Save to Library
   - Fixed "Send to Workspace" to sign against `reference_images` bucket (was `workspace-temp`)
   - Added "Save to Library" button: downloads from `reference_images`, uploads to `user-library`, creates `user_library` row with role tags and character name

2. **`src/components/shared/SaveToCanonModal.tsx`** — New modal component
   - Fetches user's characters list
   - Character selector + output_type dropdown (portrait, position, clothing, scene, style)
   - Optional label field
   - Downloads from `user-library`, uploads to `reference_images`, inserts `character_canon` row
   - Cross-bucket copy via download+upload fallback

3. **`src/components/shared/LightboxActions.tsx`** — Added `onSaveToCanon` prop to `LibraryAssetActions`
   - New BookmarkPlus icon button for saving library assets to character canon

4. **`src/components/library/UpdatedOptimizedLibrary.tsx`** — Wired Save to Canon
   - Added `SaveToCanonModal` integration with `saveToCanonPath` state
   - Library lightbox actions now include "Save to Canon" button

5. **`src/components/workspace/MobileSimplePromptInput.tsx`** — Wired metadata → auto-role
   - `handlePickerSelect` now accepts third `metadata` arg from canon selections
   - When `metadata.source === 'character_canon'`, auto-assigns matching slot role via `onSlotRoleChange`
   - Maps outputType to SlotRole: portrait→character, position→position, clothing→clothing, scene→scene, style→style

### Remaining: Phase 4 — Polish & Enrichment

**Not yet implemented:**

1. **Storyboard auto-tag**: Attach `characterId` to clip metadata when canon assets are used as storyboard references
2. **Picker thumbnail enrichment**: Show character name + output type badge overlay on Characters tab thumbnails
3. **Deduplication badges**: Show "Already in Library"/"Already in Canon" indicators before duplicate save actions
