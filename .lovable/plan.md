
# Add Source Selection Menu to Workspace Reference Slots

## Overview
When clicking an empty reference slot in image mode, instead of jumping straight to the Library picker, show a small dropdown menu with three options:
1. **Photo** -- opens the device camera/file picker (native file input)
2. **Library** -- opens the existing ImagePickerDialog
3. **File** -- opens native file picker for image files

## Changes

### 1. Add a DropdownMenu to the empty RefSlot click (MobileQuickBar.tsx)
**File**: `src/components/workspace/MobileQuickBar.tsx`

- Import `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger` from the existing UI components
- Import `Camera`, `Library`, `Upload` icons from lucide-react
- Modify the `RefSlot` component to accept two new optional callbacks:
  - `onAddFromLibrary?: () => void` -- opens the library picker
  - `onAddFromFile?: () => void` -- opens native file input
- When `onAddFromLibrary` is provided (image mode), the empty slot's `+` button becomes a `DropdownMenuTrigger` instead of a plain button
- The dropdown shows three items:
  - **Photo** (Camera icon) -- calls `onAdd()` which opens native file input with `capture` attribute
  - **Library** (Library icon) -- calls `onAddFromLibrary()`
  - **File** (Upload icon) -- calls `onAddFromFile()` which opens native file input without capture

### 2. Pass source-specific callbacks from MobileSimplePromptInput
**File**: `src/components/workspace/MobileSimplePromptInput.tsx`

- Add a new handler `handleFileUploadForSlot(index)` that opens the native file picker (existing `fileInputRef.current?.click()` path)
- Add a new handler `handlePhotoForSlot(index)` that opens file input with camera capture
- Modify `handleFileSelectForSlot` to become `handleLibraryForSlot` (opens library picker)
- Pass `onFixedSlotAddFromLibrary` and `onFixedSlotAddFromFile` through to `MobileQuickBar`
- Add a second hidden file input with `capture="environment"` for the Photo option

### 3. Wire through MobileQuickBar props
**File**: `src/components/workspace/MobileQuickBar.tsx`

- Add `onFixedSlotAddFromLibrary` and `onFixedSlotAddFromFile` to `MobileQuickBarProps`
- Pass these to `RefSlot` when rendering Quick Scene fixed slots

## Technical Details

| File | Change |
|------|--------|
| `src/components/workspace/MobileQuickBar.tsx` | Add dropdown to empty RefSlot; new props for library/file callbacks |
| `src/components/workspace/MobileSimplePromptInput.tsx` | Split slot-add into 3 source handlers; add camera file input; pass new props |

The DropdownMenu will reuse the existing Radix dropdown already used throughout the app. No new dependencies needed.

### Dropdown appearance
```text
+------------------+
| Camera icon  Photo   |
| Library icon Library |
| Upload icon  File    |
+------------------+
```

The dropdown triggers from the same `+` button in each empty slot, keeping the visual layout unchanged.
