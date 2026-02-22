

## Fix Multi-Reference Slot Issues

### Issue 1 & 2: Race condition + auto-fill Ref 2

**Root cause**: When Ref 1 is already populated, clicking the Ref 1 slot (or using "Use as Reference" from the grid) tries to overwrite Ref 1, causing state conflicts. Instead, new references should auto-fill Ref 2 when Ref 1 is occupied.

**Changes in `MobileQuickBar.tsx`**:
- Make the filled Ref 1 slot clickable -- tapping it should trigger `onAddRef2` (not `onAddRef1`) when Ref 1 is already populated. Add an `onClick` to the filled thumbnail div that routes to the appropriate add handler.
- Actually simpler: when Ref 1 is filled, clicking on it does nothing (keep current). The real fix is in the parent logic.

**Changes in `MobileSimplePromptInput.tsx`**:
- Update `onAddRef1` logic: if ref1 is already populated, redirect the file select to ref2's slot type instead. Change line 438 from always using `'single'/'start'` to checking if ref1 is already filled, and if so, routing to `'ref2'/'end'`.

**Changes in `MobileSimplifiedWorkspace.tsx`**:
- Update `handleUseAsReference`: when an image/video is used as reference and Ref 1 is already occupied, populate Ref 2 instead. Check `referenceImageUrl` (image mode) or `beginningRefImageUrl` (video mode) before deciding which slot to fill.

### Issue 3: Drag and drop on desktop

**Changes in `MobileQuickBar.tsx`**:
- Add `onDragOver` and `onDrop` event handlers to each RefSlot.
- Empty slot: drop fills that slot.
- Filled Ref 1 slot: drop fills Ref 2 (auto-overflow).
- New props: `onDropRef1` and `onDropRef2` callbacks that accept a `File`.

**Changes in `MobileSimplePromptInput.tsx`**:
- Add drop handler functions that process the dropped file through the same upload pipeline as `handleFileInputChange` (validate, HEIC convert, upload, set URL).
- Extract the file processing logic from `handleFileInputChange` into a shared `processAndUploadFile(file, slotType)` helper to avoid duplication.
- Pass drop handlers down to `MobileQuickBar`.

### Issue 4: Video ref shows broken image

**Root cause**: `RefSlot` renders `<img>` for all refs. Video URLs can't render in an `<img>` tag -- they show a broken image icon.

**Changes in `MobileQuickBar.tsx`**:
- In the `RefSlot` component, when `isVideo` is true, render a `<video>` element instead of `<img>`:
  - Use `<video src={url} muted preload="metadata" />` to show a thumbnail frame.
  - Keep the Film icon overlay for visual indication.
- Alternatively, for a simpler approach: when `isVideo` is true, show a styled placeholder with the Film icon (no broken image), since video thumbnails from signed URLs may not always load in a `<video>` tag either. This is the safer approach.

**Recommended approach**: Use a `<video>` tag with `preload="metadata"` which will show the first frame as a poster. Wrap in an error handler that falls back to the Film icon placeholder if it fails to load.

### Technical Details

**Files modified**:
1. `src/components/workspace/MobileQuickBar.tsx` -- RefSlot video rendering, drop zone support
2. `src/components/workspace/MobileSimplePromptInput.tsx` -- auto-overflow ref1->ref2 logic, extract shared file processor, wire drop handlers
3. `src/pages/MobileSimplifiedWorkspace.tsx` -- handleUseAsReference auto-overflow to ref2

**Auto-overflow logic summary**:
- `onAddRef1` becomes smart: if ref1 is filled, it calls the ref2 add path instead.
- `handleUseAsReference`: checks if ref1 slot is occupied before deciding target slot.
- No changes to the remove logic -- individual X buttons continue to clear their own slot.

