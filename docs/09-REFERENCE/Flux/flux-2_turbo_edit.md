# Flux‑2 Turbo/Edit (I2I) — Prompting Guide

**Endpoint:** `fal-ai/flux-2/turbo/edit`  
**Role in OurVidz:** higher-quality edits after you validate the instruction on Flash/Edit.

---

## 1) When to use

- Finalizing edits where fidelity and adherence matter
- Continuity polishing
- “Last mile” improvements (materials, lighting nuance)

---

## 2) Prompting rules

- Same “KEEP / CHANGE / AVOID / REFERENCES” structure.
- You can add slightly more nuance than Flash/Edit, but keep it disciplined.
- If the model drifts, reduce complexity and emphasize KEEP constraints first.

---

## 3) Token limits (OurVidz)

- **User instruction cap:** ≤ **260 tokens**
- **AI-enhanced cap:** ≤ **420 tokens**

---

## 4) Example (wardrobe + minor lighting)

**KEEP:** face/identity, expression, pose, background composition.  
**CHANGE:** replace outfit with a charcoal suit; add subtle specular highlights on fabric; keep lighting direction consistent.  
**AVOID:** changing facial features; adding jewelry; text/logos.  
**REFERENCES:** Image 1 = base subject; Image 2 = outfit reference.
