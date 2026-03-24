

## Plan: Add "Copy Video to Workspace" Button on Motion Ref

### What the user wants
When a video is loaded into the motion reference box (in the settings modal or quick bar), a small "Copy" button should appear on the thumbnail. Tapping it saves that video file as a workspace tile — no model needed, just a file copy into the workspace grid.

### How it works

**Settings Modal (`MobileSettingsSheet.tsx`, ~line 706-746)**
- When `motionRefVideoUrl` is set and the thumbnail is showing, add a small `Copy` icon button overlay (similar to the existing X/remove button)
- On click, call `onCopyVideoToWorkspace?.()` — a new callback prop

**Quick Bar (`MobileSimplePromptInput.tsx`, ~line 916-929)**  
- Same pattern: add a `Copy` icon button on the motion ref thumbnail
- On click, call the same copy handler

**New prop: `onCopyVideoToWorkspace`**
- Added to `MobileSettingsSheetProps` and threaded from `MobileSimplePromptInput`
- The handler (in the parent workspace page) will:
  1. Upload the video file from the motion ref URL to `workspace-temp` bucket
  2. Insert a `workspace_assets` row with `asset_type = 'video'`
  3. Toast "Video copied to workspace"

**Implementation in parent (`WorkspacePage.tsx` or wherever props are wired)**
- New handler: `handleCopyVideoToWorkspace`
- Fetches the video blob from the signed URL (`motionRefVideoUrl`)
- Uploads to `workspace-temp` bucket under the user's folder
- Inserts into `workspace_assets` table directly via Supabase client
- Triggers workspace refresh

### Files to modify

| File | Change |
|------|--------|
| `src/components/workspace/MobileSettingsSheet.tsx` | Add Copy button on motion ref thumbnail + new `onCopyVideoToWorkspace` prop |
| `src/components/workspace/MobileSimplePromptInput.tsx` | Add Copy button on quick bar motion ref + thread new prop to settings sheet |
| Parent workspace page (where props are wired) | Implement `handleCopyVideoToWorkspace` handler |

### Technical detail
- The copy button uses the `Copy` icon (already imported in MobileSettingsSheet)
- Positioned as a second overlay button (bottom-right or top-left) on the motion ref thumbnail, alongside the existing X/remove button (top-right)
- The handler fetches the blob from the signed URL, re-uploads to `workspace-temp`, and inserts a `workspace_assets` row — same pattern used by the `copy_to_workspace` edge function but done client-side for simplicity since we already have the video URL

