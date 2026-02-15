# Roleplay Scene Flow – Authoritative Spec

**Last updated:** February 2026  
**Purpose:** Define how scene images work from opening (scene template) through chat: first-scene I2I from template image, UI scene styles, and continuity so images match chat state.

---

## 1. Starting from a scene template

- User selects a **scene template** (from `scenes` table) then a character, then "Start Roleplay".
- Each scene template has:
  - **`scene_prompt`** – text used for scene context and for the image prompt (with character substitution).
  - **`preview_image_url`** – template’s preview image.

**First scene in chat must use I2I from the template image, not T2I.**

- The **first** generated scene in that conversation uses the template’s **`preview_image_url`** as the **reference image for I2I** (image-to-image), not text-to-image.
- This keeps the kickoff scene visually aligned with the chosen template (setting, mood, composition) while applying character (and optionally user) appearance.

**Flow:**

1. Frontend sends `scene_preview_image_url` (signed if storage path) with kickoff and with any message when a scene template is selected and no previous chat scene exists.
2. Edge function `roleplay-chat` → `generateScene(..., templatePreviewImageUrl)`.
3. When `isFirstScene && templatePreviewImageUrl`, mode is **I2I** with `effectiveReferenceImageUrl = templatePreviewImageUrl` (no T2I for first scene when template has an image).

---

## 2. Scene style (UI settings)

UI exposes three scene styles; generation must respect them.

| Style | Meaning | References used |
|-------|--------|------------------|
| **character_only** | Only the AI character in frame | Scene (template or previous) + character reference. |
| **pov** | First-person view; user implied, not shown | Scene + character reference. |
| **both_characters** | Both AI character and user persona in frame | Scene (template or previous) + character reference + **user character reference image**. |

- **character_only / pov:** Single reference I2I (template or previous scene image), with character (and narrative) applied; or multi-ref with [scene, character] as needed by the model.
- **both_characters:** Multi-reference (Seedream v4.5/edit style):
  - **Figure 1:** Scene – for first scene = template `preview_image_url`; for later = previous chat scene image.
  - **Figure 2:** AI character reference.
  - **Figure 3:** User character reference (required; if missing, fall back to character_only or disable option in UI).

Logic in code:

- First scene from template: Figure 1 = `templatePreviewImageUrl`.
- Subsequent scenes: Figure 1 = `verifiedPreviousSceneImageUrl`.
- Fallback when no scene image: Figure 1 = character reference.

---

## 3. Continuity (each new scene references the previous)

- After the first scene, **every** new scene (auto or manual) must use **I2I from the previous chat scene** when continuity is enabled.
- `useSceneContinuity` (and frontend) pass `previous_scene_id` and `previous_scene_image_url` (signed if needed).
- Edge function verifies the previous scene in `character_scenes` and uses its `image_url` as the reference for the next generation.
- Result: consistent setting, clothing, and state across the conversation.

**Modes (priority order):**

1. **Modification** – user edited prompt and provided current scene image → I2I from current scene.
2. **Fresh** – user asked for a fresh image (no current scene) → T2I from character reference only.
3. **Continuation** – no override, has previous scene → I2I from previous scene.
4. **First scene from template** – has template `preview_image_url`, no previous chat scene → I2I from template image.
5. **First scene without template image** – no previous, no template image → T2I from character reference.

---

## 4. Accuracy to chat state

- Scene prompts (from template for first scene, or from narrative/iteration templates for later) should describe the **current** state of the conversation: location, clothing, pose, action.
- Narrative generation uses conversation history and character response so the image reflects what just happened (scene changes, clothing changes, etc.).
- Automatic and manual scene generation both use the same continuity and scene-style rules so that **all** generated images accurately represent the current state of the chat.

---

## 5. Summary

| Situation | Reference for image | Mode |
|-----------|----------------------|------|
| First message, started from scene template with `preview_image_url` | Template’s `preview_image_url` | I2I |
| First message, no template image | Character reference | T2I |
| Later message, continuity on | Previous chat scene image | I2I |
| both_characters (first) | [Template preview, character ref, user ref] | Multi-ref I2I |
| both_characters (later) | [Previous scene, character ref, user ref] | Multi-ref I2I |
| User regeneration (with current scene) | Current scene image | I2I modification |
| User regeneration (fresh) | Character reference | T2I |

---

## 6. Docs and code references

- **Docs:** `docs/01-PAGES/07-ROLEPLAY/` (UX_SCENE.md, UX_CHAT.md, SEEDREAM_I2I.md).
- **Frontend:** `src/pages/MobileRoleplayChat.tsx` – passes `scene_preview_image_url` (signed) on kickoff, send message, manual scene gen, retry kickoff.
- **Edge function:** `supabase/functions/roleplay-chat/index.ts` – `generateScene(..., templatePreviewImageUrl)`; first-scene I2I when `templatePreviewImageUrl` set; multi-ref Figure 1 = template or previous scene.
