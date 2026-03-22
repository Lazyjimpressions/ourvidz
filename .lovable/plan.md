


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

### Remaining Phases (not yet implemented)

**Phase 3: Bidirectional Canon ↔ Library Bridge** — "Save to Canon" and "Save to Library" actions in lightbox

**Phase 4: Role Auto-Assignment** — Auto-set workspace slot roles when canon assets are selected
