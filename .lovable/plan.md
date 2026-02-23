
# Simplify Video Mode: 5 Fixed Ref Boxes, Content-Driven Model Switching

## Status: ✅ IMPLEMENTED

## Changes Made

### 1. `MobileSimplePromptInput.tsx` — Always 5 video slots
- Removed `isVideoMulti` gating; video mode always builds 5 labeled slots: Start, Key 2, Key 3, Key 4, End
- Slot 0 = beginningRefImageUrl, Slot 4 = endingRefImageUrl, Slots 1-3 = additionalRefUrls[0-2]
- All handlers (remove, drop, dropUrl) treat video slots uniformly

### 2. `MobileQuickBar.tsx` — Removed multi-gating logic
- Removed `isVideoMulti` variable; video always renders all `refSlots` with labels
- Removed `AddSlotButton` for video mode (fixed at 5)
- `showLabel` always true for video slots

### 3. `MobileSettingsSheet.tsx` — Per-image strength sliders
- Added per-keyframe strength slider (0.1–1.0) under each filled video ref slot
- New props: `keyframeStrengths`, `onKeyframeStrengthChange`
- Global "Strength" slider and "Exact Copy" toggle hidden in video mode

### 4. `useLibraryFirstWorkspace.ts` — Keyframe strengths state + generation payload
- Added `keyframeStrengths` state (5-element array, default all 1.0)
- MultiCondition `images[]` payload now includes per-slot `strength` from `keyframeStrengths`
- Exposed via `LibraryFirstWorkspaceState` and `LibraryFirstWorkspaceActions` interfaces

### 5. `MobileSimplifiedWorkspace.tsx` — Props threading + auto-switching
- Threads `keyframeStrengths` and `onKeyframeStrengthChange` to `MobileSimplePromptInput`
- `onAdditionalRefsChange` now triggers auto-model-switching for video mid-slots
