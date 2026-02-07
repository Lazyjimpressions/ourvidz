# Character System PRD

## Overview

This PRD defines requirements for two core surfaces in OurVidz:

1. **Character Hub** – character library and creation entry point
2. **Character Studio** – character editor and generation workspace

These designs are visually anchored by the approved reference PNGs and are intended to be implemented using Cursor + Antigravity, integrated with existing OurVidz generation workflows.

---

## Goals

- Make characters first‑class, reusable assets
- Enable visual consistency across images and video
- Support both fast creation and deep control
- Cleanly separate **identity definition** from **scene prompting**

---

## Non‑Goals

- No redesign of underlying generation models
- No requirement for training custom models
- No mandatory roleplay/chat system (future‑ready, not required for v1)

---

# 1. Character Hub PRD

## Purpose

The Character Hub is the primary landing page for managing characters. It answers:
> “Who are my characters, and what can I do with them?”

---

## Core Features

### Character Grid

- Card‑based grid layout
- Each card displays:
  - Character thumbnail
  - Name
  - Short role/tagline
  - Tags (genre, style)

### Card Actions

- Open (Character Studio)
- Generate Image
- Generate Video
- Overflow menu:
  - Duplicate
  - Delete
  - Export (future)

---

## Create Character Entry

### Primary CTA

- **Create Character** (top‑right)

### Creation Choice Panel

User must choose one:

1. **Start from Images** (recommended for consistency)
2. **Start from Description** (fastest)

This choice determines the initial state of Character Studio but results in the same unified character object.

---

## Filters & Search

- Text search by name/tag
- Filter chips:
  - Genre (Fantasy, Sci‑Fi, Modern, etc.)
  - Media readiness (Image, Video‑ready)

---

## Empty State

- Educational empty state explaining benefits of characters
- Prominent Create Character CTA

---

# 2. Character Studio PRD

## Purpose

The Character Studio is a dedicated editor where users:

- Define and modify character identity
- Generate and review outputs
- Control consistency and variation

---

## Page Layout (Approved)

**Three‑column studio layout**

### Column A – Left Editor Pane

- Fixed width
- Contains character metadata and configuration
- Tabbed interface:
  1. Identity
  2. Appearance
  3. Style
  4. Media

### Column B – Preview & History

- Large main preview area
- Mode toggles: Single / Grid / Compare
- Media toggle: Image / Video / Avatar
- Character history strip with thumbnails

### Column C – Prompt & Generate Panel

- Scene prompt textarea
- Quick prompt chips
- Consistency controls
- Generate actions
- Advanced settings (collapsed)

---

## Tab Specifications

### Identity Tab

**Purpose:** Define who the character is

Fields:

- Name (required)
- Role / Tagline
- Short bio
- Tags

Optional:

- Personality sliders
- Tone/voice notes
- Guardrails (must‑keep / avoid traits)

---

### Appearance Tab

**Purpose:** Define physical consistency

Sections:

- Physical traits (age bracket, hair, eyes, etc.)
- Outfit defaults and signature items
- Anchor manager:
  - Upload images
  - Select Primary Anchor
  - Replace anchor

---

### Style Tab

**Purpose:** Control rendering and aesthetic

Sections:

- Style presets (realistic, anime, cinematic, etc.)
- Lighting and mood chips
- Rendering rules (sharpness, grain, texture)

---

### Media Tab

**Purpose:** Downstream behavior and defaults

Sections:

- Video framing defaults
- Motion intensity
- Loop‑safe toggle
- Voice selection (optional)
- Roleplay behavior notes (optional)

---

## Prompt & Generation

### Prompt Location

- Prompt bar lives **in the right column**, fixed while scrolling
- Prompt describes the **scene**, not the character

### Controls

- Consistency Mode toggle
- Use Pinned Canon toggle
- Variation slider (low → high)

### Actions

- Generate
- Generate Batch
- Restyle Grid

---

## New vs Existing Character UX

### New Character

- First‑run flow after creation choice
- Minimal required inputs (name + description)
- Studio opens with empty preview and guided CTA
- Consistency ON but warns if no anchor exists

### Existing Character

- Loads saved data, pinned canon, and history
- Changes are staged until Save
- Generating with unsaved edits is allowed with visual warning

---

## State & Persistence

- Characters are versioned entities
- Outputs can be attached to character history
- Users can pin canon outputs

---

## Success Metrics

- % of users creating at least one character
- Repeat usage of characters across generations
- Reduction in prompt duplication
- Increased consistency satisfaction

---

## References

- Character Hub PNG (approved)
- Character Studio PNG (approved)
- character_research.md

These documents together define the locked‑in direction for character functionality in OurVidz.
