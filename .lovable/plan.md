

# Simplify Video Mode: 5 Fixed Ref Boxes, Content-Driven Model Switching

## Problem
The current implementation gates how many ref slots are visible based on whether the "multi" model is already selected. This is backwards -- the slots should always be there, and the model should auto-switch based on what the user fills in.

## Current State (What's Wrong)
- QuickBar shows **2 slots** in standard video, **4 slots** only when multi model is already active
- Settings Sheet mirrors the same limited slot count
- No per-image strength controls in the Settings Sheet
- Model must be manually selected before extra slots appear -- chicken-and-egg problem

## Desired Behavior
1. Video mode **always shows 5 ref boxes** in QuickBar (Start, Key 2, Key 3, Key 4, End)
2. **First image added** (any slot) -> auto-switch to **i2v** model
3. **Video file added** -> auto-switch to **v2v extend** model  
4. **2+ images filled** -> auto-switch to **multi** model
5. Settings Sheet shows all 5 boxes with **per-image strength sliders** (0.1-1.0)
6. Empty middle slots are simply skipped during generation

## Changes

### 1. `MobileSimplePromptInput.tsx` -- Always 5 video slots

Remove the `isVideoMulti` gating. Video mode always builds 5 labeled slots:

```
const VIDEO_LABELS = ['Start', 'Key 2', 'Key 3', 'Key 4', 'End'];
const videoRefSlots = VIDEO_LABELS.map((label, i) => {
  let url = null, isVideo = false;
  if (i === 0) { url = beginningRefImageUrl; isVideo = ref1IsVideo; }
  else if (i === 4) { url = endingRefImageUrl; isVideo = ref2IsVideo; }
  else { url = additionalRefUrls[i - 1] || null; }
  return { url, isVideo, label };
});
const maxVideoSlots = 5; // always 5
```

Remove `isVideoMulti` checks from `handleRemoveSlot`, `handleDropSlot`, `handleDropSlotUrl` -- treat ALL video slots the same way (slot 0 = start, slot 4 = end, slots 1-3 = additionalRefUrls[0-2]).

### 2. `MobileQuickBar.tsx` -- Remove multi-gating logic

Remove the `isVideoMulti` variable and `selectedModelTasks` prop dependency for slot rendering. Video mode always renders `refSlots` as-is (which will now always be 5). Remove the `AddSlotButton` in video mode -- fixed at 5.

The `showLabel` is always `true` for video slots (was gated on `isVideoMulti`).

### 3. `MobileSettingsSheet.tsx` -- Per-image strength in References

When `currentMode === 'video'` and a slot has an image, show a small strength slider under its thumbnail:

```
{slot.url && currentMode === 'video' && (
  <div className="w-12">
    <input type="range" min={0.1} max={1} step={0.05} 
           value={keyframeStrengths?.[i] ?? 1} 
           onChange={(e) => onKeyframeStrengthChange?.(i, parseFloat(e.target.value))} />
    <span className="text-[7px]">{((keyframeStrengths?.[i] ?? 1) * 100).toFixed(0)}%</span>
  </div>
)}
```

Add new props: `keyframeStrengths?: number[]` and `onKeyframeStrengthChange?: (index: number, strength: number) => void`.

Hide the global "Strength" slider and "Exact Copy" toggle when in video mode (they don't apply).

### 4. `useLibraryFirstWorkspace.ts` -- Add keyframe strengths state + pass through

Add state:
```typescript
const [keyframeStrengths, setKeyframeStrengths] = useState<number[]>([1, 1, 1, 1, 1]);
```

In the multi-model generation branch, use per-slot strength:
```typescript
inputObj.images = filledUrls.map((image_url, i) => ({
  image_url,
  start_frame_num: frames[i],
  strength: keyframeStrengths[originalSlotIndices[i]] ?? 1,
}));
```

Pass `keyframeStrengths` and `setKeyframeStrengths` down through `MobileSimplePromptInput` to `MobileSettingsSheet`.

### 5. Auto-model switching (already mostly works via `useSmartModelDefaults`)

The existing `useSmartModelDefaults` hook already handles task-based model lookup. The auto-switching in `useLibraryFirstWorkspace` should trigger on slot fill count:
- 0 filled images -> `t2v`
- 1 filled image -> `i2v`  
- 1 filled video -> `extend`
- 2+ filled images -> `multi`

This logic likely already exists but needs to count ALL 5 slots, not just the first 2.

## Files Summary

| File | Change |
|------|--------|
| `MobileSimplePromptInput.tsx` | Always 5 video slots, remove `isVideoMulti` gating, pass strength props |
| `MobileQuickBar.tsx` | Remove `isVideoMulti` logic, always show labels for video, remove AddSlotButton for video |
| `MobileSettingsSheet.tsx` | Add per-image strength slider under each filled video ref, new props |
| `useLibraryFirstWorkspace.ts` | Add `keyframeStrengths` state, use in `images[]` payload, pass down |

