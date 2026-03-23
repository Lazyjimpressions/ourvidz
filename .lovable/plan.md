

## Unified Tag Taxonomy: DB-Driven Presets

### The Core Insight

There are currently two disconnected tagging systems:
1. **Character Canon** (PositionsGrid) — uses hardcoded `POSITION_TAG_GROUPS`, `CLOTHING_TAG_GROUPS`, etc. from `positionTags.ts`
2. **User Library** (RoleTagButton) — uses `role:X` prefix tags + the same hardcoded groups gated by active role

Both store tags as flat `text[]` on their respective tables. The tag **picker UI** (what options to show) is hardcoded in TypeScript. This means:
- Admin cannot add/remove/reorder tag options without a code deploy
- Users who add custom tags lose group association on reload
- Two separate UIs render the same concept differently

### Proposed Architecture: Presets Table + Flat Storage

```text
┌─────────────────────────────┐
│     tag_presets (DB)         │  ← Admin manages via Admin Portal
│  category, group, tag_value │  ← "The menu"
└──────────────┬──────────────┘
               │ fetched by UI
               ▼
┌─────────────────────────────┐
│  Unified Tag Picker Component│  ← Same component for canon + library
│  (collapsible groups)        │
└──────────────┬──────────────┘
               │ writes to
               ▼
┌─────────────────────────────┐
│  character_canon.tags[]      │  ← Flat text[], unchanged
│  user_library.tags[]         │  ← Flat text[], unchanged
└─────────────────────────────┘
```

**Presets = the menu. Tags[] = the order.** They are decoupled. A custom tag typed by a user goes straight into `tags[]` without needing a preset. An admin can later "promote" a popular custom tag into a preset so it shows in the picker for everyone.

### New Table: `tag_presets`

```sql
CREATE TABLE public.tag_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,        -- 'position', 'clothing', 'scene', 'style'
  group_key text NOT NULL,       -- 'action', 'intimate', 'clothingStyle', etc.
  group_label text NOT NULL,     -- 'Action', 'Intimate', 'Style' (display)
  tag_value text NOT NULL,       -- 'hugging', 'bikini', etc.
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, group_key, tag_value)
);
```

RLS: All authenticated users can SELECT active presets. Admins can INSERT/UPDATE/DELETE.

### Admin vs User Customization

| Action | Admin | User |
|--------|-------|------|
| Add preset tag to picker | Yes (via Admin Portal or DB) | No |
| Remove/deactivate preset tag | Yes | No |
| Reorder tags within a group | Yes (sort_order) | No |
| Add a custom tag to an asset | Yes | Yes (inline input, stored in tags[]) |
| See custom tags in picker | Only after admin promotes | No (appears as pill on asset only) |

Admin gets a new tab in the Admin Portal: **Tag Taxonomy** — a simple CRUD table editor for `tag_presets`, grouped by category. This is a permanent, schema-level change.

Users can type any custom tag via the inline input in each group. It goes into the asset's `tags[]` but does not appear in the picker for other assets. This keeps the picker clean while allowing flexibility.

### Migration Path

1. Create `tag_presets` table
2. Seed it with the current hardcoded values from `positionTags.ts`
3. Create a React Query hook `useTagPresets()` that fetches and caches presets
4. Replace hardcoded constants in the tag picker with data from `useTagPresets()`
5. Keep `positionTags.ts` as a **fallback** — if the query fails, use hardcoded values (graceful degradation)
6. Unify the tag picker: both `RoleTagButton` and PositionsGrid's inline popover use the same `<UnifiedTagPicker>` component fed by `useTagPresets()`

### Unified Tag Picker Component

A single `<UnifiedTagPicker>` replaces both the PositionsGrid inline popover and the RoleTagButton sub-tags:
- Accepts `tags: string[]` and `onTagsChange: (tags: string[]) => void`
- Fetches presets via `useTagPresets()`
- Renders collapsible category sections (Position, Clothing, Scene, Style)
- Auto-expands sections with active tags
- Each section has an inline custom tag input
- Custom tags render as pills within their section (tracked via local state mapping `tag → groupKey`)
- Orphan tags (from DB, not in any preset or custom map) render in a "Custom" section at bottom

### What Changes

- **New migration**: `tag_presets` table + seed data from current hardcoded values
- **New hook**: `src/hooks/useTagPresets.ts` — fetches presets, groups by category/group, caches
- **New component**: `src/components/shared/UnifiedTagPicker.tsx` — replaces both tag UIs
- **Admin tab**: `src/components/admin/TagTaxonomyTab.tsx` — CRUD for tag_presets
- **Update**: `PositionsGrid.tsx` — use `UnifiedTagPicker` instead of inline popover
- **Update**: `RoleTagButton.tsx` — use `UnifiedTagPicker` for sub-tags
- **Update**: `Admin.tsx` — add Tag Taxonomy tab
- **Keep**: `positionTags.ts` as fallback constants + `FILTER_TAG_VOCABULARY` (derived from presets at runtime)

### What Stays the Same

- `character_canon.tags[]` — flat text array, no schema change
- `user_library.tags[]` — flat text array, no schema change
- `output_type` on character_canon — kept as primary category, unchanged
- Filter logic in PositionsGrid — still uses tag vocabulary for cross-category filtering, just sourced from presets instead of hardcoded constants

