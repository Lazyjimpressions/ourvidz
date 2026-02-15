# Roleplay Scene Flow: Documentation vs Reality Audit

**Date:** February 15, 2026  
**Scope:** Opening image → subsequent images from chat; docs vs codebase, edge functions, and prompting tables.  
**Docs reviewed:** `docs/01-PAGES/07-ROLEPLAY/` (UX_SCENE.md, UX_CHAT.md, PURPOSE.md, SEEDREAM_I2I.md).

---

## 1. Documented Flow (Summary)

- **Opening image:** Scene template has `preview_image_url`; user picks scene → character → "Start Roleplay"; "Scene prompt used for image generation"; generated images in `character_scenes`.
- **First scene:** T2I using character reference (or scene template prompt).
- **Subsequent scenes:** I2I using previous scene; `useSceneContinuity` tracks previous_scene_id/image_url.
- **Tables:** `scenes` = templates; `character_scenes` = conversation artifacts only.

---

## 2. What Actually Happens

### 2.1 Opening image

| Doc | Reality |
|-----|--------|
| "Scene prompt used for image generation"; implied opening image in chat. | **Template preview is NOT shown in the chat thread.** `preview_image_url` appears only in SceneSetupSheet (before Start), SceneGallery, SceneTemplateCard, SceneCreationModal. Chat UI only renders `messages.map(...)` → ChatMessage. |
| | The first image the user sees in chat is the **first generated** scene (kickoff job completes → message.metadata.image_url). So "opening image" in chat = first T2I result, not template's preview. |

**Gap:** If docs intend the template preview as the opening visual in chat, that is **not implemented**. Either clarify in docs that opening = first generated image, or add UI that shows `selectedScene.preview_image_url` when conversation is empty (and optionally replace when first scene generates).

### 2.2 First scene generation

| Doc | Reality |
|-----|--------|
| First scene: T2I using character reference. | **Plus:** When user started with a scene template (`scene_context` = template's `scene_prompt`), the **first** scene uses the **template's scene_prompt directly** (with character name/visual substitution). No LLM narrative in that case. |
| | If no template: `generateSceneNarrativeWithOpenRouter()` uses "Scene Narrative - NSFW/SFW" to produce the prompt, then T2I. |

**Flow:** Kickoff with `scene_context`, `scene_generation: true`, `previous_*: null` → `generateScene(..., sceneTemplatePrompt, ...)` → if `sceneTemplatePrompt && isFirstScene` → use template prompt (character substitution); else → OpenRouter narrative. First image stored in `character_scenes`, job_id returned, frontend subscribes to job completion and sets message `metadata.image_url`. **Aligned with docs**, with explicit first-scene template usage.

### 2.3 Subsequent scenes (I2I)

| Doc | Reality |
|-----|--------|
| I2I from previous scene; useSceneContinuity; store in character_scenes. | **Implemented.** Edge function verifies previous scene in DB; sets I2I mode and reference URL; creates next scene in `character_scenes` with continuity metadata. Frontend passes previous_scene_id and signed previous_scene_image_url. |

**Modes in code (priority):** (1) Modification: override + current scene image → I2I on current. (2) Fresh: override, no current image → T2I from character. (3) Continuation: no override, has previous → I2I from previous. (4) First: no previous → T2I. **Aligned.**

### 2.4 Tables

`scenes` used for templates; `character_scenes` for generated images per conversation. **Aligned.**

---

## 3. Prompting Tables (prompt_templates)

**Relevant rows (from DB):**

- **Scene Narrative - NSFW/SFW** (use_case: scene_narrative_generation): first-scene **narrative** when no template prompt (OpenRouter).
- **Scene Iteration - NSFW/SFW** (scene_iteration): subsequent (I2I) scene **prompt** generation.
- **Scene Iteration - Seedream v4/v4.5 Edit** (scene_iteration, target_model: fal-ai/.../seedream): model-specific I2I prompts.
- **Scene Modification - *** (scene_modification): user edits (QuickModificationSheet, etc.).
- **Scene Multi-Reference - NSFW/SFW** (scene_multi_reference, target fal-ai/.../v4.5/edit): both_characters Figure notation.
- **Scene Generation - Character Context** (scene_generation, sdxl): legacy/alternate.
- **WAN Scene Generation – NSFW** (scene_generation, wan): video.

**Important:** When the user has selected a scene template, the **first** scene prompt is the template's `scene_prompt` from the `scenes` table, not a prompt_templates row. Prompt_templates are used for LLM-generated narrative/iteration/modification and for model-specific Seedream prompts.

---

## 4. Edge Functions

- **roleplay-chat:** Full flow: kickoff/message, system prompt (scene_context, starters), chat model, then if `scene_generation` → `generateScene()` (template vs narrative, T2I vs I2I), create/update `character_scenes`, return job_id/scene_id; orchestrates image path (fal-image, replicate-image, queue-job).
- **fal-image:** Seedream T2I/I2I (and video).
- **replicate-image:** Replicate image models.
- **queue-job:** Local workers.

---

## 5. Summary

**Aligned:** First scene = T2I (template prompt when scene selected, else narrative); subsequent = I2I from previous; continuity and storage in `character_scenes`; scene styles and multi-reference; prompt_templates for narrative/iteration/modification and Seedream.

**Gap:** Chat does **not** show the scene template's `preview_image_url` as an "opening" image; the first image in chat is always the first **generated** scene. Recommend: document that, or add optional opening block showing template preview when messages are empty.

**Code refs:** `MobileRoleplayChat.tsx`, `ChatMessage.tsx`, `SceneSetupSheet.tsx`, `useSceneContinuity`, `roleplay-chat` → `generateScene()`, `generateSceneNarrativeWithOpenRouter()`.
