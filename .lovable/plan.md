

# Fix Character Studio Image Picker: Dropdown Source + Spinning Images

## Issue 1: Library Button Should Be a Dropdown (Workspace / Library)

The current "Library" button in `CharacterStudioSidebar.tsx` (line 564) is a plain button that opens `ImagePickerDialog`, which only fetches from the `user_library` table. The user wants a dropdown to choose between **Workspace** (recent generations in `workspace_assets`) and **Library** (saved assets in `user_library`).

### Changes

**File: `src/components/character-studio/CharacterStudioSidebar.tsx`**
- Replace the plain "Library" `<Button>` (lines 564-572) with a `<DropdownMenu>` containing two items:
  - "Workspace" -- opens the picker in workspace mode
  - "Library" -- opens the picker in library mode
- Pass the selected source mode to the parent via a new callback or by extending `onOpenImagePicker` to accept a `source` parameter: `onOpenImagePicker(source: 'workspace' | 'library')`

**File: `src/components/storyboard/ImagePickerDialog.tsx`**
- Add a `source` prop: `'workspace' | 'library'` (default `'library'`)
- When `source === 'workspace'`:
  - Fetch from `WorkspaceAssetService.getUserWorkspaceAssets()` instead of `useLibraryAssets()`
  - Map results via `toSharedFromWorkspace` instead of `toSharedFromLibrary`
  - Sign URLs against the `'workspace-temp'` bucket instead of `'user-library'`
- Add a tab/toggle at the top of the dialog so the user can switch between sources inline without closing

**File: `src/pages/CharacterStudio.tsx`**
- Update `showImagePicker` state to also track the source: `useState<{ open: boolean; source: 'workspace' | 'library' }>({ open: false, source: 'library' })`
- Pass `source` to `ImagePickerDialog`

**File: `src/components/character-studio-v3/StudioWorkspace.tsx`**
- Update the `onOpenImagePicker` prop type to accept a source parameter

## Issue 2: Library Images Spin Indefinitely

### Root Cause

The library assets in the database have `thumbnail_path = NULL`. The `useSignedAssets` hook falls back to signing the `originalPath` as the thumbnail. The storage paths (e.g., `3348b481-.../portraits/...png`) are paths within the `user-library` bucket. However, these portrait images were likely saved to the `user-library` bucket but may have file access issues (RLS, missing files, or path format mismatches).

The `useSignedAssets` hook silently catches signing errors (line 93: `console.error` only) and leaves `thumbUrl` as `null`, which causes the spinner to show forever with no error feedback.

### Fix

**File: `src/lib/hooks/useSignedAssets.ts`**
- Add a fallback state: if signing fails for an asset, set `thumbUrl` to a placeholder or error state instead of leaving it as `null` forever
- Track failed asset IDs so the UI can show a broken-image icon instead of an infinite spinner

**File: `src/components/storyboard/ImagePickerDialog.tsx`**
- Add an `onError` handler on the `<img>` tag (line 167-172) to show a fallback broken-image icon if the signed URL fails to load
- Add a timeout: if `thumbUrl` is still `null` after 10 seconds, show a fallback instead of spinning forever

## Technical Details

### Dropdown Implementation (Sidebar)
```typescript
// CharacterStudioSidebar.tsx - Replace lines 564-572
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm" className="flex-1 gap-2">
      <Library className="w-4 h-4" />
      Browse
      <ChevronDown className="w-3 h-3" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="z-[100] bg-popover border border-border">
    <DropdownMenuItem onSelect={() => onOpenImagePicker('workspace')}>
      Workspace (Recent)
    </DropdownMenuItem>
    <DropdownMenuItem onSelect={() => onOpenImagePicker('library')}>
      Library (Saved)
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### ImagePickerDialog Source Switching
```typescript
// Add source prop and conditional data fetching
interface ImagePickerDialogProps {
  source?: 'workspace' | 'library';  // new prop
  // ... existing props
}

// Inside component: switch data source based on prop
const { data: libraryData } = useLibraryAssets();  // existing
const [workspaceData, setWorkspaceData] = useState([]);

useEffect(() => {
  if (source === 'workspace' && isOpen) {
    WorkspaceAssetService.getUserWorkspaceAssets()
      .then(assets => assets.filter(a => a.assetType === 'image'))
      .then(setWorkspaceData);
  }
}, [source, isOpen]);

const bucket = source === 'workspace' ? 'workspace-temp' : 'user-library';
```

### Spinner Fix
```typescript
// ImagePickerDialog.tsx - img tag with error handling
<img
  src={asset.thumbUrl}
  alt={asset.title || 'Image'}
  className="w-full h-full object-cover"
  loading="lazy"
  onError={(e) => {
    e.currentTarget.style.display = 'none';
    // Show fallback broken-image icon
  }}
/>
```

## Files to Change

| File | Change |
|------|--------|
| `src/components/character-studio/CharacterStudioSidebar.tsx` | Replace Library button with dropdown |
| `src/components/storyboard/ImagePickerDialog.tsx` | Add `source` prop, workspace data fetching, spinner fallback |
| `src/pages/CharacterStudio.tsx` | Track source in state, pass to dialog |
| `src/components/character-studio-v3/StudioWorkspace.tsx` | Update `onOpenImagePicker` prop signature |
| `src/lib/hooks/useSignedAssets.ts` | Add error state tracking for failed signings |

