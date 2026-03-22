

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

### Remaining Phases (not yet implemented)

**Phase 2: Smart Context Filtering** — Add `contextHint` prop to auto-select tab/filter based on calling context

**Phase 3: Bidirectional Canon ↔ Library Bridge** — "Save to Canon" and "Save to Library" actions in lightbox

**Phase 4: Role Auto-Assignment** — Auto-set workspace slot roles when canon assets are selected
