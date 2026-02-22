

# Refactor Settings Sheet Reference Section

## Problem
The "Reference Image" section in the settings sheet (lines 559-640) uses the old `MobileReferenceImagePreview` component with `File` objects, but the new workflow populates URL-based fixed slots. Images appear broken because the `File` prop is often null.

## Solution
Replace the old single-ref preview with a grid of labeled reference slots that mirrors the Quick Bar's `RefSlot` pattern, showing actual thumbnails from signed URLs. Support up to 10 slots for future expansion (both image and video modes).

## Changes

### MobileSettingsSheet.tsx
- Remove the old "Reference Image" section (lines 559-640) that uses `MobileReferenceImagePreview` with `file` + `imageUrl`
- Replace with a new "References" section containing a grid of up to 10 labeled slots:
  - **Image mode**: First 4 slots labeled "Char 1", "Char 2", "Char 3", "Pose" (matching Quick Bar), plus 6 future slots labeled "Ref 5"..."Ref 10"
  - **Video mode**: Slots labeled "Start", "End", plus 8 future slots
- Each slot is a small thumbnail (h-12 w-12) with its label below, showing the signed URL image directly via `<img src={url}>` -- no more `MobileReferenceImagePreview` / `File` dependency
- Empty slots show a dashed border with a "+" icon, clickable to add
- Filled slots show a thumbnail with an "X" remove button on hover
- Keep the Copy mode toggle and Strength slider below the slot grid when any slot is filled
- New props: replace the old single `referenceImage`/`referenceImageUrl` props with a `refSlots` array of `{ url, label, role }` objects, plus `onRefSlotAdd(index)` and `onRefSlotRemove(index)` callbacks

### MobileSimplePromptInput.tsx
- Build a unified `settingsRefSlots` array (up to 10 entries) from the existing state: `referenceImageUrl`, `referenceImage2Url`, `additionalRefUrls`
- Pass `refSlots`, `onRefSlotAdd`, `onRefSlotRemove` to `MobileSettingsSheet` instead of the old `referenceImage`/`referenceImageUrl` props
- Reuse existing `handleFileSelectForSlot` and `handleRemoveSlot` for the callbacks

## Technical Details

### New Settings Sheet Props (replacing old ref props)
```text
// Remove:
referenceImage, referenceImageUrl, onReferenceImageSelect, onReferenceImageRemove

// Add:
refSlots: Array<{ url?: string | null; label: string; role?: string }>
onRefSlotAdd: (index: number) => void
onRefSlotRemove: (index: number) => void
```

### Slot Grid Layout
- Uses `grid grid-cols-5 gap-2` for a compact 5-column layout
- Each slot: `h-12 w-12` thumbnail with `text-[8px]` label below
- First 4 slots in image mode match Quick Bar labels exactly
- Slots 5-10 are dimmed/disabled placeholders labeled "Ref 5"..."Ref 10" with a "Coming soon" tooltip -- these are purely visual placeholders, not yet functional

### Shared Rendering
The slot rendering in the settings sheet is self-contained (not importing `RefSlot` from `MobileQuickBar`) since the settings sheet slots are larger (h-12) and include additional controls (Copy toggle, Strength slider) that the Quick Bar slots don't have.

### Files Changed
1. `src/components/workspace/MobileSettingsSheet.tsx` -- Replace ref section with 10-slot grid
2. `src/components/workspace/MobileSimplePromptInput.tsx` -- Build and pass refSlots array to settings sheet
