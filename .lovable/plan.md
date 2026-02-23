

# MultiCondition Video UI: Comprehensive Upgrade

## Answers to Your Questions

### 1. Frames vs Seconds
Frame rate should be fixed at 30fps (the model default). Users think in seconds, not frames. One duration slider (1-5s) is correct. The system multiplies internally: `num_frames = duration * 30`. No need for separate frame/fps controls.

### 2. Video Conditioning
The `videos[]` array lets you provide a short video clip as a temporal reference -- the model will continue/blend from it alongside your image keyframes. Think of it as "extend from this clip while transitioning to these keyframes." It's powerful but adds complexity; recommend deferring to a later phase.

### 3. Per-Image Strength (from fal.ai screenshot)
Each image in the `images[]` array supports a `strength` field (0-1, default 1). This controls how strongly each keyframe influences the generated video at its frame position. Our current code does NOT pass `strength` -- it only sends `image_url` and `start_frame_num`. This is a missing feature.

### 4. QuickBar Ref Slots for Video
Currently video mode shows dynamic `refSlots` starting with just 2 ("Start"/"End"). The `AddSlotButton` only appears when ALL existing slots are filled. For multi, we should show 3-5 labeled slots by default: "Start", "Mid 1", "Mid 2", "End" -- similar to image mode's fixed slot pattern.

### 5. Keyframe Spacing Logic
Each slot needs two controls visible when filled:
- **Frame position** (auto-calculated from a time input, e.g. "0.0s", "1.5s", "4.0s") -- snapped to multiples of 8 frames
- **Strength** slider (0-1)

Auto-spacing distributes filled images evenly across the duration by default, but users can override individual positions. The last filled slot defaults to the final frame.

### 6. Strength -- confirmed missing from payload
The `images[]` objects we build only have `{ image_url, start_frame_num }`. Need to add `strength` field.

### 7. Drag & Drop -- works in QuickBar, missing in Settings Sheet
QuickBar ref slots have `onDrop` handlers. Settings Sheet renders plain buttons/images without drag event handlers.

### 8. More than 2 refs -- UI limitation
The generation logic hardcodes `filledUrls = [refImageUrl, endRefUrl]` -- only 2 sources. Need to expand to pull from additional ref slots.

### 9. LoRAs
Schema supports `loras[]` array but no UI exists. Significant feature requiring a LoRA browser. Defer to future phase.

### 10. Overall UI design -- see plan below

---

## Implementation Plan

### Phase 1: Core Multi Video UI (This Sprint)

#### A. Fixed Keyframe Slots in QuickBar (video + multi model)

**File: `MobileQuickBar.tsx`**

When `currentMode === 'video'` AND multi model is selected, switch from dynamic 2-slot layout to a fixed 4-slot layout:

| Slot | Label | Default Frame Position |
|------|-------|----------------------|
| 0 | Start | 0 (always) |
| 1 | Mid 1 | auto-spaced |
| 2 | Mid 2 | auto-spaced |
| 3 | End | last frame (always) |

- Use the existing `RefSlot` component with labels
- Keep the `AddSlotButton` to allow up to 5 slots
- Empty middle slots are simply skipped during generation (only filled slots contribute to `images[]`)

#### B. Per-Keyframe Controls in Settings Sheet

**File: `MobileSettingsSheet.tsx`**

For each filled keyframe slot, show:
1. Thumbnail with remove button
2. **Time position**: small input showing seconds (e.g. "0.0s", "2.0s") -- converted to `start_frame_num` as `Math.round(seconds * fps / 8) * 8`
3. **Strength**: compact slider 0-1, default 1

Also:
- Add `onDragOver`/`onDrop` handlers to ref slot elements (mirrors QuickBar)
- Hide "Motion Intensity" slider when multi model is selected
- Hide "Strength" (the old single-ref strength) when multi model is selected

#### C. Expand Generation Logic to All Slots

**File: `useLibraryFirstWorkspace.ts`**

Replace the hardcoded 2-source array:
```
const filledUrls = [refImageUrl, endRefUrl].filter(Boolean)
```

With a gather from all ref sources:
```
const allRefUrls = [
  refImageUrl,
  endRefUrl,
  ...additionalRefUrls
].filter(Boolean)
```

Each entry in `images[]` gets:
```
{ image_url, start_frame_num, strength }
```

Where `strength` comes from per-slot state (new state array, default 1.0 for all).

#### D. Per-Slot State for Frame Position & Strength

**File: `useLibraryFirstWorkspace.ts` (state) + `MobileSimplePromptInput.tsx` (props)**

Add new state:
```typescript
const [keyframeStrengths, setKeyframeStrengths] = useState<number[]>([1, 1, 1, 1, 1]);
const [keyframePositions, setKeyframePositions] = useState<number[] | null>(null); // null = auto-space
```

When `keyframePositions` is null, use `autoSpaceFrames()`. When user manually adjusts a time input, store the override.

#### E. Update `input_schema` in DB

Add `strength` to the images schema description so the edge function doesn't strip it. Currently `images` has `type: "string"` which is misleading -- the edge function handles it as an array anyway, but we should ensure `strength` passes through.

Check: The edge function's `alwaysAllowed` set already includes `images`. The `strength` field is nested inside each image object, so it should pass through without being stripped.

---

### Files to Modify

| File | Change | Lines |
|------|--------|-------|
| `MobileQuickBar.tsx` | Add fixed 4-slot keyframe layout for video+multi mode | ~30 lines |
| `MobileSettingsSheet.tsx` | Add per-keyframe time/strength controls, drag-drop, hide irrelevant sliders | ~50 lines |
| `useLibraryFirstWorkspace.ts` | Gather all ref URLs into `images[]`, add `strength` field, per-slot state | ~25 lines |
| `MobileSimplePromptInput.tsx` | Pass keyframe state props down to QuickBar and Settings | ~15 lines |
| `videoSlots.ts` | Add strength to `VideoRefSlot` type | ~3 lines |

### Not in This Sprint
- Video conditioning (`videos[]` array) -- deferred
- LoRA browser UI -- deferred  
- Frame rate selector -- fixed at model default (30fps)
- Slots beyond 5 -- can expand later

