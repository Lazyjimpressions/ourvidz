# Flux‑2 Flash (T2I) — Prompting Guide

**Endpoint:** `fal-ai/flux-2/flash`  
**Role in OurVidz:** ultra-fast, low-cost drafts for exploration.

---

## 1) When to use

- Rapid ideation / “reroll” loops
- Preview thumbnails
- Getting composition and vibe before spending on higher tiers

---

## 2) Prompting rules

- Lead with the **primary subject + scene** in the first sentence.
- Keep the prompt **compact and high-signal**.
- Prefer **concrete details** (materials, lighting, camera cues).
- Avoid multi-objectives in one prompt (Flash is best for a single clear intent).

---

## 3) Token limits (OurVidz)

- **User prompt cap:** ≤ **250 tokens**
- **AI-enhanced cap:** ≤ **450 tokens**

---

## 4) Practical prompting patterns

### A) High-signal one-liner

“Photoreal studio product shot of a matte-black travel mug on wet stone, soft overcast light, shallow depth of field, crisp condensation droplets.”

### B) Add camera + lighting in one clause

“… 85mm look, f/2.0 shallow DOF, diffused softbox key light from camera-left.”

### C) Add constraints last

“Must avoid: text, logos, extra objects, warped geometry.”

---

## 5) “Good” vs “bad” examples

### Good

“Photoreal cinematic street portrait at dusk, neon reflections on wet pavement, 50mm lens look, soft rim light, natural skin texture, subtle grain.”

### Bad (too vague / contradictory)

“Beautiful amazing portrait, ultra sharp but dreamy, super realistic but also cartoon, lots of details everywhere.”

---

## 6) Recommended internal template

Use the shared template in `flux-2_prompting_core.md` with short blocks.
