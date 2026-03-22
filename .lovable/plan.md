

## Phased Plan: Character Poses as Dual-Purpose Production Assets

### Current State
- **Character canon images** (`character_canon` table, `reference_images` bucket) store poses, positions, outfits, styles tied to a specific character
- **ImagePickerDialog** only browses two sources: `user-library` bucket and `workspace-temp` bucket — canon assets are invisible
- **Positions grid** generates/displays canon images but they can only be "sent to workspace" via navigation state — no way to browse and pick them from other contexts (storyboard, roleplay, workspace ref slots)
- Canon images have `output_type` (portrait, position, clothing, etc.) and `tags[]` for role tagging

### Dual Purpose
1. **Character-specific**: "Show me this character in this exact pose" — identity-locked generation
2. **Generic reference**: "Use this pose/outfit/style to drive any production" — the asset itself becomes a template regardless of character

---

## Phase 1: Surface Canon Assets in ImagePickerDialog

**Goal**: Make character poses, outfits, and styles browsable from every context that uses ImagePickerDialog (workspace, storyboard, roleplay, character studio).

**Changes**:

1. **Add a "Characters" source tab** to `ImagePickerDialog` alongside Workspace and Library
   - File: `src/components/storyboard/ImagePickerDialog.tsx`
   - New `activeSource` option: `'characters'`
   - When selected, query `character_canon` table joined with `characters` (for name/thumbnail)
   - Group by character with a character selector dropdown at top
   - Reuse existing category filter tabs (Position, Character, Clothing, Scene) mapped to `output_type`

2. **Sign from correct bucket**: When source is `'characters'`, sign against `reference_images` bucket instead of `user-library`

3. **Enrich `onSelect` callback**: Pass metadata alongside the URL so consumers know the asset's origin:
   - `source: 'character_canon'`
   - `characterId`, `outputType`, `tags`
   - This enables downstream consumers to auto-tag or auto-configure (e.g., workspace auto-sets role badge)

**No new tables or migrations needed.**

---

## Phase 2: Smart Context Filtering

**Goal**: When the picker opens from a specific context, pre-filter to the most relevant assets.

**Changes**:

1. **Add `contextHint` prop** to ImagePickerDialog
   - Values: `'identity'` | `'pose'` | `'outfit'` | `'scene'` | `'style'` | `'motion'` | `'general'`
   - When `'identity'` → auto-select Characters tab, filter to `output_type = 'portrait'`
   - When `'pose'` → auto-select Characters tab, filter to `output_type = 'position'`
   - When `'outfit'` → auto-select Characters tab, filter to `output_type = 'clothing'`
   - When `'general'` → default Library tab, no filter

2. **Wire context hints** into existing consumers:
   - Workspace keyframe slots → `contextHint='identity'`
   - Workspace clothing/position role slots → `contextHint` matches the role
   - Storyboard reference image picker → `contextHint='general'`
   - Roleplay portrait picker → `contextHint='identity'`

---

## Phase 3: Bidirectional Canon ↔ Library Bridge

**Goal**: Let users promote any library asset to a character's canon, or save a canon asset to library for general use.

**Changes**:

1. **"Save to Canon" action** in UnifiedLightbox for library assets
   - Opens a mini modal: pick character + output_type (pose, outfit, style, scene)
   - Copies asset to `reference_images` bucket, inserts `character_canon` row
   - Auto-tags with `role:` prefix

2. **"Save to Library" action** on canon assets (already partially exists as "Send to Workspace")
   - Copies to `user-library` bucket, inserts `user_library` row
   - Preserves tags and prompt metadata
   - Makes the pose/outfit available as a generic template decoupled from any character

3. **Deduplication awareness**: Show a subtle badge if an asset already exists in the other system

---

## Phase 4: Inline Preview + Role Auto-Assignment

**Goal**: When a canon asset is selected from the picker, the consuming context automatically understands what it is.

**Changes**:

1. **Workspace auto-role**: When a canon position/outfit/style is picked into a workspace ref slot, auto-assign the matching `SlotRole` from the asset's `output_type`
   - Position canon → `role:position` slot role
   - Clothing canon → `role:clothing` slot role
   - No manual role badge clicking needed

2. **Storyboard auto-tag**: When a canon asset is selected as a clip reference, auto-populate the clip's `reference_image_source` as `'character_canon'` and carry the character context

3. **Picker preview enrichment**: Show character name + output type badge on thumbnails in the Characters tab so users can visually distinguish "Char A front pose" from "Char B outfit"

---

## Technical Details

- **No new tables needed** for Phases 1-2. Phase 3 needs no schema changes either (just cross-bucket copy + existing table inserts).
- **Bucket signing**: The `ImagePickerDialog` signing loop (line 199) currently hardcodes bucket from `activeSource`. For the `'characters'` source, use `reference_images`.
- **SharedAsset mapping**: Add a `toSharedFromCanon()` mapper in `AssetMappers.ts` that converts `character_canon` rows to the existing `SharedAsset` interface, mapping `output_url` → `originalPath`, `output_type` → tags, etc.
- **Query pattern**: `supabase.from('character_canon').select('*, characters(name, reference_image_url)').eq('character_id', selectedCharId)` — leverages the existing FK relationship.

### Priority Order
Phase 1 is the highest-impact change — it makes all existing canon assets immediately accessible everywhere. Phase 2 is UX polish. Phase 3 enables the "use this pose for other characters" workflow. Phase 4 is automation.

