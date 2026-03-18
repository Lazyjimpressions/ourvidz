
Goal: make character-swap actually transfer identity (not just replay motion-video appearance), while keeping choreography and avoiding more paid trial-and-error.

What I found from your latest run:
1) Your payload is now structurally correct (multi model, images[0/120], videos[0], prompt hints present).
2) The latest job is genuinely new (not a stale UI card), but only one run was executed in this cycle.
3) The likely failure is conditioning behavior, not payload validity:
   - `videos[]` defaults to `conditioning_type="rgb"`, `preprocess=false`, `strength=1`, full-frame conditioning.
   - That strongly preserves source video appearance, which can overpower image identity anchors.
4) Critical implementation gap: edge mapping currently strips most `VideoConditioningInput` fields, so we cannot tune conditioning even if frontend sends them.

Implementation plan:

1) Add explicit “character-swap motion mode” in payload construction (frontend hook)
- File: `src/hooks/useLibraryFirstWorkspace.ts`
- In multi-conditioning branch (images + motion video), send:
  - `conditioning_type: "pose"`
  - `preprocess: true`
  - `strength` tuned (e.g. 0.7–0.9 default)
  - `limit_num_frames: true`
  - `max_num_frames` capped (so motion guides choreography without copying all RGB identity info)
- Keep current behavior (`rgb`) for non-character-swap flows.

2) Preserve and validate advanced video conditioning fields in edge function
- File: `supabase/functions/fal-image/index.ts`
- In `videos[]` mapping, pass through supported OpenAPI fields:
  - `conditioning_type`, `preprocess`, `strength`, `limit_num_frames`, `max_num_frames`, `resample_fps`, `target_fps`, `reverse_video`
- Add safe clamps/defaults and enum checks.
- Keep existing start-frame sanitization (multiple-of-8).

3) Strengthen identity-lock beyond only start/end duplicates
- File: `src/hooks/useLibraryFirstWorkspace.ts`
- When only one image keyframe + motion video:
  - auto-add a middle identity anchor (e.g. F60 for 121 frames), not just F120
  - resulting anchors: start/mid/end
- This reduces mid-clip drift and improves persistent identity.

4) Ensure every run is unique unless seed is intentionally locked
- File: `src/hooks/useLibraryFirstWorkspace.ts`
- For char-swap runs, if seed is not lock-controlled, inject a random seed explicitly.
- Log/track seed in request metadata so repeated outputs can be diagnosed deterministically.

5) Improve UX confidence before spend
- Files: `MobileSimplePromptInput.tsx` + `MobileSimplifiedWorkspace.tsx`
- Add a compact “Character Swap Active” preflight summary near submit:
  - model = multi
  - motion mode = pose
  - identity anchors = [0, mid, end]
  - seed = random/locked
- This gives immediate confirmation that the expensive request is configured correctly.

6) Add targeted observability for fast debugging
- Files: `supabase/functions/fal-image/index.ts` and optionally job metadata
- Log final `videos[]` conditioning fields (not just URL/start frame).
- Log frame anchor list actually sent to fal.

Technical details (important):
- OpenAPI for `VideoConditioningInput` supports exactly the controls we need (`conditioning_type`, `preprocess`, `strength`, frame limits). We should use them for character swap.
- Current default (`rgb`, full strength, full video) is ideal for preserving source video look, but not ideal for identity replacement.
- Your current frame math (120 for 121 frames) is now correct; this issue is now conditioning dominance, not frame validity.

Verification checklist (single paid run):
1) Inspect latest `jobs.metadata.input_used`:
   - `videos[0].conditioning_type = "pose"`
   - `videos[0].preprocess = true`
   - `videos[0].limit_num_frames = true`
   - `images` include start/mid/end anchors on valid multiples of 8
   - random `seed` present (unless locked)
2) Confirm output URL changes between two runs with different random seeds.
3) Visual acceptance:
   - choreography follows motion ref
   - character identity matches start image through mid and end frames.
