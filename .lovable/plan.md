
# Fix Drag Shrink + Add Missing Ref Slots to Settings Sheet

## Issue 1: Tiles don't shrink when dragged

**Root cause**: `SharedGrid.tsx` passes `onDragStart` to `AssetTile` but never passes `onDragEnd`. The `isDragging` state inside `AssetTile` gets set to `true` on drag start but is never reset to `false`.

**Fix**: Add `onDragEnd` prop to the `AssetTile` in `SharedGrid.tsx` (line ~409). Just pass a no-op or a simple handler since the canvas cleanup is already handled.

### File: `src/components/shared/SharedGrid.tsx`
- After line 409 (`onDragStart={isDraggable ? handleDragStart : undefined}`), add:
  `onDragEnd={isDraggable ? () => {} : undefined}`
  (AssetTile's internal handler already resets `isDragging` -- it just needs the prop to be passed so `onDragEnd` fires)

---

## Issue 2: Reference images not visible in settings tray

**Root cause**: The `refSlots` prop is correctly destructured and `hasAnyRef` is computed in `MobileSettingsSheet.tsx`, but the actual JSX to render the reference slot grid was never added to the component's return statement. The section simply doesn't exist in the rendered output.

**Fix**: Add a "References" section to the settings sheet between the Creative Direction / Video Controls sections and the Advanced Settings section.

### File: `src/components/workspace/MobileSettingsSheet.tsx`
- Insert a new "References" section after the Video Controls block (after line ~532) and before the Advanced Settings block (line ~535)
- The section will contain:
  - A `grid grid-cols-5 gap-2` layout of 10 reference slots
  - First 4 (image) or 2 (video) slots are active; rest are dimmed placeholders with a lock icon
  - Each active slot shows:
    - If filled: thumbnail image (`img src={slot.url}`) with an X remove button on hover
    - If empty: dashed border with a "+" icon, clickable via `onRefSlotAdd(index)`
  - A `text-[8px]` label below each slot (e.g., "Char 1", "Pose", "Start")
  - Below the grid (when any slot is filled): Copy mode toggle and Strength slider using existing `exactCopyMode`/`referenceStrength` props

### Files Changed
1. `src/components/shared/SharedGrid.tsx` -- Add missing `onDragEnd` prop
2. `src/components/workspace/MobileSettingsSheet.tsx` -- Add the reference slots grid JSX
