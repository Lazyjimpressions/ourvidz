# Kickoff Audit: Lucy + Johnny, Scene "When the House is Empty"

**Date:** February 2026  
**Session:** Character Lucy, User persona Johnny, Scene template `fdbbc6d9-57c0-4e54-9afc-aa0876456c27`  
**Conversation:** `d48e7a44-cbf1-4222-a1fa-d858e29ea250`  
**Source:** Browser review + Supabase `character_scenes` and `scenes` / `api_models` queries  

---

## 1. Browser / UX

- **URL:** `http://localhost:8080/roleplay/chat/9c797492-76d9-47ce-82da-4fb8c19d17ca?scene=fdbbc6d9-57c0-4e54-9afc-aa0876456c27&fresh=true`
- **Header:** Lucy (AI companion), user profile indicator.
- **Kickoff message:** Lucy’s opening line (nervous, college student, “everyone else has left…”).
- **Opening image:** One generated scene image (couple on couch, dim living room, intimate). Image has actions: Edit scene prompt, download, info. “View admin debug info” is on the message but was not opened in this audit (visibility/scroll).

---

## 2. Scene Template Used

| Field | Value |
|-------|--------|
| **Scene ID** | `fdbbc6d9-57c0-4e54-9afc-aa0876456c27` |
| **Name** | When the House is Empty |
| **Template scene_prompt** | Dimly lit living room, soft ambient lighting, two people sitting close on a couch, subtle hints of tension and longing, accidental touches, lingering gazes, warm and intimate atmosphere, quiet and private setting, soft shadows, cozy furnishings, muted colors. |
| **Preview image** | Present (`preview_image_url` from fal.media). |

---

## 3. Opening Kickoff Image – Validation

### 3.1 Source of prompt (first scene from template)

- **Design:** For the first scene from a scene template, the edge function uses the template’s `scene_prompt` from the `scenes` table (sent as `scene_context`). It does **not** call Scene Narrative / Scene Iteration templates from `prompt_templates` for that first image.
- **DB evidence (`character_scenes`):**
  - `scene_prompt` / `original_scene_prompt`: **Lucy (Asian college student , mysterious, enigmatic, alluring, Glasses, Cleavage, asian, white blouse), Dimly lit living room, soft ambient lighting, two people sitting close on a couch, subtle hints of tension and longing, accidental touches, lingering gazes, warm and intimate atmosphere, quiet and private setting, soft shadows, cozy furnishings, muted colors.**
- **Conclusion:** The prompt is the template’s scene text with the **character name and visual description** prepended by `generateScene` (first-scene branch: `sceneTemplatePrompt && isFirstScene`). No `prompt_templates` row is used for this first-scene image text; `scene_template_name` in metadata is correctly **null** for this path.

### 3.2 Image model

| Field | Value |
|-------|--------|
| **effective_image_model** | `c11279e0-8810-482b-be48-3cbc7b8e7f48` |
| **Model (api_models)** | **Seedream v4** |
| **model_key** | `fal-ai/bytedance/seedream/v4/text-to-image` |
| **Task** | generation |
| **Provider** | fal |

So the opening kickoff image was generated with **Seedream v4** (T2I-capable model). The `generation_metadata.model_used` value in the scene record may still say `sdxl` in some cases; the authoritative field for “which model was used” is **effective_image_model** (UUID above).

### 3.3 Generation mode (I2I from template preview)

| Field | Value |
|-------|--------|
| **generation_mode** | **i2i** |
| **is_first_scene** | true |
| **scene_style** | character_only |

- **Design:** When `isFirstScene && templatePreviewImageUrl`, the edge function sets `generationMode = 'i2i'` and uses the template’s preview image as the reference (see `roleplay-chat/index.ts` ~2563–2570).
- **Conclusion:** The opening image was produced as **I2I from the scene template’s preview image**, not T2I from scratch. This matches the intended “first scene from template uses I2I from template preview when present.”

---

## 4. Dialogue (Kickoff Message) – Templates

- **Design:** The chat model and dialogue template are chosen in `callModelWithConfig` → `getModelSpecificTemplate(supabase, modelKey, contentTier)` with fallback to `getUniversalTemplate`. `modelKey` comes from the request’s `model_provider` (e.g. OpenRouter `model_key`); `contentTier` is typically `nsfw` for this flow.
- **Available character_roleplay templates (from DB):**
  - Model-specific: Dolphin 3.0 Mistral 24B, Venice Dolphin NSFW, MythoMax 13B, Llama 3 Lumimaid 70B, Mistral Nemo 12B Celeste (each with matching `target_model`).
  - Universal: “Universal Roleplay - Qwen Instruct (NSFW)” (`target_model` null).
- **Validation:** Without the exact `model_provider` sent at kickoff, we cannot state the single template name from DB. What we can state: the kickoff message was generated using whichever **character_roleplay** template was selected for that model (model-specific if one matched, otherwise the universal NSFW template). The browser did not expose the chat model or template name in the snapshot; those can be confirmed from Supabase logs or by logging `model_provider` and `prompt_template_name` in the edge function response if added.

---

## 5. Summary Table

| Item | Result |
|------|--------|
| **Scene template** | When the House is Empty (`fdbbc6d9-57c0-4e54-9afc-aa0876456c27`) |
| **First-scene prompt source** | Template `scene_prompt` (from `scenes` table) with character name + visual description prepended |
| **Scene narrative template** | None (first scene does not use Scene Narrative / Scene Iteration) |
| **scene_template_name in metadata** | null (expected for first-scene-from-template path) |
| **Image model** | Seedream v4 (fal-ai/bytedance/seedream/v4/text-to-image), provider fal |
| **Image generation mode** | I2I from template preview image |
| **Scene style** | character_only |
| **Dialogue template** | One of the character_roleplay templates (model-specific or universal NSFW); exact name requires request’s `model_provider` or server-side logging |

---

## 6. Why I2I image model wasn’t used (and fix)

- **Observed:** Kickoff used **Seedream v4** (T2I, `task='generation'`) even though the first scene was generated in **I2I mode** (from the template’s preview image).
- **Cause:** When no image model was selected, the backend chose the default by `requiredTask = isFirstScene ? 'generation' : 'style_transfer'`. So for *any* first scene it defaulted to a T2I model, including when the first scene was I2I-from-template-preview.
- **Fix (implemented):** Default task is now:
  - **First scene with template preview (I2I):** `requiredTask = 'style_transfer'` → default image model is an I2I model (e.g. Seedream v4.5 Edit).
  - **First scene without template preview (T2I):** `requiredTask = 'generation'`.
  - **Later scenes (I2I):** `requiredTask = 'style_transfer'`.
- **Scene modal (SceneSetupSheet):** `useImageModels()` is called **without** `hasReferenceImage`, so the Image dropdown includes **all** active image models (both T2I and I2I). I2I models (e.g. Seedream v4 Edit, Seedream v4.5 Edit) are therefore available in the scene modal before kick-off; the user can select an I2I model explicitly if they want.

---

## 7. Admin debug and metadata fixes (implemented)

1. **Scene record `generation_metadata`** now includes **`model_display_name`** (from `imageModelConfig.display_name`) so the admin debug panel shows the image model name, not only the UUID.
2. **First-scene-from-template** now sets **`scene_template_name: 'Scene template (first scene)'`** so the debug panel shows which template path was used.
3. **SceneDebugPanel** now:
   - Shows the “Prompt / Scene Template” section when **`scene_template_prompt`** is set (so first-scene template is visible even if `scene_template_name` was missing).
   - Displays **“Scene template (first scene)”** when `scene_template_prompt` is present and `scene_template_name` is not.
   - Shows **Image Model** using `model_display_name` or, as fallback, a truncated `effective_image_model` ID.

---

## 8. Recommendations (remaining)

1. **Logging:** In `roleplay-chat`, log `model_provider` and the chosen dialogue template name in the kickoff response or server logs so future audits can confirm the exact dialogue template.
2. **UI:** Expose “View admin debug info” so it’s visible without scrolling (e.g. always show the info icon on the scene image for admin users).
