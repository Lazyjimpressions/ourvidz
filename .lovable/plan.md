

# Add Category-Filtered Library Picker to Workspace Reference Slots

## Overview

When clicking an empty reference slot in the workspace, instead of just opening a native file picker, open the `ImagePickerDialog` with **category filter tabs** (All, Characters, Positions, Scenes, Outfits). Each tab filters `user_library` assets by their `tags` column (e.g., `role:character`, `role:position`). This makes it easy to find the right type of reference for each Quick Scene slot.

## Current State

- Clicking a reference slot calls `handleFileSelectForSlot(index)` which does `fileInputRef.current?.click()` -- a native file upload dialog
- `ImagePickerDialog` exists with Workspace/Library source toggle but **no category filtering**
- Library assets have `tags` like `['character', 'portrait']`, `['role:position']`, etc.
- The Quick Scene slots already have role context (Char A, Char B, Pose, Scene, Outfit)

## Changes

### 1. Add `filterTag` prop to `ImagePickerDialog`

**File**: `src/components/storyboard/ImagePickerDialog.tsx`

Add an optional `filterTag?: string` prop that, when set, pre-filters library assets by that tag. Also add category filter tabs within the Library source view:

```
Tabs: All | Characters | Positions | Scenes | Outfits
```

Each tab filters the library query by checking `tags` array contains the corresponding role tag. The `filterTag` prop sets the initially active tab (e.g., clicking the "Pose" slot pre-selects the "Positions" tab).

Implementation:
- Add state: `activeCategory: 'all' | 'character' | 'position' | 'scene' | 'clothing'`
- Initialize from `filterTag` prop
- Filter `filteredAssets` additionally by checking if `asset.tags?.includes(activeCategory)` or `asset.tags?.includes('role:' + activeCategory)`
- Render small pill tabs above the search bar (only when `activeSource === 'library'`)

### 2. Open `ImagePickerDialog` from reference slot clicks

**File**: `src/components/workspace/MobileSimplePromptInput.tsx`

Change `handleFileSelectForSlot` to offer both options:
- Open the `ImagePickerDialog` (with the slot's role as `filterTag`)
- Keep the native file upload as a secondary option (upload button within the dialog or a separate action)

Add state:
```typescript
const [pickerOpen, setPickerOpen] = useState(false);
const [pickerSlotIndex, setPickerSlotIndex] = useState<number>(0);
```

Map Quick Scene slot index to a filter tag:
```
Slot 0 (Char A) -> filterTag: 'character'
Slot 1 (Char B) -> filterTag: 'character'
Slot 2 (Pose)   -> filterTag: 'position'
Slot 3 (Scene)  -> filterTag: 'scene'
Slot 4 (Outfit) -> filterTag: 'clothing'
```

When user selects an image from the dialog, route it through the existing slot-assignment logic (same as drag-and-drop URL handling via `onFixedSlotDropUrl`).

### 3. Add a "Positions" content_category for new position assets

Currently `user_library` has `content_category` values: `character` (117), `general` (42), `scene` (1). There are no `position`-tagged assets yet.

When assets are saved from Character Studio's Positions tab, they already get `tags: ['role:position']`. The filter will work based on `tags` -- no schema change needed. As users save position references (single or duo), they'll appear under the Positions tab.

For **duo poses**: these are just position-tagged images that happen to show two people. No special data model needed. When saved to library with `tags: ['role:position', 'duo']`, they show up in the Positions filter tab. If a character is identifiable in the duo image (tagged with the character name), it can also be shown on that character's Positions page by querying `character_canon` or `user_library` by character name tag.

## File Summary

| File | Change |
|------|--------|
| `src/components/storyboard/ImagePickerDialog.tsx` | Add `filterTag` prop; add category pill tabs (All, Characters, Positions, Scenes, Outfits) that filter by `tags`; render tabs only when source is Library |
| `src/components/workspace/MobileSimplePromptInput.tsx` | Change `handleFileSelectForSlot` to open `ImagePickerDialog` with role-based `filterTag`; add picker state; render `ImagePickerDialog` instance; map slot index to filter tag; handle selection by routing through existing URL assignment logic |
| `src/components/workspace/MobileQuickBar.tsx` | No changes needed -- slot click handlers already call through to parent |

## Technical Notes

- The native file input remains available as a fallback (the dialog can include an "Upload from device" button)
- `ImagePickerDialog` already handles URL signing, search, and asset selection -- we're just adding a tag filter layer
- The `tags` column in `user_library` has a GIN index, so filtering by tag is efficient
- Duo poses are simply position-tagged images with a `duo` tag -- no new tables or columns

