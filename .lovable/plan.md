

# Separate Image Keyframes from Video Motion Reference

## The Problem

The current UI tries to mix images and videos in the same 5-slot timeline. This causes:
- The overwrite bug (video stomps on image slot)
- Conceptual confusion (user doesn't know what each slot "does")
- Misaligned mental model vs. the actual API

## What the API Actually Expects

The LTX MultiCondition endpoint has **two independent conditioning arrays**:

```text
images[]:  Identity/appearance anchors at timeline positions
           Each entry: { image_url, start_frame_num, strength }
           
videos[]:  Motion/camera reference clips
           Each entry: { url }
```

These serve fundamentally different creative purposes:
- **Images** answer: "What should this look like at frame N?"
- **Videos** answer: "How should this move / what camera work to use?"

They are NOT interchangeable and should NOT share the same slots.

## Solution: Add a Dedicated Motion Reference Slot

### UI Changes

Keep the existing 5-slot image keyframe timeline exactly as-is. Add a **separate "Motion Reference" section** below it (or beside it) with:

- One video drop zone (labeled "Motion / Camera Reference")
- A brief helper label: "Optional video to guide movement and camera"
- Accepts video files or video URLs from the library
- Shows a video thumbnail with play icon when filled
- Remove button to clear it

This is visually distinct from the keyframe timeline, so users understand:
- **Top row**: Image keyframes controlling appearance at different moments
- **Below**: Optional motion video controlling how things move

### Data Flow

1. **New state**: Add `motionRefVideoUrl` (string | null) alongside existing ref image state in `MobileSimplifiedWorkspace.tsx`
2. **Pass down**: Thread it through `MobileSimplePromptInput` as a separate prop, not mixed into the `videoRefSlots` array
3. **Generation hook**: In `useLibraryFirstWorkspace.ts`, build `images[]` from filled image keyframe slots (as today) and `videos[]` from the motion ref (if set) -- clean separation
4. **Edge function**: Already handles `images[]` and `videos[]` separately (lines 516-550) -- no changes needed

### Settings Modal

- Show the motion reference video in its own section of the Settings Sheet
- No strength/frame controls needed for video (the API doesn't support per-video frame positioning in the same way)
- Keep per-keyframe strength sliders for images only

## What NOT to Do

- Do NOT add a 6th box to the image timeline -- it conflates two different concepts
- Do NOT make boxes "assignable" between image/video/start/end -- adds complexity without value since the API itself separates these
- Do NOT change the edge function -- it already handles both arrays correctly

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/MobileSimplifiedWorkspace.tsx` | Add `motionRefVideoUrl` state; pass to prompt input and generation hook |
| `src/components/workspace/MobileSimplePromptInput.tsx` | Add motion reference drop zone below keyframe slots; accept `motionRefVideoUrl` / `onMotionRefChange` props; remove video-in-image-slot logic |
| `src/hooks/useLibraryFirstWorkspace.ts` | Accept `motionRefVideoUrl` param; build `videos: [{ url }]` from it instead of splitting from image slots; remove `videoSlotIsVideo` param |
| `src/components/workspace/MobileSettingsSheet.tsx` | Show motion reference preview in its own section; remove isVideo mixing from refSlots |

## Sequencing

1. Add motion reference state and UI drop zone (new section, visually separate)
2. Wire generation hook to build `videos[]` from the motion ref
3. Clean up: remove `videoSlotIsVideo` splitting logic from hook and prompt input
4. Update Settings Sheet to show motion ref separately

## Complexity Assessment

This **reduces** complexity everywhere:
- Edge function: no changes needed
- Hook: simpler (no more isVideo splitting logic)
- UI: clearer mental model for users
- Settings: no more mixed media in the same grid

