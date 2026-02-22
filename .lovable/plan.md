

# Expand Workspace Reference Slots from 4 to 10

## Current State

- **Quick Bar** renders exactly 4 fixed slots: Char 1, Char 2, Char 3, Pose
- **Settings Tray** renders a 10-slot grid but slots 5-10 show a Lock icon and are non-functional
- **Data layer** stores refs across 3 separate variables: `referenceImageUrl` (slot 0), `referenceImage2Url` (slot 1), `additionalRefUrls[]` (slots 2-3 only, length 2)
- **Figure notation** in `useLibraryFirstWorkspace.ts` is hardcoded for max 4 refs (3 chars + 1 pose)
- Labels already exist for all 10 slots in the Settings Tray: Char 1-3, Pose, Ref 5-10

## What Changes

### 1. Quick Bar -- Show scrollable 10 slots (`MobileQuickBar.tsx`)

Expand `FIXED_IMAGE_SLOTS` from 4 entries to 10:
```
Char 1, Char 2, Char 3, Pose, Ref 5, Ref 6, Ref 7, Ref 8, Ref 9, Ref 10
```

The Quick Bar already has `overflow-x-auto scrollbar-hide` on the slot container, so 10 small slots will scroll horizontally without layout issues. Empty slots beyond the first few will be compact dashed-border `+` buttons.

### 2. Settings Tray -- Unlock all 10 slots (`MobileSettingsSheet.tsx`)

Remove the `isActive = i < activeCount` gating (lines 540-541) that locks slots 5-10 behind a Lock icon. All 10 slots will be functional: clickable to add, showing thumbnails when filled, removable.

Change the grid from `grid-cols-5` to `grid-cols-5` (keep as-is, 2 rows of 5 fits perfectly).

### 3. Data layer -- Extend `additionalRefUrls` to hold 8 items (`MobileSimplifiedWorkspace.tsx`)

Currently `additionalRefUrls` stores slots 2-3 (2 items). Expand to store slots 2-9 (up to 8 items). The mapping stays the same:
- Slot 0 = `referenceImageUrl`
- Slot 1 = `referenceImage2Url`
- Slots 2-9 = `additionalRefUrls[0]` through `additionalRefUrls[7]`

No schema changes needed -- `additionalRefUrls` is already a `string[]` in React state.

### 4. Slot wiring -- Map all 10 slots (`MobileSimplePromptInput.tsx`)

Update the `fixedSlots` array (line 472) from 4 entries to 10, mapping slots 4-9 to `additionalRefUrls[2]` through `additionalRefUrls[7]`.

Update `handleRemoveSlot` and `onFixedSlotDropUrl` handler to handle indices 0-9.

Update the Settings Tray `refSlots` builder (line 649) to populate URL data for all 10 slots instead of only the first 4.

### 5. Figure notation -- Generalize for N refs (`useLibraryFirstWorkspace.ts`)

Replace the hardcoded `if charCount === 1/2/3` Figure prefix logic (lines 1357-1368) with a dynamic builder:

```
// Build Figure notation dynamically for any number of refs
const charRefs = allRefUrls.slice(0, -1); // all except last = characters
const poseRef = allRefUrls[allRefUrls.length - 1]; // last = pose
const charList = charRefs.map((_, i) => `Figure ${i + 1}`).join(', ');
figurePrefix = `Show the character(s) from ${charList} in the pose from Figure ${allRefUrls.length}: `;
```

This handles 1-9 character refs + 1 pose ref without hardcoding.

### 6. Settings Tray slot add -- Support file picker for any index

The `handleFileSelectForSlot(index)` in `MobileSimplePromptInput.tsx` already routes by index. The upload handler at line 259 already handles `index >= 2` via the `additionalRefUrls` array. No changes needed here beyond ensuring the array expands properly (which it already does with the `while (newAdditional.length <= additionalIndex)` pattern).

## Files Changed

| File | Change |
|------|--------|
| `src/components/workspace/MobileQuickBar.tsx` | Expand `FIXED_IMAGE_SLOTS` from 4 to 10 entries |
| `src/components/workspace/MobileSettingsSheet.tsx` | Remove Lock gating on slots 5-10, make all active |
| `src/components/workspace/MobileSimplePromptInput.tsx` | Expand `fixedSlots` array to 10 entries, update refSlots builder |
| `src/hooks/useLibraryFirstWorkspace.ts` | Replace hardcoded Figure notation with dynamic N-ref builder |

## What Does NOT Change

- No database schema changes
- No new components
- No changes to the edge function or API layer
- Video mode slots (Start/End) unchanged
- Upload, remove, drag-drop mechanics all work as-is (they are index-based)

