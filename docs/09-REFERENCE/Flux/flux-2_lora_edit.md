# Flux‑2 LoRA/Edit (I2I + adapters) — Prompting Guide

**Endpoint:** `fal-ai/flux-2/lora/edit`  
**Role in OurVidz:** premium consistent edits within a trained style/character standard.

---

## 1) When to use

- You have a style/character LoRA and need edits that stay “on brand”
- Batch editing a library while preserving a consistent look
- Domain-specific transformations

---

## 2) LoRA + edit rules

- Let the LoRA drive style/identity bias; don’t fight it with contradictory style instructions.
- Keep your text focused on **what changes** and **what must remain**.
- Prefer fewer LoRAs; use multiple only if they’re clearly complementary.

---

## 3) Token limits (OurVidz)

- **User instruction cap:** ≤ **260 tokens**
- **AI-enhanced cap:** ≤ **450 tokens**

---

## 4) Example (consistent house look edit)

**KEEP:** subject identity, expression, pose, background layout.  
**CHANGE:** adjust lighting to match the house look; refine textures; keep colors accurate.  
**AVOID:** extra elements, text, logos, face distortion.  
**REFERENCES:** Image 1 = base subject.

(Attach the relevant LoRA(s) in `loras[]`.)
