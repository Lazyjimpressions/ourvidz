

# Character Reference Images in Character Studio V3

## Design Decision: Single Table

**Recommendation: Use `character_canon` as the single source of truth.** It already has a flexible `metadata` JSONB column for rich tagging and `output_type` for categorization. We'll add a `tags` text array column for fast filtering and an `is_primary` boolean (borrowed from `character_anchors`). The `character_anchors` table will be left unused -- no migration needed since it only has 2 dev rows.

## Schema Change: Expand `character_canon`

Add three columns to `character_canon`:

| Column | Type | Purpose |
|--------|------|---------|
| `tags` | `text[]` | Filterable tags: `front`, `side`, `rear`, `3/4`, `full-body`, `casual`, `formal`, `action`, `seated`, etc. |
| `is_primary` | `boolean DEFAULT false` | Marks the primary reference for this character |
| `label` | `text` | Optional user-facing name, e.g., "Front neutral", "Red dress side" |

The existing `output_type` field will serve as the top-level category: `pose`, `outfit`, `style`, `position`. The `metadata` JSONB remains available for future LoRA-related data (training set membership, quality scores, etc.).

RLS: Same policy pattern as `character_portraits` -- users can CRUD their own character's canon entries.

## New Tab: "Positions" in Character Studio V3

Add a fourth tab alongside Details, Portraits, and Scenes.

**Mobile**: Tab bar becomes `details | portraits | positions | scenes`

**Desktop**: Workspace area gets a `portraits | positions | scenes` tab selector (positions tab is new)

### Positions Tab Content

- **Filter bar**: Horizontal pill toggles for `output_type` values (All, Pose, Outfit, Style, Position). Below that, a tag cloud or search for the `tags` array.
- **Grid**: 3-column (mobile) or 4-column (desktop) thumbnail grid of canon images for this character, filtered by the active type/tag.
- **Each thumbnail**: Shows the image with a small type badge (bottom-left). Hover/tap reveals:
  - **Delete** (trash icon)
  - **Set Primary** (star icon, fills when active)
  - **Send to Workspace** (arrow-right icon) -- copies URL and offers to open workspace with `?ref=` param
  - **Edit Tags** (tag icon) -- inline popover to add/remove tags
- **Add button**: Dashed-border upload button at the end of the grid. On click, opens file picker. After upload, shows a small popover to select `output_type` and add tags before saving.
- **Generate from Workspace**: A subtle "Create in Workspace" link that navigates to `/workspace?mode=image` so users can generate new position images there and later save them back.

### "Send to Workspace" Flow

Same as the previous plan: copies signed URL, shows toast with "Open Workspace" button that navigates to `/workspace?mode=image&ref={encodedUrl}`. The workspace consumes the `?ref=` param and auto-fills the first empty slot.

## Hook: Extend `useCharacterStudio`

Add to the hook:

- `canonImages: CharacterCanon[]` -- state for loaded canon entries
- `loadCanon(characterId)` -- fetches from `character_canon` WHERE `character_id`, ordered by `is_primary DESC, created_at DESC`
- `uploadCanon(file, outputType, tags, label?)` -- uploads to `reference_images` bucket, inserts row, refreshes
- `deleteCanon(canonId)` -- deletes row + optional storage cleanup, refreshes
- `updateCanonTags(canonId, tags)` -- updates tags array
- `setCanonPrimary(canonId)` -- resets all `is_primary` for character, sets target

Auto-load canon when `savedCharacterId` changes (same pattern as `loadScenes`).

## Files Changed

| File | Change |
|------|--------|
| **SQL migration** | `ALTER TABLE character_canon ADD COLUMN tags text[] DEFAULT '{}', ADD COLUMN is_primary boolean DEFAULT false, ADD COLUMN label text;` + RLS policies |
| `src/hooks/useCharacterStudio.ts` | Add canon state, CRUD functions, auto-load |
| `src/pages/CharacterStudioV3.tsx` | Add "positions" to mobile tabs and desktop workspace tabs, wire canon props |
| `src/components/character-studio-v3/StudioWorkspace.tsx` | Render PositionsGrid when positions tab is active |
| **New: `src/components/character-studio-v3/PositionsGrid.tsx`** | Grid component with filter bar, thumbnails, upload, tag editing |
| `src/pages/MobileSimplifiedWorkspace.tsx` | Consume `?ref=` query param to auto-fill first empty slot |

## What Does NOT Change

- Portraits tab and portrait generation workflow unchanged
- Scenes tab unchanged
- No edge function changes
- No changes to workspace slot system (already supports 10 slots)
- `character_anchors` table left as-is (deprecated, not deleted)

