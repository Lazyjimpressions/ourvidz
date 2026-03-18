

# Updated Plan: Video Character Swap via Existing Workspace

## Revised Approach

No new panels, modes, or edge functions. The existing Video Multi Mode workflow already supports character swap (character image in keyframe slot + dance video in Motion Reference). The user uploads source videos through the standard workspace upload flow (ref slots / motion ref box), generates results, and saves them.

Two real gaps need fixing:

## Gap 1: Video Thumbnails Show Blank Until Hover

**Current state**: `SharedGridCard` already generates client-side video thumbnails via canvas capture (lines 250-296 of `SharedGrid.tsx`). However, this only triggers when the tile becomes visible AND `asset.originalPath` exists AND no `thumbUrl` is set. The thumbnail generation requires signing the video URL first, which is lazy and can fail silently.

**The real issue**: For user-uploaded source videos (not generated), there may be no `thumbUrl` from the webhook pipeline. The client-side fallback works but has a noticeable delay.

**Fix**: The existing client-side thumbnail generation is correct. The improvement needed is to ensure the `AssetTile` shows the video fallback icon with a "loading thumbnail" spinner state more prominently, and to eagerly trigger thumbnail generation for workspace video assets rather than waiting for visibility + hover. This is minor -- the infrastructure exists.

**File**: `src/components/shared/SharedGrid.tsx` -- Make video thumbnail generation trigger earlier (on mount rather than lazy visibility for workspace assets).

## Gap 2: Library Needs a "Videos" Tab

**Current state**: `UpdatedOptimizedLibrary.tsx` has 3 tabs: All, Characters, Scenes. Filtering uses `content_category` and `tags` metadata. Videos are mixed into "All" with no dedicated tab.

**Fix**: Add a 4th tab "Videos" that filters by `asset.type === 'video'`.

**File**: `src/components/library/UpdatedOptimizedLibrary.tsx`
- Change tab type from `'all' | 'characters' | 'scenes'` to include `'videos'`
- Change `grid-cols-3` to `grid-cols-4`
- Add `TabsTrigger value="videos">Videos</TabsTrigger>`
- Add filter block:
  ```typescript
  if (activeTab === 'videos') {
    return allAssets.filter(asset => asset.type === 'video');
  }
  ```

## Existing Functionality That Already Works

1. **Save to Library**: `workspace-actions` edge function's `save_to_library` action already handles videos -- copies from `workspace-temp` to `user-library`, handles video thumbnails with fallback to job reference image (lines 96-200).

2. **SharedGrid Save button**: The Save button on workspace tiles (`onSaveToLibrary`) is already shown for ALL workspace assets regardless of type (line 479 of SharedGrid.tsx).

3. **ImagePickerDialog**: Already supports `mediaType="video"` prop for filtering video assets from the library, used by the Motion Reference picker.

4. **Drag and drop**: Works for both images and videos across workspace tiles and ref slots.

5. **Upload flow**: `MobileSimplePromptInput.tsx` already handles video file uploads through the ref slot file input (lines 293-376), including size validation, duration probing, and uploading to `reference_images` bucket.

## Implementation Summary

| Step | File | Change |
|------|------|--------|
| 1 | `src/components/library/UpdatedOptimizedLibrary.tsx` | Add "Videos" tab (4th tab), filter by `asset.type === 'video'` |
| 2 | `src/components/shared/SharedGrid.tsx` | Improve video thumbnail generation timing -- trigger earlier for workspace video assets |
| 3 | `.lovable/plan.md` | Update plan to reflect simplified approach |

Total: ~15 minutes. Two small, focused changes.

