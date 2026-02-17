# Flux‑2 Flash/Edit (I2I) — Prompting Guide

**Endpoint:** `fal-ai/flux-2/flash/edit`  
**Role in OurVidz:** cheapest + fastest edit iteration.

---

## 1) When to use

- Rapid iteration loops (“try 10 variations quickly”)
- Testing an edit instruction before running a higher-cost endpoint
- Early continuity tuning

---

## 2) Prompting rules

- Keep it **surgical**: one primary change.
- Avoid multi-step transformations in a single run.
- If you need complexity, do **two passes**.

---

## 3) Token limits (OurVidz)

- **User instruction cap:** ≤ **180 tokens**
- **AI-enhanced cap:** ≤ **300 tokens**

---

## 4) Recommended format

Use the I2I template from `flux-2_prompting_core.md` and keep each section short.

---

## 5) Example (fast background swap)

**KEEP:** subject identity, pose, clothing, lighting on subject.  
**CHANGE:** replace background with a rainy city street at night; match reflections; keep the subject sharp.  
**AVOID:** new people, text, heavy stylization.  
**REFERENCES:** Image 1 = base subject.
