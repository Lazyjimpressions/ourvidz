

# Video Character Replacement via LTX 13B MultiCondition

## Current Architecture Summary

After thorough codebase review, here is how the existing system works:

**Routing**: API models (fal, replicate) route directly to `fal-image` or `replicate-image` edge functions. Only local models (SDXL/WAN) use `queue-job`. This is critical -- no changes to `queue-job` are needed.

**Video Mode UI**: The workspace already has:
- **5 image keyframe slots** (Start, Key 2, Key 3, Key 4, End) in both `MobileQuickBar` and `MobileSettingsSheet`
- A separate **Motion Reference** drop zone for a single video (in `MobileSettingsSheet`)
- Per-keyframe **strength sliders** on each image slot
- **MultiCondition advanced controls** (Detail Pass, CRF, Temporal AdaIN, Tone Map, Inference Steps)

**Generation Pipeline** (`useLibraryFirstWorkspace.ts` lines 1459-1498): When the model task is `multi`, the hook already:
1. Gathers all image refs from the 5 slots into `inputObj.images[]` with `image_url`, `start_frame_num`, `strength`
2. Puts the motion reference video into `inputObj.videos[]` with `video_url`, `start_frame_num`
3. Auto-spaces frame numbers via `autoSpaceFrames()`

**Edge Function** (`fal-image/index.ts` lines 522-555): Already signs and forwards `images[]` and `videos[]` arrays for MultiCondition models. Already handles `multi_conditioning` generation mode detection.

**Smart Model Switching** (`useSmartModelDefaults.ts`): Already auto-switches to `multi` task model when 2+ image references are loaded.

## Key Finding: The Existing Design Already Supports This

The character swap workflow maps exactly to what the workspace already does in video `multi` mode:

```text
Character Swap Workflow          →  Existing Multi Mode
─────────────────────────────────────────────────────────
Character portrait image         →  Image keyframe slot (Start)
Source dance video               →  Motion Reference video drop zone
"Dancing woman in studio" prompt →  Prompt field
Strength slider                  →  Per-keyframe strength slider
```

**No new UI panel is needed.** The user simply:
1. Switches to Video mode
2. Loads their character image into the Start keyframe slot (appearance anchor)
3. Loads the dance video into the Motion Reference drop zone (motion guide)
4. Writes a prompt describing the scene
5. Hits Generate

The LTX MultiCondition model is already registered and wired. The `fal-image` edge function already handles `images[]` + `videos[]` payloads.

## What Actually Needs to Change

### 1. Increase `reference_images` bucket size limit (50MB → 200MB)

Dance/source videos can be large. The current 50MB limit is too small for HD video clips. This requires a Supabase storage policy update.

### 2. Add LTX MultiCondition pricing to `FAL_PRICING` map

The `fal-image` edge function is missing a pricing entry for `fal-ai/ltx-video-13b-distilled/multiconditioning`. Currently it falls back to `default_video` ($0.25), but an explicit entry ensures accurate cost tracking.

### 3. Allow video files in the Motion Reference upload

The Motion Reference drop zone in `MobileSettingsSheet` already accepts `video/mp4,video/webm,video/quicktime`. However, the `reference_images` bucket needs its MIME type allowlist verified to include these video types (it already does per the memory context).

### 4. Verify `reference_images` bucket accepts video MIME types at 200MB

The bucket currently allows `video/mp4` and `video/webm` at 50MB. We need to increase the file size limit.

### 5. (Optional) Add a "Swap" preset/shortcut

To make discovery easier, we could add a tooltip or preset label to the Motion Reference section when a video + single image keyframe is loaded, indicating "Character Swap mode active". This is a minor UX enhancement, not a structural change.

## Why a Separate "Swap" Panel is NOT Needed

The existing 5-slot + Motion Ref architecture is purpose-built for this exact use case. Creating a separate `CharacterSwapPanel.tsx` would:
- Duplicate the reference slot upload/sign/display logic
- Duplicate the model selection and generation submission logic  
- Create a maintenance burden with two paths to the same fal.ai endpoint
- Confuse users with a separate mode for something that's already a natural use of Multi mode

The only gap is discoverability -- users need to know they can use Video Multi mode for character swapping. A tooltip or onboarding hint solves this without new components.

## Implementation Steps

| Step | File | Change |
|------|------|--------|
| 1 | SQL migration | Increase `reference_images` bucket file size limit to 200MB |
| 2 | `supabase/functions/fal-image/index.ts` | Add `'fal-ai/ltx-video-13b-distilled/multiconditioning': 0.20` to `FAL_PRICING` |
| 3 | `src/components/workspace/MobileSettingsSheet.tsx` | Add contextual hint text when 1 image + 1 motion video loaded: "Character swap mode -- appearance from image, motion from video" |
| 4 | Verify | Confirm LTX MultiCondition model is registered in `api_models` with task `['multi']` and `is_active = true` |

Total effort: ~30 minutes. The heavy lifting is already done.

