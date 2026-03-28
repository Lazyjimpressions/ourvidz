# Video Multi-Reference Mode Specification

---
**Version:** 1.0.0
**Last Updated:** 2026-03-22
**Status:** Active
**Depends On:** [LTX_VIDEO_13B_FAL_AI_GUIDE.md](../../09-REFERENCE/LTX/LTX_VIDEO_13B_FAL_AI_GUIDE.md)

---

## Overview

Multi-reference video mode enables **character-swap workflows** using the LTX Video 13B MultiCondition endpoint. Users provide a single identity image that gets anchored at multiple keyframes throughout the video timeline, combined with a motion reference video that provides choreography and camera movement.

**Primary Use Case:** Replace the person in a dance/motion video with a different character while preserving the original choreography.

---

## Keyframe Slot System

The workspace provides 5 keyframe slots that map to positions along the video timeline:

| Slot | Label | Frame Position | Character-Swap Usage |
|------|-------|----------------|---------------------|
| 0 | Start | Frame 0 | **Active** - First anchor |
| 1 | Key 2 | ~25% of video | Greyed out (unused) |
| 2 | Key 3 | Midpoint | **Active** - Middle anchor |
| 3 | Key 4 | ~75% of video | Greyed out (unused) |
| 4 | End | Last frame | **Active** - Final anchor |

### Frame Position Calculation

Frame positions are calculated dynamically based on video duration:

```typescript
// From useLibraryFirstWorkspace.ts
const numFrames = 121;  // Default: ~4s at 30fps
const lastFrame = numFrames - 1;  // 120
const midFrame = Math.floor(lastFrame / 2);  // 60

function getFrameForSlot(slotIndex: number): number {
  switch (slotIndex) {
    case 0: return 0;           // Start
    case 1: return Math.floor(lastFrame * 0.25);  // Key 2
    case 2: return midFrame;    // Key 3 (mid)
    case 3: return Math.floor(lastFrame * 0.75);  // Key 4
    case 4: return lastFrame;   // End
    default: return 0;
  }
}
```

---

## Character-Swap Mode

### Detection Logic

Character-swap mode is automatically detected when all conditions are met:

1. **Video mode** is active
2. **Motion reference video** is set (`motionRefVideoUrl`)
3. **At least one keyframe image** is set

```typescript
// From MobileSimplifiedWorkspace.tsx
const isCharacterSwapMode =
  mode === 'video' &&
  !!motionRefVideoUrl &&
  keyframeSlots.some(slot => !!slot.url);
```

### Visual Feedback

When character-swap mode is active:

- **Slots 1 and 3 are greyed out** (opacity-30, pointer-events-none)
- **Strength sliders hidden** for disabled slots
- **Preflight indicator** shows active anchor indices [0, 2, 4]
- **Motion reference box** displays video thumbnail

### Three-Anchor System

In character-swap mode, a single identity image is duplicated to create 3 anchors:

```typescript
// From useLibraryFirstWorkspace.ts (lines 1517-1528)
if (uniqueImageUrls.size === 1) {
  const canonicalUrl = inputObj.images[0].image_url;
  const s0 = keyframeStrengths[0] ?? 1.0;  // Start slot → frame 0
  const s1 = keyframeStrengths[2] ?? 1.0;  // Key 3 slot → mid frame
  const s2 = keyframeStrengths[4] ?? 1.0;  // End slot → last frame

  inputObj.images = [
    { image_url: canonicalUrl, start_frame_num: 0, strength: s0 },
    { image_url: canonicalUrl, start_frame_num: midFrame, strength: s1 },
    { image_url: canonicalUrl, start_frame_num: lastFrame, strength: s2 },
  ];
}
```

---

## Strength Configuration

### Per-Anchor Strengths

Each anchor has an independent strength value controlled via UI sliders:

| Anchor | UI Slot | Default Value | Effect |
|--------|---------|---------------|--------|
| Start | Slot 0 | 1.0 | Strong identity lock at beginning |
| Mid | Slot 2 | 0.6 | Moderate identity reinforcement |
| End | Slot 4 | 0.3 | Allow motion to dominate toward end |

### Motion Video Strength

The motion reference video has its own strength control:

- **Default:** 0.55
- **Range:** 0.0 - 1.0
- **Lower values:** Less appearance bleed from source video
- **Higher values:** More motion fidelity, but may transfer source appearance

---

## Motion Conditioning Options

### Conditioning Type Dropdown

Controls how motion is extracted from the reference video:

| Value | Description |
|-------|-------------|
| `default` | Standard conditioning (identity transfer) |
| `identity` | Focus on identity preservation |
| `pose` | Extract pose/skeleton only |
| `depth` | Use depth map for motion guidance |

### Preprocess Toggle

When enabled (`preprocess: true`), applies pose estimation preprocessing to the motion reference video before conditioning. Useful for cleaner pose extraction.

---

## API Payload Structure

### MultiCondition Endpoint

**Endpoint:** `fal-ai/ltx-video-13b-distilled/multiconditioning`

### Example Payload

```json
{
  "prompt": "create video of woman dancing. Same appearance as the input image, matching choreography of reference video",
  "images": [
    {
      "image_url": "https://..../identity.png",
      "start_frame_num": 0,
      "strength": 1.0
    },
    {
      "image_url": "https://..../identity.png",
      "start_frame_num": 60,
      "strength": 0.75
    },
    {
      "image_url": "https://..../identity.png",
      "start_frame_num": 120,
      "strength": 0.5
    }
  ],
  "videos": [
    {
      "video_url": "https://..../motion_reference.mp4",
      "start_frame_num": 0,
      "strength": 0.55,
      "conditioning_type": "pose",
      "preprocess": true
    }
  ],
  "num_frames": 121,
  "frame_rate": 30,
  "resolution": "720p",
  "aspect_ratio": "auto",
  "expand_prompt": false,
  "negative_prompt": "worst quality, inconsistent motion, blurry, jittery, distorted",
  "first_pass_num_inference_steps": 9,
  "second_pass_num_inference_steps": 11
}
```

### Critical Field Notes

- **`start_frame_num`** (not `start_frame_number`): API field name for frame position
- **`strength`**: Per-anchor identity influence (0.0 - 1.0)
- **Images array**: All entries can use same URL for character-swap

---

## Implementation Files

### Core Files

| File | Purpose |
|------|---------|
| [useLibraryFirstWorkspace.ts](../../../src/hooks/useLibraryFirstWorkspace.ts) | Frame calculations, strength mapping, generate function |
| [MobileSettingsSheet.tsx](../../../src/components/workspace/MobileSettingsSheet.tsx) | Keyframe slot UI, conditioning controls, disabled slot styling |
| [MobileSimplePromptInput.tsx](../../../src/components/workspace/MobileSimplePromptInput.tsx) | Preflight indicator, character-swap mode detection |
| [MobileSimplifiedWorkspace.tsx](../../../src/pages/MobileSimplifiedWorkspace.tsx) | Mode detection, prop wiring |
| [fal-image/index.ts](../../../supabase/functions/fal-image/index.ts) | API payload construction, conditioning timeline |

### Key Functions

```typescript
// useLibraryFirstWorkspace.ts
getFrameForSlot(slotIndex: number): number  // Map slot → frame position
generate()  // Build API payload with images/videos arrays

// fal-image/index.ts
getConditioningTimeline()  // Sanitize conditioning parameters
buildModelInput()  // Construct final API payload
```

---

## UI Components

### MobileSettingsSheet - Keyframe Slots

```
┌─────────────────────────────────────────────────┐
│  References                                      │
├─────────────────────────────────────────────────┤
│  [Start] [Key2] [Key3] [Key4] [End]             │
│   ✓       ░░░    ✓      ░░░    ✓               │
│  1.0%          0.75%          0.50%             │
│  (slider)      (slider)       (slider)          │
└─────────────────────────────────────────────────┘

░░░ = Greyed out in character-swap mode
✓   = Active slots with strength sliders
```

### Motion Reference Box

```
┌─────────────────────────────────────────────────┐
│  Motion Reference                                │
├─────────────────────────────────────────────────┤
│  ┌──────────────┐                               │
│  │  [Thumbnail] │  Strength: 0.55              │
│  │   🎬 video   │  Type: [pose ▼]              │
│  └──────────────┘  □ Preprocess                │
└─────────────────────────────────────────────────┘
```

---

## Known Issues & Fixes

### Stale Closure Bug (Fixed 2026-03-21)

**Issue:** `keyframeStrengths` was missing from `generate` function's useCallback dependency array, causing all strengths to be sent as 1.0.

**Fix:** Added `keyframeStrengths` to dependency array at line 1807.

### Frame Field Naming (Fixed 2026-03-19)

**Issue:** Inconsistent field naming between `start_frame_number` and `start_frame_num`.

**Fix:** Standardized to `start_frame_num` to match fal.ai API specification.

---

## Debugging

### Console Logs

The generate function outputs diagnostic logs:

```
🎬 MultiCondition: 3 images, num_frames=121, frame range 0-120
🖼️ Slot 0 → frame 0
🖼️ Slot 2 → frame 60
🖼️ Slot 4 → frame 120
🔒 Character-swap: 3 anchors at [0, 60, 120] with strengths [1, 0.75, 0.5]
```

### Verification Steps

1. Check browser console for anchor positions and strengths
2. Verify fal.ai payload in network tab
3. Confirm `images` array has 3 entries with correct `start_frame_num` values
4. Confirm `strength` values match UI sliders

---

## Related Documentation

- [PURPOSE.md](./PURPOSE.md) - Workspace PRD and business requirements
- [UX_SPEC.md](./UX_SPEC.md) - Unified UX specification (includes I2I reference section)
- [LTX_VIDEO_13B_FAL_AI_GUIDE.md](../../09-REFERENCE/LTX/LTX_VIDEO_13B_FAL_AI_GUIDE.md) - LTX API reference
- [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md) - Implementation status
