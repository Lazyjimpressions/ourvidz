# Workspace video model test plan (controlled assets)

**Version:** 1.0.0  
**Last updated:** 2026-03-28  
**Purpose:** Step-by-step manual testing with **explicit prompts** to generate reference stills and motion video, then **workspace prompts** for Grok I2V, LTX Video 13B distilled T2V, and LTX Video 13B MultiCondition.

**Related:** [VIDEO_MULTI_REF.md](../../01-PAGES/01-WORKSPACE/VIDEO_MULTI_REF.md), [LTX_VIDEO_13B_FAL_AI_GUIDE.md](../../09-REFERENCE/LTX/LTX_VIDEO_13B_FAL_AI_GUIDE.md), `npm run test:workspace:mapping`

---

## 1. Models (workspace selection)

Select these in the mobile workspace **Video** model dropdown (names in UI may differ; match by provider/task in `api_models`):

| Phase | Purpose | Typical `model_key` / endpoint family |
|-------|---------|--------------------------------------|
| **A** | Image → video, single start frame | **Grok I2V** (your catalog entry for Grok image-to-video) |
| **B** | Text-only video | **LTX Video 13B distilled** T2V (`fal-ai/ltx-video-13b-distilled` per [guide](../../09-REFERENCE/LTX/LTX_VIDEO_13B_FAL_AI_GUIDE.md)) |
| **C** | Multi-keyframe story | **LTX Video 13B distilled MultiCondition** (`fal-ai/ltx-video-13b-distilled/multiconditioning`) |

**Duration:** Use **5–6 seconds** for Phases A–B; **6–8 seconds** for Phase C so keyframe spacing is visible.

**Aspect ratio:** Generate stills and run video at **16:9** (or 9:16 consistently across all assets) so composition matches.

---

## 2. Cast and prop vocabulary (fixed across assets)

Use one consistent subject so slot errors show up as **wrong pose/prop**, not a different person.

- **Subject:** One adult woman, ~28 years old, Mediterranean complexion, shoulder-length wavy brown hair, natural makeup, **black fitted athletic tank top**, **charcoal leggings**.
- **Backdrop:** Warm neutral **gray seamless studio** (no outdoor scenes).
- **Discriminators (props):** Each slot uses a **different dominant color + object** so logs and outputs are easy to score:
  - **Red** — apple  
  - **Green** — succulent in white pot  
  - **Blue** — water pour (blue-tinted stream)  
  - **Yellow** — umbrella  
  - **Magenta** — silk scarf  

---

## 3. Original prompts to create the five still images

Generate these in **image mode** (OurVidz workspace, Seedream, SDXL, or any T2I). Use the **same negative prompt** for all five (Section 5). Export as PNG with the **exact filenames** below.

### 3.1 `slot00_START.png` — Start (slot 0)

**Positive prompt (copy verbatim):**

```
Photorealistic studio photograph, soft diffused three-point lighting, warm neutral gray seamless paper backdrop, 16:9 composition. One adult woman, Mediterranean complexion, shoulder-length wavy brown hair, natural makeup, black fitted athletic tank top, charcoal leggings. She stands relaxed facing camera, holding one glossy red apple in her right hand at chest height, left hand relaxed at her side, subtle friendly smile, direct eye contact. Full body from knees up, shallow depth of field, 85mm portrait lens character, sharp focus on eyes and apple, 8k detail, no text, no watermark.
```

### 3.2 `slot01_KEY2.png` — Key 2 (slot 1)

**Positive prompt (copy verbatim):**

```
Photorealistic studio photograph, same woman as reference: Mediterranean complexion, wavy brown hair, black athletic tank top, charcoal leggings, same warm gray seamless backdrop and lighting as a professional portrait series. She leans forward reaching with both hands toward a small green succulent in a matte white ceramic pot on a tall white cylindrical pedestal at the right third of the frame, mid-action, weight on front foot, engaged expression. 16:9, 85mm lens look, sharp focus, no text, no watermark.
```

### 3.3 `slot02_KEY3.png` — Key 3 (slot 2)

**Positive prompt (copy verbatim):**

```
Photorealistic studio photograph, same woman, same outfit and gray seamless studio. She pours water from a clear glass pitcher into a tall drinking glass on a white counter in front of her; the water stream has a visible cool blue tint. Eyes on the pour, concentrated expression, hands clearly visible. 16:9, soft diffused light, 85mm portrait style, no text, no watermark.
```

### 3.4 `slot03_KEY4.png` — Key 4 (slot 3)

**Positive prompt (copy verbatim):**

```
Photorealistic studio photograph, same woman, same outfit and gray seamless studio. She holds an open bright yellow umbrella above her head with one hand, playful stance, one foot slightly lifted as if mid-step, joyful expression. Umbrella clearly yellow and open. 16:9, 85mm lens look, no text, no watermark.
```

### 3.5 `slot04_END.png` — End (slot 4)

**Positive prompt (copy verbatim):**

```
Photorealistic studio photograph, same woman, same outfit and gray seamless studio. A vibrant magenta silk scarf billows through the frame; she reaches toward it with both hands, eyes following the fabric, open-mouth joyful laugh, sense of energy and closure. Scarf clearly magenta. 16:9, 85mm lens look, no text, no watermark.
```

---

## 4. Original prompt to create the motion reference video (optional)

Use this **only** for **character-swap / motion-conditioning** scenarios (motion ref slot). For **full five-keyframe** MultiCondition tests **without** character-swap, leave motion ref **empty** so slots 1–3 are not greyed out (see [VIDEO_MULTI_REF.md](../../01-PAGES/01-WORKSPACE/VIDEO_MULTI_REF.md)).

**Positive prompt (for I2V or video generation tool):**

```
Photorealistic studio, warm gray seamless background, same woman: black tank top, charcoal leggings, wavy brown hair. She walks steadily from left to right across the frame at medium full shot, holding a red apple in her right hand, natural arm swing, neutral expression. Locked tripod camera, no zoom, even studio lighting, 6 seconds, 16:9, smooth motion, no text, no cuts.
```

**Output:** Save as `motion_ref_walk_apple.mp4` (H.264 MP4, &lt; 50 MB for workspace upload rules).

---

## 5. Shared negative prompt (all still images)

Use this **identical** negative prompt for every still in Section 3:

```
deformed hands, extra fingers, missing fingers, duplicate faces, two heads, watermark, logo, signature, text, letters, subtitles, low resolution, blurry, out of focus, cartoon, anime, illustration, child, minor, nsfw nudity
```

---

## 6. Technical checklist before workspace video tests

| Item | Target |
|------|--------|
| Filenames | `slot00_START.png` … `slot04_END.png` |
| Format | PNG preferred; same aspect ratio across set |
| Motion file | `motion_ref_walk_apple.mp4` if testing motion ref |
| Console | DevTools → Console: watch `🎬 MultiCondition` and `🖼️ Slot` lines |
| Network | Optional: inspect `fal-image` request `input.images[]` for `start_frame_num` order |

**Automated mapping sanity check (no browser):** `npm run test:workspace:mapping`

---

## 7. Phase A — Grok I2V (single start image)

**Setup:** Video mode → select **Grok I2V** → load **`slot00_START.png`** in **Start** only → clear End and other key slots.

**Workspace prompt (copy verbatim):**

```
Slow cinematic push-in. The woman keeps holding the red apple; she rotates the apple a quarter turn toward camera and back, subtle natural finger movement. Keep the gray seamless backdrop, her black tank, and charcoal leggings unchanged. Photorealistic skin and fabric. No new objects entering frame. No jump cuts. 5 seconds.
```

**Pass criteria:**

- Output stays **studio / red apple** biased; no sudden switch to yellow umbrella or magenta scarf.
- No errors about missing reference if Start is set.

---

## 8. Phase B — LTX Video 13B distilled T2V (text only)

**Setup:** Video mode → select **LTX 13B T2V** (text-to-video) → **no** reference images (or cleared slots per your UI rules).

**Workspace prompt (copy verbatim):**

```
Photorealistic studio, warm gray seamless backdrop: one woman in a black athletic tank top and charcoal leggings, wavy brown hair, holding a red apple at chest height in her right hand, soft three-point lighting, slow subtle dolly toward camera, she rotates the apple slightly toward lens, 5 seconds, 16:9, cinematic, no text on screen, no watermark.
```

**Pass criteria:**

- Coherent **single-scene** clip; subject roughly matches the written brief (woman, studio, apple).
- Baseline for “model works” before multi-keyframe complexity.

---

## 9. Phase C — LTX Video 13B MultiCondition (use-case tests)

Select **LTX 13B MultiCondition** (`multiconditioning`). Prefer **no motion ref** for tests that need **all five slots** active. Add **`motion_ref_walk_apple.mp4`** only when testing **character-swap** (anchors typically 0 / 2 / 4 per product behavior).

### C.1 Start + Key 2 only (slots 0 and 1)

**Slots:** `slot00_START.png`, `slot01_KEY2.png`; leave Key 3, Key 4, End empty.

**Workspace prompt (copy verbatim):**

```
Single continuous take in the same gray studio. Begin with the woman presenting the red apple to camera; the action naturally transitions into her leaning forward and reaching with both hands toward the green succulent in the white pot on the white pedestal. Keep her outfit unchanged. Smooth motion, no hard cuts, no new characters. 6 seconds, 16:9.
```

**Pass criteria:**

- Early timeline reads **apple**; later reads **succulent reach**; no forced **yellow umbrella** or **magenta scarf** unless model blends unexpectedly (note for review).

### C.2 Start + End (slots 0 and 4)

**Slots:** `slot00_START.png`, `slot04_END.png`; clear middle keys unless your test requires them.

**Workspace prompt (copy verbatim):**

```
Same gray studio and same woman throughout. Open on the red apple pose; close on the magenta scarf moment—scarf visible and her hands reaching toward it, expressive joy. The middle may interpolate; final frames must emphasize magenta scarf and reaching gesture, not the yellow umbrella or blue water pour. 7 seconds, 16:9, photorealistic.
```

**Pass criteria:**

- Final seconds skew toward **magenta / scarf**; **End** keyframe must be driven by **`endingRefImageUrl`** (see audit); if the clip instead peaks on **green succulent** behavior, suspect End slot wiring.

### C.3 Full five keyframes (slots 0–4)

**Slots:** Load `slot00_START.png` through `slot04_END.png` in order. **Do not** attach motion ref unless you are explicitly testing character-swap (different UI constraints).

**Workspace prompt (copy verbatim):**

```
One continuous photorealistic studio sequence, same woman and outfit throughout, warm gray seamless background. Beat 1: red apple at chest. Beat 2: reaching for green succulent on white pedestal. Beat 3: pouring blue-tinted water from pitcher to glass. Beat 4: playful pose with yellow umbrella open. Beat 5: magenta silk scarf billowing, she reaches joyfully. Smooth transitions, no genre change, no text, 8 seconds, 16:9.
```

**Pass criteria:**

- Console / payload shows **five** keyframe entries with slot indices **0–4** and plausible **start_frame_num** spacing.
- Visually, five **distinct** prop beats appear in order (red → green → blue pour → yellow → magenta).

### C.4 Character-swap (optional, motion ref on)

**Slots:** Motion ref = `motion_ref_walk_apple.mp4`; keyframes per [VIDEO_MULTI_REF.md](../../01-PAGES/01-WORKSPACE/VIDEO_MULTI_REF.md) (typically **Start, Key 3, End** active — **Key 2 and Key 4** greyed in UI).

**Workspace prompt (copy verbatim):**

```
Replace the performer with the same identity from the reference stills while preserving the walking path and timing from the motion video. She holds the red apple as she walks left to right; keep gray studio look in final render; photorealistic skin and fabric, no double exposure. 6 seconds.
```

**Pass criteria:**

- Motion follows **reference video**; identity tracks **loaded stills**; preflight UI shows character-swap active.

---

## 10. Reading results efficiently

| Tool | Use when |
|------|-----------|
| **Browser DevTools (Chrome / Cursor browser)** | You want live **Console** + **Network** payload inspection; best for Phases A–C. |
| **Playwright** | After flows stabilize, automate request-body assertions in CI (optional). |

**What to capture for a bug report:** (1) screenshot of five slots with filenames visible, (2) one Network JSON body for `input.images` (redact secrets), (3) console lines containing `MultiCondition` / `Slot`.

---

## 11. Success summary

| Phase | Model | Core check |
|-------|--------|------------|
| A | Grok I2V | Single-ref I2V respects **Start** still (apple, studio). |
| B | LTX 13B T2V | Text-only clip matches brief without refs. |
| C | LTX 13B Multi | Keyframe order and End frame match **slot00…slot04** prompts; End uses **magenta scarf** beat when End slot is loaded. |

This document is the **source of truth** for prompt text; update it if you change models or aspect ratios.
