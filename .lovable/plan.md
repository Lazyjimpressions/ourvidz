

## Plan: T2V → Motion Reference Pipeline + Draggable Motion Ref

### What Was Implemented

#### 1. "Use as Motion Ref" action button (Film icon)
- **SharedGrid.tsx**: Added `onUseAsMotionRef` to actions interface; renders a Film icon button on workspace video tiles
- **LightboxActions.tsx**: Added `onUseAsMotionRef` prop to `WorkspaceAssetActions`; renders Film button when asset is video

#### 2. Smart video routing in "Use as Reference"
- **MobileSimplifiedWorkspace.tsx** `handleUseAsReference` video branch updated:
  - **Priority 1**: If no motion ref set → routes to `motionRefVideoUrl` (character swap)
  - **Priority 2**: If motion ref set but no start image → routes to `beginningRefImageUrl` (extend)
  - **Priority 3**: Both filled → overflows to `endingRefImageUrl`

#### 3. Dedicated `handleUseAsMotionRef` callback
- Explicit handler that always sets video as `motionRefVideoUrl`
- Wired into SharedGrid's `onUseAsMotionRef` action and lightbox's `WorkspaceAssetActions`

#### 4. Draggable motion ref thumbnail
- **MobileSimplePromptInput.tsx**: Motion ref thumbnail is now `draggable` with `cursor-grab`
- Sets `application/x-ref-image` data transfer (same format as workspace grid tiles)
- Users can drag the motion ref video and drop it into image ref slot 1 for Video Extend workflow

### User Flows

**T2V → Character Swap:**
1. Generate T2V video (no refs, video mode)
2. Click Film icon or "Use as Reference" on the video tile
3. Video auto-routes to Motion Reference slot
4. Add identity image to Slot 1 → auto-switches to MultiCondition model

**Motion Ref → Video Extend:**
1. Motion ref is populated with a video
2. Drag the motion ref thumbnail → drop on image ref Slot 1 (Start)
3. Video routes to `beginningRefImageUrl`, model switches to Extend

### Files Changed

| File | Change |
|------|--------|
| `src/components/shared/SharedGrid.tsx` | Added `onUseAsMotionRef` action + Film icon for video tiles |
| `src/components/shared/LightboxActions.tsx` | Added `onUseAsMotionRef` prop + Film button for videos |
| `src/pages/MobileSimplifiedWorkspace.tsx` | Smart video routing, `handleUseAsMotionRef`, wired into grid + lightbox |
| `src/components/workspace/MobileSimplePromptInput.tsx` | Motion ref thumbnail now draggable with `application/x-ref-image` data |
