# Scene Template Launch Flow

**Document Version:** 1.0  
**Last Updated:** February 2026  
**Status:** Active  

---

## Purpose

This doc summarizes the **scene template construct and launch flow**: how users get from the dashboard to a roleplay chat with a scene, what can be set before "Start Roleplay," and how the first scene image is generated.

---

## Launch Flow (Summary)

1. **Dashboard** (`/roleplay`) — User sees scene gallery and optional **Dashboard Settings** (image model, chat model, content filter, memory tier, scene style, image generation mode). These persist in localStorage.
2. **Scene card tap** — Opens **SceneSetupSheet** with the selected scene template.
3. **SceneSetupSheet** — User must set:
   - **AI Companion** (primary character)
   - **Your Profile** (user persona — always required for two-way roleplay)
   - Optionally: **Your Role** (text), **Options** (collapsible: image model, chat model, scene style, Auto/Manual images).
4. **Start Roleplay** — Navigates to `/roleplay/chat/:characterId?scene=:sceneId` with state: `sceneConfig`, `userCharacterId`, `sceneStyle`, `selectedImageModel`, `selectedChatModel`, `imageGenerationMode`, etc. Chat uses these for the session when present; otherwise falls back to localStorage.
5. **First scene in chat** — When starting from a template, the first scene image uses **I2I from the template's preview image** when present; otherwise T2I. Later scenes use Scene Narrative / Scene Iteration prompts.

---

## Scene Style Meanings

| Style | Who appears in image | Notes |
|-------|----------------------|--------|
| **character_only** | Only the AI character | User profile used for dialogue; user's image not in frame. |
| **pov** | Scene from user's perspective | Camera is the user's; system draws the **character** as seen by the user (first-person). User profile for dialogue; user's image not in frame. |
| **both_characters** | Both user and AI character | User reference image required. |

---

## Where to Set Model and Image Options

- **Dashboard Settings** — Global defaults (localStorage). Apply to all sessions unless overridden.
- **SceneSetupSheet → Options** — Pre-launch choices for this session. Passed in navigation state to chat; chat prefers them over localStorage when starting from the sheet.

Recommend setting these before starting a scene so the session uses the intended models and mode.

---

## Related Docs

- [UX_SCENE.md](./UX_SCENE.md) — Scene templates, SceneSetupSheet, Scene Gallery
- [UX_CHAT.md](./UX_CHAT.md) — Chat interface, settings persistence, I2I flow
- [PROMPTING_SYSTEM.md](../../03-SYSTEMS/PROMPTING_SYSTEM.md) — Scene prompt source, template conventions, POV
