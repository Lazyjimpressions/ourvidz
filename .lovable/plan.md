

## Plan: Wire Up Motion Video Picker to 4-Source Standard

### Problem
The motion reference video picker (both quick bar and settings modal) only has 3 dropdown options, and "Photo Library" duplicates "Upload file". It should match the 4-source standard used by image reference slots: Upload File, Photo Library (camera/native), From Library, From Workspace.

### Changes

**File: `src/components/workspace/MobileSimplePromptInput.tsx`** (quick bar motion ref dropdown, ~lines 937-950)
- Keep "Upload file" as-is (triggers `motionVideoInputRef`)
- Fix "Photo Library" to use a separate file input with `capture="environment"` for native device gallery
- Keep "From Library" opening `ImagePickerDialog` with `source="library"` and `mediaType="video"`
- Add "From Workspace" opening `ImagePickerDialog` with `source="workspace"` and `mediaType="video"`
- Add state `motionPickerSource` to track which source to pass to the picker dialog

**File: `src/components/workspace/MobileSettingsSheet.tsx`** (settings modal motion ref dropdown, ~lines 758-788)
- Same 4-option pattern: Upload File, Photo Library (with capture), From Library, From Workspace
- "From Library" calls `onMotionRefVideoUrlAdd` with a source parameter, or add a new `onMotionRefVideoUrlAddFromWorkspace` callback
- Simplest approach: add a new prop `onMotionRefVideoUrlAddFromWorkspace` that opens the picker with `source="workspace"`, or pass source as argument to `onMotionRefVideoUrlAdd`

### Execution
1. Update quick bar dropdown to 4 options with workspace picker support
2. Update settings sheet dropdown to 4 options with workspace picker support
3. Wire the `ImagePickerDialog` for workspace source in both locations

