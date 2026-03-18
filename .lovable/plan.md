
Updated diagnosis from your latest logs:

1) The pipeline is now technically correct (no transport/signing issue):
- `images[]` has a valid signed portrait URL
- `videos[]` has a valid signed motion URL
- MultiCondition model is selected and runs successfully

2) The failure is now conditioning quality, not request validity.
Your logged fal payload shows two key adherence weaknesses:
- `aspect_ratio` is still sent as `1:1` (not `auto`) even with `images[]`
- Prompt is only control hints (“Same appearance… matching choreography…”) with no scene/subject intent

3) What should happen:
With this setup, output should keep the reference person’s identity (face/hair/look) while borrowing movement/camera timing from the motion video. It won’t be pixel-identical, but it should be clearly the same character.

Implementation plan (targeted fixes):

1. Preserve MultiCondition aspect-ratio behavior (highest impact)
- File: `supabase/functions/fal-image/index.ts`
- Change precedence so metadata `aspectRatio` does NOT overwrite multi-conditioning `images[]` runs.
- If `images[]` is present for LTX MultiCondition, force/preserve `aspect_ratio: "auto"` in final model input.
- Add explicit log of effective aspect ratio (`aspect_ratio_effective`) for verification.

2. Add identity-lock fallback when only one image anchor is provided
- File: `src/hooks/useLibraryFirstWorkspace.ts`
- In multi mode with motion video + exactly one image keyframe, auto-add a second anchor of the same image at the last frame.
- Keep manual end-keyframe behavior higher priority (only auto-duplicate when end slot is empty).
- Result: stronger identity retention across full clip, less drift toward source-video subject.

3. Tighten prompt UX so hints are visible but not “hint-only”
- File: `src/pages/MobileSimplifiedWorkspace.tsx`
- Keep visible prompt augmentation (as requested), but block generation when prompt is only boilerplate hints.
- Require at least minimal scene intent (e.g., “woman dancing in studio at night”) before submit.
- Keep hints editable in the box so user controls direction.

4. Add guardrails at submit layer
- File: `src/components/workspace/MobileSimplePromptInput.tsx`
- Detect character-swap state (image keyframe + motion video) and show a clear validation message if prompt is empty/hint-only.
- This prevents low-signal generations that look unrelated.

5. Verification plan
- Re-run same case and confirm in `api_usage_logs.request_payload`:
  - `aspect_ratio: "auto"`
  - `images` has 2 entries (start + end fallback) when only one portrait supplied
  - prompt contains user scene intent + optional hints
- Validate output identity consistency across start/middle/end frames, not just frame 1.
