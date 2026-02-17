# Flux‑2 Prompting Core (fal.ai) — OurVidz Reference

This document defines **shared best practices** for prompting Flux‑2 endpoints on **fal.ai**.

**Endpoints covered elsewhere (one file each):**

- `fal-ai/flux-2/flash`
- `fal-ai/flux-2/turbo`
- `fal-ai/flux-2/lora`
- `fal-ai/flux-2/edit`
- `fal-ai/flux-2/flash/edit`
- `fal-ai/flux-2/turbo/edit`
- `fal-ai/flux-2/lora/edit`

---

## 1) Mental model: how Flux responds to prompts

Flux generally performs best when you:

- Put the **most important constraints first**.
- Keep the prompt **high-signal** and avoid contradictions.
- Prefer **specific visual nouns** (materials, lighting, camera cues) over abstract adjectives.
- For editing (I2I), focus on **surgical instructions**: what to change, what to keep.

---

## 2) Recommended prompt structure (T2I)

Use this block structure consistently in OurVidz:

### A) One‑line intent (required)

A single sentence that states the *main image*.

### B) Details (recommended)

- **Subject:** who/what is in frame
- **Action / pose:** what they are doing
- **Scene / context:** location, time, mood
- **Composition:** framing, shot size, layout
- **Camera:** lens look, angle, DOF cues
- **Lighting:** key/fill/rim, softness, direction
- **Materials / texture:** cloth weave, skin texture, metal finish
- **Style / finish:** photoreal/editorial/illustration, grain, grade

### C) Constraints (recommended)

- **Must include:** short list
- **Must avoid:** short list

---

## 3) Recommended prompt structure (I2I editing)

For edit endpoints, standardize on:

- **KEEP (unchanged):** identity/face (if relevant), pose, background, lighting, composition
- **CHANGE (do):** concise list of edits
- **AVOID (don’t):** artifacts, extra people, text/logos, unwanted style drift
- **REFERENCES:** map each input image to its role, e.g.  
  - Image 1 = base subject  
  - Image 2 = outfit/style reference  
  - Image 3 = background/location reference  

### Editing rule of thumb

**One pass = one main transformation.**  
If you need multiple major changes, do sequential passes.

---

## 4) Token / length guardrails (OurVidz)

fal.ai does not publish a single universal “prompt token limit” for these endpoints in a way that is stable for guardrails. To keep outputs consistent and reduce model drift, OurVidz should enforce conservative caps by endpoint class:

### Text‑to‑Image caps (prompt length)

- **Flash:** user ≤ **250 tokens**, AI ≤ **450 tokens**
- **Turbo:** user ≤ **400 tokens**, AI ≤ **700 tokens**
- **LoRA:** user ≤ **450 tokens**, AI ≤ **800 tokens**

### Edit caps (instruction length)

- **Flash/Edit:** user ≤ **180 tokens**, AI ≤ **300 tokens**
- **Turbo/Edit:** user ≤ **260 tokens**, AI ≤ **420 tokens**
- **Edit:** user ≤ **220 tokens**, AI ≤ **350 tokens**
- **LoRA/Edit:** user ≤ **260 tokens**, AI ≤ **450 tokens**

**Why these caps work**

- Shorter prompts reduce contradictions and preserve controllability.
- Editing prompts are best when **surgical**.
- LoRA prompts should be stable; the LoRA provides the consistency.

> Implementation note: treat “tokens” as your LLM’s tokenization estimate. If you only have character counts, use a fallback cap of ~4 chars/token (English) as a rough approximation.

---

## 5) Safe defaults for common parameters (non‑prompt)

You can expose these as UI defaults or “advanced” toggles.

- **guidance_scale:** start around **2.5**; adjust within **2–6** for most cases.
- **num_images:**  
  - Exploration: 2–4  
  - Production: 1–2
- **seed:** set for reproducibility in “lock” workflows.

---

## 6) Template‑ready prompt formats

### T2I template (recommended)

**INTENT:**  
…  
**DETAILS:**  
Subject: …  
Action/Pose: …  
Scene: …  
Composition: …  
Camera: …  
Lighting: …  
Materials: …  
Style/Finish: …  
**CONSTRAINTS:**  
Must include: …  
Must avoid: …

### I2I template (recommended)

**KEEP (unchanged):** …  
**CHANGE (do):** …  
**AVOID (don’t):** …  
**REFERENCES:** Image 1 = …, Image 2 = …, …

---

## 7) Examples you can reuse

### Example — clean editorial portrait (T2I)

**INTENT:** Photoreal editorial portrait in a modern loft with soft morning window light.  
**DETAILS:** 50mm look, shallow DOF, natural skin texture, subtle film grain, neutral grade with warm highlights.  
**CONSTRAINTS:** Must avoid: extra people, text, logos, distorted hands.

### Example — outfit swap (I2I)

**KEEP:** face/identity, expression, pose, background, lighting direction.  
**CHANGE:** replace outfit with the jacket from Image 2; match fabric texture; keep shadows consistent.  
**AVOID:** changing facial features, adding accessories not requested, text.  
**REFERENCES:** Image 1 = base subject, Image 2 = outfit reference.
