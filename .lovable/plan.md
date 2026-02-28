

# Fix: Make Motion Reference Box Interactive

## Problems

1. **Settings Sheet "Motion / Camera Reference" is not clickable** -- the empty state (line 917) renders a static `div` with "No video" text and no `onClick`, no upload trigger, nothing. Users see it but can't interact with it.

2. **QuickBar motion ref slot lacks source menu** -- clicking the `+ Video` box only opens a native file picker. There's no dropdown to choose between Photo Library, Library, or File upload like the image keyframe slots have. The "Library" link exists but is a tiny, easy-to-miss underlined text.

3. **Both need the same 3-source pattern** used by image keyframe slots: Photo Library (device camera roll), Library (ImagePickerDialog), and File upload.

## Solution

### A. Settings Sheet: Make motion ref slot clickable

In `MobileSettingsSheet.tsx`, the empty motion ref state (lines 917-919) needs:
- An `onClick` handler that triggers an action in the parent
- New prop: `onMotionRefVideoUrlAdd?: () => void` to let the parent handle the source selection
- Or simpler: show a small "Add Video" button that calls this prop

Since the Settings Sheet is a display/config surface, the simplest approach is to add an "Add" button that triggers a callback, which `MobileSimplePromptInput` handles by opening the motion video picker.

### B. QuickBar: Add source dropdown to motion ref slot

In `MobileSimplePromptInput.tsx`, replace the current bare `onClick` (line 840) + separate "Library" link with a `DropdownMenu` matching the pattern used by image keyframe slots:

- **Upload file** -- triggers `motionVideoInputRef.current?.click()`
- **Photo Library** -- triggers a camera roll picker (same as image slots use `handlePhotoForSlot`)
- **From Library** -- triggers `setMotionPickerOpen(true)`

This gives users the same familiar 3-option source menu for video that they already have for images.

### C. Settings Sheet: Wire "Add" action back to prompt input

Add a new prop `onMotionRefVideoUrlAdd` to the Settings Sheet. When the user taps the empty motion ref area in Settings, it calls this prop. In `MobileSimplePromptInput`, the handler opens the motion video source dropdown or directly opens the library picker.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/workspace/MobileSimplePromptInput.tsx` | Replace motion ref `onClick` + "Library" link with a `DropdownMenu` offering Upload / Photo Library / Library options. Add handler for Settings Sheet "add" callback. |
| `src/components/workspace/MobileSettingsSheet.tsx` | Add `onMotionRefVideoUrlAdd` prop. Make the empty motion ref div clickable with an "Add Video" button that calls this prop. |

## Technical Details

### MobileSimplePromptInput.tsx

Replace lines 837-871 (the empty motion ref slot) with:

```text
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <div className="h-8 w-12 rounded border border-dashed border-muted-foreground/30 
                    flex items-center justify-center flex-shrink-0 cursor-pointer 
                    hover:border-primary/50 transition-colors">
      <span className="text-[8px] text-muted-foreground/50">+ Video</span>
    </div>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="start" className="w-36">
    <DropdownMenuItem onClick={() => motionVideoInputRef.current?.click()}>
      <Upload /> Upload file
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => { /* photo library handler */ }}>
      <Camera /> Photo Library  
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setMotionPickerOpen(true)}>
      <Library /> From Library
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

Remove the separate "Library" text link since it's now in the dropdown.

### MobileSettingsSheet.tsx

Replace the static empty state (lines 917-919) with:

```text
<button
  type="button"
  onClick={() => onMotionRefVideoUrlAdd?.()}
  className="h-12 w-24 rounded-md border border-dashed border-muted-foreground/30 
             flex flex-col items-center justify-center hover:border-primary/50 
             transition-colors cursor-pointer"
>
  <Film className="w-3 h-3 text-muted-foreground/50 mb-0.5" />
  <span className="text-[8px] text-muted-foreground/50">Add Video</span>
</button>
```

Add `onMotionRefVideoUrlAdd` to the props interface and pass it from `MobileSimplePromptInput` (where it opens the motion source dropdown or library picker).

