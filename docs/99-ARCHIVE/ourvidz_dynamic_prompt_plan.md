# 🧠 Dynamic Prompting System Implementation Plan – OurVidz

This document outlines a **phased, scalable, and efficient implementation plan** to manage dynamic prompting across the OurVidz AI stack. It incorporates best practices for fallback logic, UI toggles, prompt weights (heats), and integrates with Supabase for centralized admin control.

---

## ✅ GOAL

To centralize and streamline prompt management across the following models:

- **Qwen 7B Base** (Prompt enhancer)
- **Qwen 7B Instruct** (Chat / Storybuilder)
- **SDXL Lustify** (Text-to-Image / Img2Img)
- **WAN 1.3B** (Text/Img to Video)

Including use cases like NSFW/SFW toggles, admin assistant, persona-driven prompts, and future roleplay and image feedback systems.

---

## 📘 Master Table: Models × Use Cases × Prompt Needs

| Model           | Use Case                   | SFW/NSFW Aware | Requires Dynamic Prompt | Prompt Type(s)                | Parameters to Externalize                        |
|----------------|----------------------------|----------------|--------------------------|-------------------------------|--------------------------------------------------|
| **Qwen Base**        | Prompt Enhancement (WAN)      | ✅ Yes         | ✅ Yes                   | System, Rewrite Rules          | Rewrite tone, persona rules                      |
| **Qwen Instruct**    | Chat / Roleplay / Storybuilder| ✅ Yes         | ✅ Yes                   | System, Memory Chain, Persona | Temperature, top_p, tone, character              |
|                    | Admin Assistant              | ❌ NSFW only    | ✅ Yes                   | System, Admin Rules            | Role filter, internal prompt builder             |
| **SDXL Lustify**     | Text-to-Image                | ✅ Yes         | ✅ Yes                   | System, Negative, Scene Rules | CFG, guidance_scale, steps, seeds, camera rules  |
|                    | Image-to-Image              | ✅ Yes         | ✅ Yes                   | Rewrite, Negative             | Denoise strength, CFG, clip_skip                 |
| **WAN 1.3B**         | Text-to-Video               | ✅ Yes         | ✅ Yes                   | System, Rewrite               | Duration, guidance, prompt richness              |
|                    | Image-to-Video              | ✅ Yes         | ✅ Yes                   | System, Prompt Style          | Duration, fidelity                               |
| **All Models**       | User Personas               | ✅ Yes         | ✅ Yes                   | Persona, Tags, LoRA Injection | Character ID, base prompt, LoRA weight           |
| **All Models**       | Admin Prompt Testing         | ❌ N/A         | ✅ Yes                   | Meta, test suite              | Prompt logs, scoring, NSFW tag                   |

---

## 🔁 Phased Implementation Plan

### Phase 1: Supabase Setup

- Tables:
  - `prompt_templates` (system, negative, chat templates)
  - `prompt_rules` (injectable modular rules)
  - `prompt_logs` (linked to job_id)
  - `model_parameters` (guidance, temperature, etc.)
  - `characters` (persona-level tags, defaults, LoRA refs)

---

### Phase 2: Build Central Prompt Cache Util

- `usePromptManager()` for TTL-based local cache fallback
- Loads all active prompts/rules on boot
- Supports `getPrompt(model_id, type)`

---

### Phase 3: Refactor Edge Functions + Workers

- Replace hardcoded strings with dynamic fetch logic
- Workers preload prompt/rule configs at startup
- Add fallback from local config if Supabase fails

---

### Phase 4: Admin UI – Prompt + Rule Manager

- Edit `prompt_templates` by model + type
- Manage `prompt_rules` by tag (e.g. NSFW, fantasy)
- Test button: inject into chat or preview enhanced prompt
- View prompt usage logs and failure flags

---

### Phase 5: Integrate Test Runner + Prompt Logs

- `test_runner.py` pulls live prompts from Supabase
- Logs version, job_id, response time, flags
- Optional: score prompt success via LLMs

---

### Phase 6: “Update Prompt Cache” Trigger

- Edge function `/refresh-prompt-cache`
- Broadcasts via Redis or Supabase channel
- Workers invalidate in-memory cache on receipt
- Admin UI: “🔁 Update Prompt Cache” button

---

### Phase 7: Layered Learning + Feedback System

- Log prompts, responses, outcomes
- Store top-performing prompts as `patterns`
- Optionally fine-tune or prompt-train Qwen
- Build recursive QA layer for prompt → output → quality loop

---

## 🔥 Additional Notes

### Best Practice: Fallbacks

- Store fallback prompts in `/lib/fallbackPrompts.ts`
- Used only if Supabase is unreachable
- Never hardcode into worker `.py` or `.ts` files

### Best Practice: Rule Layering

- Inject prompt rules dynamically by tag/context (e.g. NSFW + cinematic)
- Stored in `prompt_rules` table with `rule_type: prepend|append`

### Best Practice: Prompt Weights & Heats

- Externalize all model parameters into `model_parameters` table
- Configure per model, user tier, or persona
- Use default local config with override from Supabase

### UI Settings to Prefer Over Prompt Logic

| Feature                 | UI Toggle | Admin Setting | Prompt Logic |
|------------------------|-----------|----------------|--------------|
| NSFW/SFW Access        | ✅ Yes     | ✅ Yes          | ❌ Avoid      |
| Persona + LoRA Select  | ✅ Yes     | ✅ Optional     | ✅ Yes        |
| Lighting / Scene Style | ❌ No      | ✅ Optional     | ✅ Yes        |
| Prompt Intensity       | ❌ No      | ✅ Yes          | ✅ Yes        |

---

## ✅ Summary

- 🧠 Prompting is now centrally managed
- 🔄 Admins can update, test, and version prompt logic live
- 🧪 Test runner links usage with logs and outcome scoring
- ⚡ Cache keeps Supabase calls efficient in production
- 🚀 Designed for scale, clarity, and NSFW-first personalization