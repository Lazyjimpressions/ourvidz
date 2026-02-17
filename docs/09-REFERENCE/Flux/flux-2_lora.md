# Flux‑2 LoRA (T2I + adapters) — Prompting Guide

**Endpoint:** `fal-ai/flux-2/lora`  
**Role in OurVidz:** premium consistency (house style / character / product look) using up to **3** LoRAs.

---

## 1) When to use

- You need repeatable “brand/creator pack” looks
- Character consistency across many images
- Domain specialization (e.g., a curated studio style)

---

## 2) LoRA-specific prompting rules

- Let the LoRA do what it’s trained to do:
  - **Style LoRA:** keep style text light; focus on composition/subject.
  - **Character LoRA:** keep identity-critical descriptors stable.
- Avoid stacking competing LoRAs. Use 1 when possible; 2–3 only if they are complementary.
- Avoid rewriting the entire prompt each run—keep it stable for consistency.

---

## 3) Token limits (OurVidz)

- **User prompt cap:** ≤ **450 tokens**
- **AI-enhanced cap:** ≤ **800 tokens**

---

## 4) Practical prompting patterns

### A) Style LoRA pattern

“Clean studio packshot, centered composition, soft top light, controlled shadows, accurate colors, commercial photography finish.”

(LoRA provides the style; prompt provides the composition.)

### B) Character LoRA pattern

“Medium close-up portrait, calm expression, 50mm look, soft rim light, natural texture, subtle grain.”

(LoRA provides identity; prompt provides framing and lighting.)

---

## 5) Recommended internal template

Use the shared template in `flux-2_prompting_core.md`, and keep “Style/Finish” block minimal if a style LoRA is attached.
