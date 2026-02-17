# Flux‑2 Turbo (T2I) — Prompting Guide

**Endpoint:** `fal-ai/flux-2/turbo`  
**Role in OurVidz:** default production T2I when you want better adherence and detail than Flash.

---

## 1) When to use

- Final-ish still images and keyframes
- Better detail fidelity and prompt adherence than Flash
- Anything user-facing where quality matters but you still want speed

---

## 2) Prompting rules

- Add **micro-detail**: fabric weave, surface finish, skin texture.
- Specify **camera language**: lens look, angle, DOF cues.
- Keep prompts stable when generating a series; change only what you must.
- Put **must-keep** constraints up front for important elements.

---

## 3) Token limits (OurVidz)

- **User prompt cap:** ≤ **400 tokens**
- **AI-enhanced cap:** ≤ **700 tokens**

---

## 4) Practical prompting patterns

### A) Editorial portrait (strong default)

“Photoreal editorial portrait in a modern loft, soft morning window rim light, 50mm lens look, f/2.0 shallow DOF, natural skin texture, subtle film grain, neutral grade with warm highlights.”

### B) Environment emphasis

“Wide interior shot of a minimalist living room, soft overcast daylight, clean lines, realistic materials, 24mm lens look, gentle shadows, subtle haze.”

### C) Constraint block (short)

“Must avoid: extra people, text/logos, heavy stylization, warped hands.”

---

## 5) Recommended internal template

Use the shared template in `flux-2_prompting_core.md` with richer detail blocks than Flash.
