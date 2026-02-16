# fal.ai — LTX Video 13B (Distilled) Reference

**Last Updated:** February 15, 2026  
**Status:** Authoritative Reference  
**Scope:** LTX Video-0.9.7 13B Distilled endpoints (T2V, I2V, Extend, MultiCondition) via fal.ai API

---

## Overview

This is the definitive reference for using LTX Video 13B Distilled via the fal.ai API. Endpoint choice follows a **mental model**: think like a film editor—I2V starts a new shot with identity locked to a keyframe, Extend keeps the camera rolling for long-form continuity, MultiCondition directs motion and camera from a reference video while keeping identity from an image, and T2V is for cheap ideation or b-roll when identity continuity is not critical.

---

## Available Endpoints

| Endpoint | Task | Required References |
| -------- | ---- | ------------------- |
| `fal-ai/ltx-video-13b-distilled` | Text → Video (T2V) | None |
| `fal-ai/ltx-video-13b-distilled/image-to-video` | Image → Video (I2V) | 1 image (`image_url`) |
| `fal-ai/ltx-video-13b-distilled/extend` | Video Extend | 1 video (`video_url`) |
| `fal-ai/ltx-video-13b-distilled/multiconditioning` | MultiCondition → Video | 1 image + 1 video (`image_url`, `video_url`) |

---

## Mental Model (use this to choose the right endpoint)

- **I2V** = *Start a scene / new shot* with identity locked to a keyframe image
- **Extend** = *Keep rolling the camera* to make the moment longer (best for long-form continuity)
- **MultiCondition** = *Direct motion & camera* using a reference video while keeping identity from an image
- **T2V** = *Cheap ideation / b-roll / establishing shots* when identity continuity is not critical

---

## Canonical Images (keyframes)

A **canonical image** is a **per-character "master reference still"** used to anchor identity and wardrobe.

**Best practice: store 1–3 canonical keyframes per character:**

- `front_closeup` (face identity)
- `three_quarter` (best general-use)
- `medium_shot` (body/wardrobe continuity)

**When to use canonical images:**

- Start every new scene with **I2V** using a canonical keyframe
- Use **Extend** after you have a good initial clip
- Use MultiCondition when you need *a specific motion style* while keeping the canonical identity

> Canonical images are **specific to each character** (not generic references).

---

## Prompting Fundamentals (works across all endpoints)

### The "one shot / one beat" rule

Each clip should represent **one simple action beat**, not a sequence of events.

- Good: "subtle breathing and slow head turn"
- Bad: "walks across the room, sits, smiles, then stands up and leaves"

### Shot prompt structure (recommended)

Use this order for maximum model compliance:

1. **Subject** (who, identity descriptors if needed)
2. **Setting** (where)
3. **Action** (one beat only)
4. **Camera** (framing + movement)
5. **Lighting / mood**
6. **Continuity locks** ("same outfit, same location, no scene cut")

**Template:**

> `[Shot type], [subject], in/at [setting], [single action beat]. Camera: [framing], [movement]. Lighting: [mood]. Continuity: same outfit, same location, no scene cut, no style change.`

### Negative prompts (stable defaults)

Start with the model default and add a few continuity helpers:

**Suggested:**

> `worst quality, inconsistent motion, blurry, jittery, distorted, flicker, face warp, deformed hands, extra fingers, duplicate limbs, sudden zoom, inconsistent lighting`

---

## Timing: Frames, FPS, and Clip Length

Length (seconds) = `num_frames / frame_rate`

**Recommended production presets:**

- **5 seconds cinematic:** `frame_rate=24`, `num_frames=121` (≈ 5.0s)
- **4 seconds smooth:** `frame_rate=30`, `num_frames=121` (≈ 4.0s)
- **"10 seconds" (within 161 cap):** `frame_rate=16`, `num_frames=161` (≈ 10.1s)

**Continuity guidance:**

- For long-form, prefer multiple **4–5s segments** + Extend hops over single long clips.
- Identity drift generally increases with longer duration and complex motion.

---

## Two-Pass Inference Controls

These endpoints expose first/second pass steps and skip parameters. Treat it as:

- **First pass** = structure/motion
- **Second pass** = detail polish

**Balanced (good default):**

- `first_pass_num_inference_steps`: 8–10
- `second_pass_num_inference_steps`: 8–12
- Keep skip values near defaults unless you see persistent issues.

**More motion / bigger action (riskier):**

- Increase first pass steps: 12–16
- Keep second pass moderate: 8–10

**More identity stability / less restructuring:**

- Keep first pass modest: 8–10
- Increase second pass: 10–14

---

## expand_prompt — When to Use

**Use `expand_prompt: true` only for:**

- T2V "one-line prompt" UX (creative ideation)
- Non-continuity b-roll generation

**Keep `expand_prompt: false` for:**

- Extend (do NOT introduce new details mid-scene)
- MultiCondition (prompt discipline matters)
- Any stitched long-form workflow
- Any character continuity mode

**OurVidz recommendation:** Prefer doing prompt expansion upstream (your own controlled prompt templates). Enable endpoint expansion only for a "Quick Cinematic" mode.

---

## LoRAs

A LoRA is a small adapter weights file that modifies the base model (character, wardrobe, style). In the API, `loras` is a list of **LoRA references + weight**.

**Phase guidance:**

- **Phase 1 (recommended):** Don't require LoRAs. Use canonical images + Extend + MultiCondition.
- **Phase 2:** Add LoRAs for recurring "main cast" or brand style consistency.

**Best LoRA types:**

1. **Character LoRA** (best for identity stability across many scenes)
2. **Style LoRA** (consistent "series look" across episodes)
3. **Wardrobe LoRA** (reduces clothing drift)

**Operational rules:**

- Prefer **1 character + 1 style** max per generation.
- Keep weights moderate (common starting range: ~0.4–0.7).
- If motion looks "stiff" or artifacts appear, reduce LoRA weights.

---

## Input Parameters (exact names)

### Text → Video (T2V) — `fal-ai/ltx-video-13b-distilled`

**Required:**

- `prompt` *(string, required)*  
  Text description for the video.

**Optional (common):**

- `negative_prompt` *(string)*  
  Things to avoid.
- `num_frames` *(integer)*  
  Number of output frames (e.g. 81–161; cap per fal.ai schema).
- `frame_rate` *(integer)* or `frames_per_second` *(integer)*  
  Output frame rate (e.g. 16–30).
- `resolution` *(enum)*  
  e.g. `"480p"`, `"720p"`.
- `aspect_ratio` *(enum)*  
  e.g. `"16:9"`, `"9:16"`, `"1:1"`.
- `first_pass_num_inference_steps` *(integer)*  
  First pass steps (e.g. 8–16).
- `first_pass_skip_final_steps` *(integer)*  
  Skip at end of first pass.
- `second_pass_num_inference_steps` *(integer)*  
  Second pass steps (e.g. 8–14).
- `second_pass_skip_initial_steps` *(integer)*  
  Skip at start of second pass.
- `expand_prompt` *(boolean)*  
  If true, fal expands the prompt (use only for T2V ideation).
- `seed` *(integer)*  
  For reproducibility.

---

### Image → Video (I2V) — `fal-ai/ltx-video-13b-distilled/image-to-video`

**Required:**

- `prompt` *(string, required)*  
  Text description for the video.
- `image_url` *(string, required)*  
  URL to the input (canonical) keyframe image.

**Optional:** Same as T2V (negative_prompt, num_frames, frame_rate, resolution, aspect_ratio, first_pass_*, second_pass_*, expand_prompt, seed). Keep `expand_prompt: false` for identity continuity.

---

### Extend — `fal-ai/ltx-video-13b-distilled/extend`

**Required:**

- `prompt` *(string, required)*  
  Continuation-focused prompt (same character, same outfit, same location).
- `video_url` *(string, required)*  
  URL to the video to extend.

**Optional:** Same timing and two-pass params as above. Do **not** use `expand_prompt: true` for Extend.

---

### MultiCondition — `fal-ai/ltx-video-13b-distilled/multiconditioning`

**Required:**

- `prompt` *(string, required)*  
  Short, directive prompt (identity from image, motion from video).
- `image_url` *(string, required)*  
  Character canonical keyframe.
- `video_url` *(string, required)*  
  Motion/camera reference video.

**Optional:** Same timing and two-pass params. Keep `expand_prompt: false`.

---

## Output Schema

- `video.url` *(string, required)*  
  URL to the generated video (e.g. MP4).
- `seed` *(integer)*  
  Seed used for generation (when provided in input).

Other fields may be present per fal.ai response; always read `video.url` for the result.

---

## Invalid Parameters (Do NOT Send)

LTX Video 13B endpoints do **not** use the same parameters as WAN 2.1 I2V or image models. Strip these before sending to LTX:

- `guide_scale` — Used by WAN 2.1 I2V; not used by LTX (LTX uses two-pass steps instead).
- `guidance_scale` — Not used; do not send.
- `strength` — Used by I2I models; not used by LTX video.
- `image_size` — Not used; use `resolution` and `aspect_ratio` instead.
- `num_inference_steps` — LTX uses `first_pass_num_inference_steps` and `second_pass_num_inference_steps` instead.

> **Note:** The [fal-image](supabase/functions/fal-image/index.ts) edge function builds input from `api_models.input_defaults` and request body; ensure LTX model config does not pass WAN- or image-only params through to fal.ai.

---

## Endpoint-Specific Best Practices

### 1) Text → Video (T2V)

**Endpoint:** `fal-ai/ltx-video-13b-distilled`

**Best uses:**

- Establishing shots (environment / city / exterior)
- Cutaways (hands-only, props, scenery)
- Ideation (generate 5–10 candidate vibes fast)
- Transitions (slow camera drift, abstract motion)

**Avoid:**

- Strong identity requirements (faces can drift between generations)
- "Main cast" continuity without a reference image

**Prompt examples:**

**Establishing shot:**

> `Wide establishing shot of a quiet city street at night with soft rain, neon reflections on wet pavement. Camera: slow push-in. Lighting: cinematic, moody, high contrast. Continuity: no sudden cuts, no flicker.`

**B-roll:**

> `Close-up of a hand placing a key card on a wooden table, shallow depth of field. Camera: locked-off tripod. Lighting: warm lamp light. Continuity: smooth motion, no jitter.`

---

### 2) Image → Video (I2V)

**Endpoint:** `fal-ai/ltx-video-13b-distilled/image-to-video`

**Best uses:**

- **Start scenes** with identity locked to a character keyframe
- New shot angles / framing resets
- Wardrobe + environment continuity anchored by the still

**Recommended workflow:** Choose canonical keyframe → run I2V for a 4–5s "shot" → evaluate → then Extend if needed.

**Prompt examples:**

**Subtle close-up:**

> `Close-up portrait, same character as reference image, in the same room. Action: subtle breathing, slight head tilt toward camera, soft smile. Camera: 85mm look, shallow depth of field, steady handheld. Lighting: warm lamp light. Continuity: same outfit, same location, no scene cut.`

**Medium shot, simple motion:**

> `Medium shot, same character and outfit as reference image. Action: slow step forward and gentle turn of shoulders. Camera: slow push-in, stable. Lighting: cinematic, soft shadows. Continuity: same environment, no style change, no sudden zoom.`

**Tips:** Keep actions simple (one beat). If the model "over-moves," reduce motion verbs and increase "steady camera" language.

---

### 3) Extend Video

**Endpoint:** `fal-ai/ltx-video-13b-distilled/extend`

**Best uses:**

- **Long-form continuity** (extend an already-good clip)
- Reduce drift vs. "restart from still" methods
- "Keep rolling" moments: breathing, kissing, conversation beats, walking continuation

**Recommended workflow (core long-form):**

1. Start with I2V or MultiCondition to create a strong initial shot
2. Use Extend in multiple hops (e.g. +4–6s each)
3. Keep prompts **very continuity-focused** (don't add new objects or wardrobe changes)

**Prompt examples:**

**Continuation prompt (safe):**

> `Continue the same shot seamlessly. Same character, same outfit, same location, same lighting. Action: subtle breathing and gentle head movement. Camera: stable, no zoom, no cut. Continuity: no flicker, no face changes.`

**Continuation with slight escalation:**

> `Continue the same scene. Same character and outfit. Action: slow lean in and soft smile, minimal movement. Camera: steady handheld, slight natural sway. Lighting unchanged. No scene cut.`

**Tips:** If drift appears over multiple extends: do a "cut" back to I2V using a canonical keyframe (new shot reset), or use MultiCondition with a motion ref to re-stabilize motion.

---

### 4) MultiCondition → Video (prompt + image + video)

**Endpoint:** `fal-ai/ltx-video-13b-distilled/multiconditioning`

**Best uses:**

- **Identity + motion control together**
- Match the pacing, camera movement, or motion style of a reference video
- Reduce "random motion" by using a curated motion library

**Recommended workflow (motion library):** Create a small internal library of short motion refs (e.g. subtle breathing close-up, slow turn to camera, slow walk toward camera, gentle camera orbit, handheld sway). Then: `image_url` = character canonical keyframe, `video_url` = chosen motion reference, prompt = small delta (what to emphasize / what changes).

**Prompt examples:**

**Match motion ref, keep identity:**

> `Same character as the reference image. Follow the motion and camera pacing of the reference video. Keep outfit and lighting consistent with the image. Action: subtle breathing and calm eye contact. Continuity: no scene cut, no face drift.`

**Match motion ref, small action beat:**

> `Use the reference video for camera movement and timing. Keep the character identity and outfit from the reference image. Action: slow lean forward and slight smile. Lighting: warm and cinematic. No flicker, no sudden zoom.`

**Tips:** Keep prompts short and directive. MultiCondition is powerful—avoid stacking too many new details.

---

## Recommended OurVidz Workflows (model usage recipes)

### Workflow A — Default Roleplay Shot (most common)

**Goal:** Consistent 4–5s clip with character identity.

1. Select character **canonical keyframe**
2. Call **I2V**
3. If good → save as "scene shot"
4. If user clicks "Continue" → use **Extend**

**Use when:** Roleplay, character-driven scenes, main cast clips.

---

### Workflow B — Long-Form Scene (8–60+ seconds)

**Goal:** Build longer moments with minimal drift.

1. Start with **I2V** (canonical keyframe)
2. Use **Extend** repeatedly (chunked extensions)
3. If drift creeps in: cut back to **I2V** (new shot) OR use **MultiCondition** (re-anchor motion)

**Use when:** Continuous scenes, narrative moments, "stay in place" interactions.

---

### Workflow C — New Angle / New Shot (controlled cut)

**Goal:** Change framing while keeping identity.

1. Pick a new canonical keyframe (or a curated "best frame" from current scene)
2. Call **I2V** with new camera framing prompt
3. Continue with **Extend** as needed

**Use when:** Cinematic editing, pacing, shot variety.

---

### Workflow D — Motion-Directed Scene (best control)

**Goal:** Repeatable motion with identity stability.

1. Choose canonical keyframe image
2. Choose a motion ref clip from Motion Library
3. Call **MultiCondition**
4. Extend if needed

**Use when:** Users select "walk cycle," "camera orbit," "handheld close-up," etc.

---

### Workflow E — Establishing Shot / B-roll (cheap filler)

**Goal:** Transitions, environments, cutaways.

1. Call **T2V** with environment/b-roll prompt
2. Insert between character scenes during stitching

**Use when:** Scene transitions, "world building," pacing.

---

## Stitching Guidelines

- Prefer hard cuts at **low-motion endings** (end of Extend hops).
- Avoid cutting during rapid motion (more noticeable).
- If final delivery needs 24–30fps but generation runs 16fps for speed: consider post interpolation (optional) as a separate pipeline step.

---

## Common Failure Modes & Fixes

### Face drift over long scenes

- Use **Extend** instead of restarting from still repeatedly
- Add "same face, no face change" and "no flicker"
- Consider Character LoRA for recurring cast

### Random camera zooms / jitter

- Add: "camera stable, no sudden zoom, no cut"
- Reduce motion verbs in prompt
- Keep action to one beat

### Hands deforming

- Add negatives: "deformed hands, extra fingers"
- Avoid hand-centric actions unless necessary
- Use tighter framing (close-up face) for dialogue beats

### Clothing changes

- Anchor with canonical keyframe (I2V)
- Add "same outfit" explicitly
- Consider wardrobe LoRA later

---

## Troubleshooting (API errors)

### 422 Unprocessable Entity

- **Missing required field:** I2V/Extend/MultiCondition require `image_url` and/or `video_url` as per endpoint. Ensure the client sends `image_url` (not `image`) for LTX; the [fal-image](supabase/functions/fal-image/index.ts) edge function and client use a unified `image_url` for all video models.
- **Invalid parameter names:** Do not send WAN-only or image-only params (e.g. `guide_scale`, `strength`, `guidance_scale`, `image_size`) to LTX endpoints.
- **Out-of-range values:** Check `num_frames`, `frame_rate`, and step counts against fal.ai schema limits.

### 401 Unauthorized

- Invalid or missing fal.ai API key; ensure the key is set in the edge function environment (e.g. secret referenced by `api_providers.secret_name`).

### 400 Bad Request

- Prompt or input URL invalid; ensure `image_url` and `video_url` are accessible to fal.ai (public or signed URLs).

### Too many artifacts / identity drift

- Reduce motion intensity; shorten prompt to essentials; use Extend for continuity instead of repeated I2V; consider lowering first-pass steps or increasing second-pass for polish.

---

## Recommended Defaults / Parameter Presets

### "Cinematic 5s shot" (recommended default)

- `resolution: "720p"`
- `aspect_ratio: "16:9"` (or `"9:16"` depending on product)
- `frame_rate: 24`
- `num_frames: 121`
- `first_pass_num_inference_steps: 9`
- `first_pass_skip_final_steps: 1`
- `second_pass_num_inference_steps: 11`
- `second_pass_skip_initial_steps: 5`
- `expand_prompt: false`

### "Fast preview"

- `resolution: "480p"`
- `frame_rate: 24`–`30`
- `num_frames: 81`–`121`
- `first_pass_num_inference_steps: 8`
- `second_pass_num_inference_steps: 8`
- `expand_prompt: true` (only for short user prompts)

### "10s" within limits

- `resolution: "480p"` (recommended)
- `frame_rate: 16`
- `num_frames: 161`
- Steps ~8–10 per pass
- `expand_prompt: false`

---

## Prompt Examples Library (roleplay-friendly)

### 1) Close-up dialogue beat

> `Close-up, same character as reference image, calm eye contact. Action: subtle breathing, slight head tilt. Camera: steady handheld, shallow depth of field. Lighting: warm lamp light. Continuity: same outfit, same location, no cut.`

### 2) Medium shot micro-action

> `Medium shot, same character and outfit as reference image. Action: slow step forward and gentle shoulder turn. Camera: slow push-in, stable. Lighting: cinematic, soft shadows. No flicker, no zoom.`

### 3) Extend continuation

> `Continue seamlessly. Same character, same outfit, same lighting and room. Action: gentle breathing and minimal head movement. Camera stable, no cut, no zoom.`

### 4) MultiCondition (identity + motion)

> `Follow the motion and camera pacing of the reference video. Keep identity and outfit from the reference image. Action: subtle breathing and soft smile. Lighting unchanged. No flicker, no face drift.`

### 5) T2V establishing shot

> `Wide establishing shot of a quiet hallway with warm tungsten lighting and soft shadows. Camera: slow push-in. Mood: cinematic, calm. No jitter, no sudden cut.`

---

## Implementation Notes for OurVidz

**Per-clip state to store:** For each generated clip, store `endpoint_used` (t2v | i2v | extend | multicondition), `prompt`, `negative_prompt`, `seed`, `resolution`, `aspect_ratio`, `frame_rate`, `num_frames`, pass step settings, `image_url` (if used), `video_ref_url` (if used), `loras[]` (if used), output URL(s), and parent linkage (for Extend chains / scene groups). This enables deterministic replays and reliable scene stitching.

**Routing:** The [fal-image](supabase/functions/fal-image/index.ts) edge function routes LTX via the same pipeline as WAN: model key from `api_models`, `input_defaults` for steps and frame_rate, and request body. The client must send `image_url` for I2V, Extend (when applicable), and MultiCondition—not `image`. LTX models appear in `api_models` with modality `video`; `input_defaults` and `capabilities` (e.g. `input_schema` for `image_url` required) should reflect the presets in this doc.

---

## Related Documentation

- [WAN2.1_i2v_FAL_AI_GUIDE.md](./WAN2.1_i2v_FAL_AI_GUIDE.md) — fal.ai WAN 2.1 I2V reference
- [FAL_AI_SEEDREAM_DEFINITIVE.md](./FAL_AI_SEEDREAM_DEFINITIVE.md) — fal.ai Seedream image reference
- [PROMPTING_SYSTEM.md](../03-SYSTEMS/PROMPTING_SYSTEM.md) — Prompt templates and fal-image routing
