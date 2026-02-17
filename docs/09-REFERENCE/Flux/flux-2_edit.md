# Flux‑2 Edit (I2I multi-reference) — Prompting Guide

**Endpoint:** `fal-ai/flux-2/edit`  
**Role in OurVidz:** controlled multi-reference edits (identity/wardrobe/background/style mixing).

---

## 1) When to use

- Multi-reference compositing: “use subject from Image 1, outfit from Image 2, scene from Image 3”
- Continuity frames where you need careful preservation
- Precise transformations (including color-critical changes)

---

## 2) Editing prompt rules (most important)

1. **KEEP**: explicitly list what must remain unchanged.
2. **CHANGE**: list only the edits you want.
3. **AVOID**: list artifacts to prevent.
4. **REFERENCES**: name each input image’s job.

### One pass = one main transformation

If you need multiple major changes, do multiple passes.

---

## 3) Token limits (OurVidz)

- **User instruction cap:** ≤ **220 tokens**
- **AI-enhanced cap:** ≤ **350 tokens**

---

## 4) Recommended prompt format (use this verbatim)

**KEEP (unchanged):**  

- …

**CHANGE (do):**  

- …

**AVOID (don’t):**  

- …

**REFERENCES:**  

- Image 1 = …  
- Image 2 = …  
- Image 3 = …

---

## 5) Examples

### Outfit swap (single change)

**KEEP:** face/identity, expression, pose, background, lighting direction.  
**CHANGE:** replace outfit with the jacket from Image 2; match fabric texture; keep shadows consistent.  
**AVOID:** changing facial features; adding accessories; text/logos.  
**REFERENCES:** Image 1 = base subject; Image 2 = outfit reference.

### Color-critical tweak

“Keep everything the same. Change the tie color to #0B1F3B. No other changes.”

---

## 6) Notes for OurVidz continuity flows

- Encourage users to do a **Flash/Edit iteration pass** first, then finalize with Turbo/Edit (or Edit itself) once instructions are validated.
