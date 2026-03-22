

## Tagging UX Audit & Unification Plan

### Current State — Three Disconnected Tagging Surfaces

```text
Surface         Tags Column?   Tag UI?              Save Flow
───────────────────────────────────────────────────────────────
Workspace       NO (no tags    NO — role is set      Save to Library (no tags
                column on      per-slot at runtime,  applied). Save to Canon
                workspace_     lost when asset       (via modal, requires
                assets)        expires)              character).

Library         YES (tags[]    YES — RoleTagButton   Tags persist. Can
                on user_       in UnifiedLightbox    "Save to Canon" from
                library)       via LightboxActions)  here.

Character       YES (tags[]    Grouped tag picker    Tags set at upload or
Canon           on character_  in PositionsGrid      edit time. character_id
(References)    canon)         upload popover)       is required (NOT NULL).
```

### Problems Identified

1. **Workspace has no tagging** — Slot roles (`character`, `position`, `clothing`) are runtime-only state in `slotRoles[]`. When you save to library, no role tag is carried over. The user must open the library, find the asset, and manually tag it.

2. **Library uses old tag convention** — `RoleTagButton` shows 5 simple role toggles (`character`, `clothing`, `position`, `scene`, `style`). It does not show the grouped tag picker (composition, interaction, intimate, etc.) from the References tab. Two different tagging UIs for the same concept.

3. **Canon requires a character** — `character_canon.character_id` is NOT NULL. You cannot store a "generic two-people-hugging position" without associating it to a specific character. This blocks the use case of reusable position templates.

4. **Workspace → Library loses context** — `handleSaveToLibrary` calls `WorkspaceAssetService.saveToLibrary(asset.id)` with no tags. The slot role the user already assigned is discarded.

5. **No tagging in workspace** — Even if we fix the save flow, there's no UI to tag an asset while it's still in workspace tiles.

### Design Decisions

**Q: Should tagging automatically save to library?**
No. Tagging and saving are separate concerns. But when saving to library FROM workspace, the existing slot role should be carried over as a `role:X` tag automatically.

**Q: Can we tag position references without a character?**
Yes — use `user_library` with `role:position` + grouped tags (`duo`, `hugging`, etc.). This is the "generic template" path. Character-specific references use `character_canon`. Both are already surfaced in the ImagePickerDialog (Library tab vs Characters tab).

**Q: Should the library tag UI match the References tag UI?**
Yes. The `RoleTagButton` should be enhanced to show grouped tags (interaction, intimate, etc.) when the asset has a `role:position` tag, and clothing tags when it has `role:clothing`. Same grouped picker, same tag vocabulary.

### Proposed Changes

**1. Auto-carry slot role on save-to-library** (`MobileSimplifiedWorkspace.tsx`)
- When `handleSaveToLibrary` is called, read `slotRoles[index]` for the asset's slot
- Pass the role to `WorkspaceAssetService.saveToLibrary(assetId, { tags: ['role:position'] })`
- Update `WorkspaceAssetService.saveToLibrary` to accept optional tags

**2. Unify tag picker across Library and References** (`RoleTagButton.tsx`)
- Extend `RoleTagButton` to accept an optional `outputType` or detect it from existing `role:X` tags
- When a role is active (e.g., `role:position`), show the relevant grouped tags from `TAG_GROUPS_BY_OUTPUT_TYPE` below the role toggles
- Reuse the same `POSITION_TAG_GROUPS`, `CLOTHING_TAG_GROUPS`, etc. from `positionTags.ts`
- This gives library assets the same rich tagging as canon assets

**3. Add inline tag button to workspace tiles** (optional, lower priority)
- Add a small tag icon to workspace `AssetTile` that opens the same `RoleTagButton` popover
- Tags are stored in component state (not DB) since `workspace_assets` has no tags column
- On save-to-library, these tags transfer automatically

**4. Generic position templates via library** (no schema change)
- Position references without a character stay in `user_library` with `role:position` + descriptive tags
- The ImagePickerDialog Library tab already surfaces these via tag filtering
- No need to make `character_canon.character_id` nullable — that table is specifically for character-bound references

### Files to Change

- `src/components/shared/RoleTagButton.tsx` — Add grouped sub-tags based on active role, using `TAG_GROUPS_BY_OUTPUT_TYPE`
- `src/pages/MobileSimplifiedWorkspace.tsx` — Pass slot role as tag when saving to library
- `src/lib/services/NewWorkspaceAssetService.ts` — Accept optional tags param in `saveToLibrary`
- `src/components/shared/LightboxActions.tsx` — Pass `outputType` context to `RoleTagButton`

### What This Enables

- Generate an image in workspace → slot is "Position" → save to library → automatically tagged `role:position` → open in library lightbox → add `duo`, `hugging`, `passionate` via grouped picker → reusable as generic template OR save to canon for a specific character

