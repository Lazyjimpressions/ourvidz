

# Fix: Workspace Lockup + Video Picker in Settings Modal

## Problem 1: Screen Locks Up When Selecting LTX Multi Model

**Root Cause**: When the user selects the LTX 13B Multi model, the I2I support check (`useLibraryFirstWorkspace.ts` ~line 344-349) fails to recognize it as a reference-capable model. The check looks for `input_schema?.image_url` (singular), but the multi model only has `input_schema?.images` (plural array). This causes:

1. `modelSupportsI2I = false`
2. Reference image gets cleared (line 362-368)
3. Clearing triggers the `referenceImageUrl` sync effects (lines 387-400)
4. These syncs cascade between `referenceImageUrl` and `beginningRefImageUrl`, creating a rapid state update loop that freezes the UI

**Fix** (`src/hooks/useLibraryFirstWorkspace.ts`, ~line 344-349):
Add `input_schema?.images` to the I2I support check:

```typescript
modelSupportsI2I = capabilities?.supports_i2i === true || 
                   capabilities?.reference_images === true ||
                   capabilities?.supports_i2v === true ||
                   capabilities?.video?.reference_mode === 'single' ||
                   !!capabilities?.input_schema?.image_url ||
                   !!capabilities?.input_schema?.images ||   // <-- multi model
                   !!capabilities?.input_schema?.video;
```

## Problem 2: Can't Load Video from Workspace/Library in Settings Modal

**Root Cause**: The `ImagePickerDialog` component hard-filters to images only:
- Line 90: Workspace assets filtered with `a.assetType === 'image'`
- Line 105: Library assets filtered with `asset.type === 'image'`

When the motion reference video picker opens from the settings sheet, it uses this same `ImagePickerDialog` with `source="library"` -- but all videos are filtered out, so nothing appears.

**Fix** (`src/components/storyboard/ImagePickerDialog.tsx`):

1. Add an optional `mediaType` prop (`'image' | 'video' | 'all'`, default `'image'`) to the dialog
2. When `mediaType` includes video, adjust both filters:
   - Workspace: `a.assetType === 'image' || a.assetType === 'video'`
   - Library: `asset.type === 'image' || asset.type === 'video'`
3. Update the dialog title default based on media type

**Fix** (`src/components/workspace/MobileSimplePromptInput.tsx`, ~line 1058):
Pass `mediaType="video"` to the motion reference video picker:

```tsx
<ImagePickerDialog
  isOpen={motionPickerOpen}
  onClose={() => setMotionPickerOpen(false)}
  onSelect={(url) => { ... }}
  title="Select Motion Reference Video"
  source="library"
  mediaType="video"
/>
```

Also add a "Workspace" source tab option so users can pick from workspace-generated videos too.

## Summary of File Changes

| File | Change |
|------|--------|
| `src/hooks/useLibraryFirstWorkspace.ts` | Add `images` (plural) to I2I capability check |
| `src/components/storyboard/ImagePickerDialog.tsx` | Add `mediaType` prop to support video filtering |
| `src/components/workspace/MobileSimplePromptInput.tsx` | Pass `mediaType="video"` to motion picker |

