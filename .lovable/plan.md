

## Revised Plan: Shared Tag Editor Component

### Core Insight

You're right — the tag picker in PositionsGrid and the one needed in the Library lightbox are driven by the same `tag_presets` table via the same `UnifiedTagPicker` component. The only difference is the **save target** (character_canon vs user_library) and the **category hint** (output_type vs content_category). That's a callback difference, not a component difference.

The PositionsGrid already has the correct mobile pattern (lifted state + ResponsiveModal drawer + UnifiedTagPicker). Instead of rebuilding that in the library, we should extract it into a shared component.

### What to Build

**1. New shared component: `TagEditorDrawer`**

Extract the drawer pattern from PositionsGrid into `src/components/shared/TagEditorDrawer.tsx`:

```text
Props:
  - open: boolean
  - onOpenChange: (open: boolean) => void
  - tags: string[]
  - onTagsChange: (tags: string[]) => void
  - categoryHint?: string        // "position", "character", "scene", etc.
  - title?: string               // e.g. asset label
  - categoryBadge?: string       // e.g. "portrait", "position"
```

Internals: `ResponsiveModal` → `ResponsiveModalContent` → header with Tag icon + badge + count → `UnifiedTagPicker`. No save logic — the parent handles persistence via `onTagsChange`.

**2. Update PositionsGrid to use `TagEditorDrawer`**

Replace the inline ResponsiveModal block (lines 668-697) with `<TagEditorDrawer>`. No behavior change — just deduplication.

**3. Update Library lightbox to use `TagEditorDrawer`**

In `UpdatedOptimizedLibrary.tsx`:
- Add state: `tagEditorAssetId: string | null`, `tagEditorDraft: string[]`
- In `actionsSlot`, replace the inline `RoleTagButton` (which opens a broken popover) with a simple tag icon button that calls `setTagEditorAssetId(asset.id)`
- Render `<TagEditorDrawer>` once, outside the lightbox, with `onTagsChange` wired to the existing `handleDescriptiveTagToggle` / `handleRoleTagToggle` logic
- On close, persist any changes

**4. Simplify `RoleTagButton` usage**

The legacy role tag vertical list inside `RoleTagButton`'s popover becomes unnecessary in lightbox contexts. Keep `RoleTagButton` for non-lightbox grid hover actions (where popovers work fine on desktop). In the `TagEditorDrawer`, role tags can optionally be shown as horizontal pills above the `UnifiedTagPicker` — same data, better layout.

**5. Update `LightboxActions.tsx`**

Add `onOpenTagEditor?: () => void` prop to `LibraryAssetActions`. When provided, render a simple tag trigger button instead of `RoleTagButton`. When not provided, fall back to current `RoleTagButton` popover (backward compatible for non-lightbox contexts).

### What Does NOT Need Separate Logic

- The `UnifiedTagPicker` component itself — already shared, no changes needed
- The `useTagPresets` hook — already shared
- The tag data model — both tables store flat `tags[]` arrays with the same vocabulary

### Character vs Non-Character: No Convention Break

Both `character_canon.tags` and `user_library.tags` store the same tag vocabulary from `tag_presets`. The only difference is: canon assets always have a `character_id` (so `categoryHint` comes from `output_type`), while library assets use `content_category`. This is handled by the `categoryHint` prop — the shared component doesn't care about the source table.

### Files to Modify

| File | Change |
|------|--------|
| `src/components/shared/TagEditorDrawer.tsx` | **New** — shared drawer with ResponsiveModal + UnifiedTagPicker |
| `src/components/shared/LightboxActions.tsx` | Add `onOpenTagEditor` prop, render trigger button when provided |
| `src/components/library/UpdatedOptimizedLibrary.tsx` | Lift tag editor state, render `TagEditorDrawer`, wire save logic |
| `src/components/character-studio-v3/PositionsGrid.tsx` | Replace inline drawer with `TagEditorDrawer` |

