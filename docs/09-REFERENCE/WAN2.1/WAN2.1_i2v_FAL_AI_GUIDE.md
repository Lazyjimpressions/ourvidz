# fal.ai — Wan 2.1 Image-to-Video (I2V) Reference

**Endpoint ID:** `fal-ai/wan-i2v`
**Type:** Image-to-Video (single reference image)

## Does Wan 2.1 I2V support start + finish (dual reference frames)?

**No.** This endpoint supports **one** input image only via `image_url`.
If you need **first+last frame** style control, you’ll want a different endpoint that explicitly supports that pattern (often labeled “first/last frame to video” or “start/end frame”), not `fal-ai/wan-i2v`.

---

## Input Parameters (exact names)

### Required

* `prompt` *(string, required)*
  Text prompt to guide the video generation.
* `image_url` *(string, required)*
  URL to the input image. If it doesn’t match the chosen aspect ratio, fal resizes and center-crops.

### Optional (core quality / motion)

* `negative_prompt` *(string)*
  Things to avoid. (fal provides a long default if you don’t set it.)
* `num_frames` *(integer)*
  **81–100**. Default: `81`

  > Note: if `num_frames` > 81, billing units increase (per fal’s schema notes).
* `frames_per_second` *(integer)*
  **5–24**. Default: `16`
* `resolution` *(enum)*
  `"480p"` or `"720p"`. Default: `"720p"`
* `num_inference_steps` *(integer)*
  Default: `30`
* `guide_scale` *(float)*
  **Range: 1-10**. Default: `5` (higher = more prompt adherence, can reduce naturalness)
  > **Important**: The API enforces a maximum of 10.0. Values above 10 will cause 422 errors.
* `shift` *(float)*
  Default: `5`
* `seed` *(integer)*
  Set for reproducibility; omit for random.

### Optional (behavior / safety / speed)

* `enable_safety_checker` *(boolean)*
  If `true`, safety checker enabled.
* `enable_prompt_expansion` *(boolean)*
  If `true`, fal expands the prompt (often increases descriptiveness; reduces predictability).
  > **Recommendation**: Keep `false` for NSFW/content where control is important. Enable only when you want the model to add more descriptive details automatically.
* `acceleration` *(enum)*
  `"none"` or `"regular"`. Default: `"regular"`
  (More acceleration = faster, lower quality; fal recommends `regular`.)
* `aspect_ratio` *(enum)*
  `"auto"`, `"16:9"`, `"9:16"`, `"1:1"`. Default: `"auto"`

---

## Output Schema

* `video.url` *(string, required)*
  A URL to the generated MP4 (or equivalent container)
* `seed` *(integer, required)*
  Seed used for generation

---

## Best-Practice Workflow (Production)

### 1) Treat this as an async job

Even if you call `fal.subscribe(...)`, your UI should behave like:

* Submit job
* Show progress/loading state
* Poll status or receive webhook
* Display result (and store it)

**Recommendation:** use the Queue + Webhooks approach for reliability:

* `fal.queue.submit(endpoint, { input, webhookUrl })`
* Poll `fal.queue.status(...)` as a fallback
* Retrieve final via `fal.queue.result(...)`

### 2) Don’t expose your FAL key in the browser

Always proxy calls server-side (Supabase Edge Function / API route / worker).

### 3) File hosting: prefer stable public URLs

`image_url` must be accessible to fal.
Best practice:

* Upload the user’s image to **your own storage** (e.g., Supabase Storage)
* Generate a **public** URL or a **time-limited signed URL**
* Pass that URL to `image_url`

### 4) Store artifacts for reuse and cost control

Save:

* `endpoint_id`, full `input` object, `request_id`, `seed`, and `video.url`
* Your own canonical copy of the output video in your storage (optional but recommended)

---

## Prompting Best Practices (I2V)

### General structure

Think of I2V prompt as: **motion + camera + subject continuity + environment + style**.

**Template**

* **Subject continuity:** who/what stays the same as the input image
* **Motion:** what moves (subtle is more stable)
* **Camera:** static / slow pan / slow push-in
* **Environment:** lighting/weather/background
* **Style/quality:** cinematic, realistic, shallow depth of field, etc.

### Keep motion realistic for best identity retention

* Best stability: *small motions* (breathing, hair movement, subtle head turns, slow camera push)
* Higher risk of artifacts: fast action, extreme camera spins, huge pose changes

### Use `negative_prompt` to suppress common failures

Common negatives:

* “warped face, deformed hands, extra limbs, jitter, flicker, frame tearing, low quality, heavy blur, oversaturated, watermark, subtitles, text artifacts”

### Recommended defaults (starting point)

* `num_frames: 81`
* `frames_per_second: 16`
* `resolution: "720p"`
* `num_inference_steps: 30`
* `guide_scale: 5` (range: 1-10)
* `acceleration: "regular"`
* `aspect_ratio: "auto"`
* `enable_prompt_expansion: false` (turn on only if you want the model to "embellish")

### Invalid Parameters (Do NOT Send)

WAN 2.1 i2v does **not** accept these parameters and will cause errors if sent:

* `strength` - Not used by WAN 2.1 i2v (this is for I2I models)
* `image_size` - Not used (use `aspect_ratio` instead)
* `guidance_scale` - Not used (use `guide_scale` instead)

> **Note**: These parameters may be set in general processing but must be removed before sending to WAN 2.1 i2v endpoint.

---

## “Scene Progression” Pattern (best results)

If you want progressive storytelling:

1. Generate a short clip from Image A
2. Take a representative frame from the output (or your next “scene image”)
3. Feed that frame back into a **new** I2V call with a slightly advanced prompt

This produces smoother continuity than trying to force big story jumps in a single generation.

---

## Troubleshooting Guide

### Output ignores prompt

* Raise `guide_scale` slightly (e.g., 5 → 6.5, but stay within 1-10 range)
* Disable `enable_prompt_expansion` if it's drifting
* Make the prompt more concrete: specify motion + camera explicitly

### 422 Unprocessable Entity Errors

Common causes:

* `guide_scale` exceeds 10.0 - **Maximum is 10.0, not 20**
* Invalid parameters sent (`strength`, `image_size`, `guidance_scale`) - Remove these for WAN 2.1 i2v
* Missing required `image_url` - Ensure reference image URL is provided and accessible

### Too many artifacts / identity drift

* Reduce motion intensity
* Shorten prompt to essentials
* Lower `guide_scale` slightly if it’s over-constraining and causing weirdness
* Use `num_frames: 81` (avoid longer until stable)

### Bad crop / wrong framing

* Set `aspect_ratio` explicitly instead of `auto`
* Provide an input image already framed for the target ratio

---

## Notes for Your Internal “Roleplay → Scene Video” Pipeline (SFW-safe design)

Recommended components:

* **Scene extractor** (LLM): summarize the last N chat turns into a tight “motion prompt”
* **Frame source**: either last generated scene image or a user-provided image
* **Wan I2V**: generate the short clip
* **Store & index**: store video + prompt metadata (Supabase tables)
* **UI**: show video inline with a “regenerate” button and “use as next reference” option
