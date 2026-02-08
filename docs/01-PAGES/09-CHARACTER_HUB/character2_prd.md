# Character System PRD (v2)

## Overview

This PRD defines the **v2 Character system** for OurVidz, incorporating clarified separation of concerns between **Characters**, **Albums**, and **Scenes**, and resolving prior ambiguity around Character Studio behavior.

The system consists of two primary user-facing surfaces:

1. **Character Hub** – create, browse, and open characters
2. **Character Studio** – define character identity (canon) and generate **Album images** (not scenes)

> **Important clarification (locked):**
>
> - **Scenes are generated ONLY from Roleplay Chat**
> - **Character Studio generates Album images** (iterations, poses, styles)
> - **Scenes may optionally be saved into Albums**
> - **Scenes are ephemeral by default** and may be deleted with their chat to prevent storage bloat

---

## Goals

- Treat characters as first‑class, reusable identity objects
- Enable explicit, controllable visual consistency
- Cleanly separate:
  - Character identity (canon)
  - Album imagery (curated visual library)
  - Roleplay scenes (ephemeral narrative outputs)
- Ensure Studio UX is unambiguous and scalable into roleplay

---

## Non‑Goals

- Character Studio does **not** generate roleplay scenes
- Character Studio does **not** manage chat history
- No automatic persistence of roleplay outputs unless user opts in

---

# Core Data Model (Conceptual)

## Character

Represents identity and consistency.

- name
- tagline (used on character card)
- bio
- backstory
- traits (chips + tags)
- canon_spec (auto‑compiled prompt)
- anchor_slots:
  - face_anchor
  - body_anchor
  - style_anchor (optional)

## Album

Curated, persistent image set associated with a character.

- Generated from Character Studio OR saved from Roleplay Scenes
- Intended for reuse, reference, and continuity

## Scene

Ephemeral image/video output generated from Roleplay Chat.

- Stored with chat context
- Deleted when chat is deleted (default)
- May be explicitly saved to Album

---

# 1. Character Hub PRD

## Purpose

The Character Hub is the entry point for character lifecycle management.

It answers:
> “Who are my characters, and which one do I want to work with?”

---

## Features

### Character Grid

- Card‑based layout
- Each card displays:
  - Thumbnail
  - Name
  - Tagline
  - Tags

### Card Actions

- Open (Character Studio)
- Generate (shortcut → Studio)
- Duplicate
- Delete

---

## Create Character Flow

### Primary CTA

- **Create Character**

### Creation Choice

User selects:

1. **Start from Images** (I2I – best consistency)
2. **Start from Description** (T2I – fastest)

Both routes land in Character Studio and produce the same character object.

---

# 2. Character Studio PRD (v2)

## Purpose

Character Studio is a **Character + Album workspace**.

It is used to:

- Define and edit character identity
- Create and lock canon anchors
- Generate **Album images** (poses, styles, iterations)

It is **not** used to generate roleplay scenes.

---

## Page Layout (Locked)

Three‑column Studio layout:

### Column A — Character Definition

Defines **who the character is**.

### Column B — Preview & Image Sets

Displays canon anchors and Album images.

### Column C — Generation Driver

Controls **how new Album images are generated**.

---

## Column A: Character Definition (Canon Compiler)

### Purpose

Column A defines **character identity** and produces a compiled **Canon Spec** used in all generation.

### Fields

- Name
- Tagline (used on Character Hub card)
- Bio
- Backstory
- Trait chips (primary)
- Free‑text trait overrides (optional)
- Tags

### AI Assist

Optional AI action:

- Expands / enriches bio, backstory, traits
- Never overwrites explicit user input

### Canon Spec (Auto‑Compiled)

- Read‑only, expandable block
- Generated from all Column A inputs
- Injected into all Canon and Album generations when Consistency Mode = ON

---

## Canon Anchors (3 Slots)

### Anchor Slots

1. **Face Anchor** – portrait, identity lock
2. **Body Anchor** – full body, proportion lock
3. **Style Anchor** – aesthetic reference (optional)

### Rules

- Face + Body anchors define identity
- Style anchor may be swapped without redefining character
- Anchors are stored with the Character, not Albums

---

## Column B: Preview & Image Sets

### Tabs

#### Canon

- Displays anchor images only
- Actions:
  - Set Face Anchor
  - Set Body Anchor
  - Set Style Anchor
  - Set Character Thumbnail

#### Album

- Displays persistent Album images generated in Studio or saved from Scenes
- Actions:
  - Use as Reference
  - Promote to Canon (if appropriate)
  - Delete

#### Scenes (Read‑Only)

- Displays roleplay‑generated scenes for reference
- Scenes here are ephemeral unless saved to Album

---

## Column C: Generation Driver

### Generation Target

- **Album Image** (only option in Studio)

### Reference Stack

Each reference has an explicit role:

- **Character Reference** (Face + Body anchors, default)
- **Pose / Composition Reference** (optional)
- **Style Reference** (optional)

Rules:

- Only one Character Reference allowed
- Pose + Style may stack (within model limits)

### Prompt

- Labeled: **Album Prompt**
- Describes pose, outfit, environment, framing
- Does not redefine identity

### Consistency Controls

- Consistency Mode (ON by default)
- Use Canon Anchors (ON by default)
- Variation slider

### Iteration Controls

- “Iterate from last output” toggle
- “Reset to Canon” action

### Model Behavior

- T2I default when no image references are loaded
- I2I default when any reference image is loaded
- Mode indicator shown near Generate

---

## Saving & Persistence

### Album Images

- Automatically saved to Album
- Intended for reuse and reference

### Saving Scenes to Album

- User may save a roleplay Scene into Album
- Creates a persistent Album image linked to the Character

---

## Video Generation (Studio)

- Video generation uses **I2V** only
- Starting image must be selected:
  - Canon anchor
  - Album image
  - Uploaded / library image

---

## UX Guardrails

- Studio never generates roleplay scenes
- Scene deletion does not affect Albums
- Albums persist across chats
- Canon anchors are small, deliberate, and curated

---

## Success Metrics

- Character creation completion rate
- % of characters with at least one canon anchor
- Album images per character
- % of scenes promoted to Album

---

## References

- character_research.md
- Approved Character Hub PNG
- Approved Character Studio PNG

This PRD supersedes all prior Character Studio drafts and reflects the locked v2 design.
