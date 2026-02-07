# Character Creation Research & UX Reference

## Purpose
This document captures research, competitive patterns, and UX conventions that informed the OurVidz **Character Hub** and **Character Studio** designs. It serves as shared context for product, design, and engineering during implementation in Cursor and Antigravity.

---

## Market Direction (2024–2026)
Across AI image/video platforms, character creation is converging on a **character‑centric model** rather than one‑off prompts. Characters are treated as **persistent assets** with identity, visual anchors, and reuse across images, video, and roleplay.

Key shifts:
- Characters are **first‑class objects** (libraries, pickers, edit flows)
- Consistency is an explicit product promise (not implied)
- UX separates **identity definition** from **scene prompting**
- Progressive disclosure supports casual and power users

---

## Representative Competitors & What We Learned

### Pinku.ai (Roleplay‑first)
- Characters persist across chat and image generation
- Persona (tone, backstory) is as important as visuals
- Media generation happens *inside* conversational context

**Takeaway:** Character profile must merge narrative + visual identity.

---

### Videotok (Consistent Characters for Video)
- Dedicated Characters section (not buried in video flow)
- Characters selected *before* scene generation
- Strong messaging around visual consistency across scenes

**Takeaway:** Character Hub + picker‑first generation flow.

---

### ImagineArt (Character + Consistent Video)
- Character description as primary input
- Style presets and restyling are first‑class controls
- Consistency framed as a controllable mode

**Takeaway:** Clear separation of identity vs. style vs. output settings.

---

### Artflow (Actor / Character Studio)
- Characters treated as reusable “actors”
- Upload images → establish identity → reuse everywhere
- Studio‑style editor layout (controls + preview)

**Takeaway:** Character = Identity Pack, not a prompt.

---

### Dedicated Consistent Character Tools
(e.g., AIConsistentCharacter.com)
- Base image (anchor) + controlled variations
- Emphasis on pose, outfit, environment changes

**Takeaway:** Anchor‑based consistency with visible history improves trust.

---

## Common Character Creation Flow
**Define → Customize → Use**

1. **Define Identity**
   - Name
   - Short description / role
   - Optional persona traits

2. **Customize Appearance & Style**
   - Structured controls (hair, outfit, mood)
   - Style presets (realistic, anime, cinematic)

3. **Save & Reuse**
   - Character appears in library
   - Used across image, video, roleplay

---

## Proven UX Patterns

### Layout
- **Two‑ or three‑pane editors** (controls + preview + prompt)
- **Card‑based character libraries** with fast actions
- **Wizard‑like first‑run creation**, full editor afterward

### Controls
- Prompt box remains primary, but surrounded by structure
- Advanced settings hidden by default
- Tooltips and micro‑copy for consistency concepts

### Consistency
- Explicit toggles/controls for consistency strength
- Visible history of outputs tied to character
- Ability to pin canon looks

---

## Implications for OurVidz
These findings directly informed:
- A dedicated **Character Hub** (library + creation entry point)
- A **Character Studio** editor with tabs for Identity, Appearance, Style, Media
- A clear separation between **character definition** and **scene prompting**
- Visual consistency as a surfaced, controllable feature

The resulting layouts (see PNG references) align with current best‑in‑class tools while remaining flexible enough to map onto OurVidz’ existing generation pipeline.

