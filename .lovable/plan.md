
Audit summary from your latest run (root causes, based on code + job logs):

1) Prompt visibility regression is real:
- `MobileSimplifiedWorkspace.tsx` explicitly removed UI-time hint injection (“append at generation time only”), so the textarea no longer shows the auto-instructions.

2) Prompt adherence logic is too loose:
- In `useLibraryFirstWorkspace.ts`, appearance-hint detection treats generic text like “reference image” as sufficient, so it often skips the canonical identity phrase (“Same appearance as the input image”).
- Your logged prompt confirms this: motion hint present, canonical appearance hint missing.

3) Identity-lock frame math is still wrong for LTX constraints:
- Current anchor uses `maxFrame = duration * fps - 1`, then snaps down to multiple-of-8.
- For duration=4, fps=30 → `119`, snapped to `112`, which matches your payload.
- But provider uses `num_frames = 8n+1` (121), so last valid anchor should be `120`. This mismatch weakens end-of-clip identity lock.

4) Guardrails are incomplete in video mode:
- `MobileSimplePromptInput` uses `referenceImage/referenceImageUrl` for char-swap checks, but video mode primarily uses `beginningRefImageUrl`.
- This can miss validation/augmentation in some flows.

Implementation plan (holistic hardening):

A) Unify character-swap prompt logic in one shared utility
- Create a reusable helper (e.g. `src/lib/utils/characterSwapPrompt.ts`) that:
  - Enforces canonical phrases idempotently:
    - “Same appearance as the input image”
    - “matching choreography of reference video”
  - Separately checks for scene intent (not hint-only).
- Use strict canonical detection (not broad `reference image` keyword matching).

B) Restore visible prompt augmentation (without empty-prompt pollution)
- In `MobileSimplifiedWorkspace.tsx`, reintroduce UI augmentation when:
  - video mode + start image exists + motion video exists + prompt is non-empty.
- Update textarea value so user sees exactly what will be sent.
- Keep empty prompt untouched.

C) Make submit path deterministic
- In `MobileSimplePromptInput.tsx` `handleSubmit`:
  - Detect char-swap using video refs (`beginningRefImageUrl` + `motionRefVideoUrl`), not just image-mode refs.
  - Compute augmented prompt via shared utility.
  - Call `onPromptChange(augmented)` before `onGenerate(augmented)` so UI and sent payload match.
  - Keep/strengthen hint-only blocking.

D) Keep backend-facing safety net in generation hook
- In `useLibraryFirstWorkspace.ts`, run the same shared augmentation utility right before payload creation (final guard), so no UI race can bypass it.

E) Fix frame math to match LTX 8n+1 behavior
- In `useLibraryFirstWorkspace.ts`, replace `duration*fps-1` anchor logic with:
  - compute `num_frames` using same snapping as edge (`8n+1`)
  - set `maxFrame = num_frames - 1`
  - identity-lock duplicate anchor at `maxFrame` (for your case: 120).
- Ensure all auto-generated `start_frame_num` values are snapped/clamped safely.

F) Add edge-function defensive sanitization
- In `supabase/functions/fal-image/index.ts`, before provider call:
  - sanitize `images[].start_frame_num` to valid range and multiple-of-8.
  - log adjustments.
- This prevents another paid run failing from malformed frame indices if client logic regresses.

G) Auto-route model correctly for char-swap
- In `MobileSimplifiedWorkspace.tsx`, when motion video is present + at least one keyframe image, auto-switch to `multi` task model if user has not manually overridden.
- On motion-ref removal, revert to appropriate `i2v/t2v` default.

Verification checklist (before more credit-heavy iteration):

1) Single controlled run, then query `jobs.metadata.input_used`:
- `model_key = fal-ai/ltx-video-13b-distilled/multiconditioning`
- `aspect_ratio = auto`
- `images` includes start + end anchor at `0` and `120` (for 121 frames)
- `videos[0].start_frame_num = 0`
- prompt contains both canonical phrases + user scene text

2) UI check:
- Textarea visibly shows augmented prompt before submit.

3) Output check:
- Validate identity at start/middle/end frames (not just first frame).

This sequence addresses both failures you called out: “prompt not showing” and “character not adhering,” while adding hard backend safeguards to reduce costly retries.
