
---

````md
# Scenario Setup Wizard – UI Wireframe Specification

This document defines the **screen-by-screen UI wireframe logic**, state handling, and validation rules for a **Scenario Setup Wizard** used to configure role-play scenarios in a web or app-based product.

The goal is to enable designers and developers to implement the wizard **without ambiguity**.

---

## Overview

The Scenario Setup Wizard is a guided, multi-step flow that helps users configure:
- Scenario type
- Characters
- Setting and mood
- Consent and boundaries
- Interaction style
- Opening narrative hook

A live **Scenario Card Preview** updates throughout the flow.

---

## Entry Points

Users can launch the wizard from multiple locations:

- **New Session → “Start Roleplay”**
- **Prompt Bar → “Scenario Wizard” button**
- **Templates → “Use Template”**
- **Character Page → “Start Scenario with this Character”** (prefilled)

---

## Global Rules

- **Adult-only gate** must be acknowledged before continuing.
- **Consent and boundaries** are required for all scenario categories.
- A **live preview** is always visible during setup.
- Users may **save the configuration as a template** at the end (optional).

---

## Screen 0 — Mode Select (Optional)

### Goal
Allow the user to choose how they want to start.

### Layout
- Title: *“How do you want to start?”*
- Selection cards:
  1. **Wizard (guided)** – recommended
  2. **Quick Start** – minimal setup
  3. **Use Template** – prebuilt flows
  4. **Import from Last Session** – clone previous settings

### Actions
- **Continue** → routes to the appropriate flow based on selection

---

## Screen 1 — Age & Fiction Acknowledgement

### Goal
Enforce adult-only participation and fictional framing.

### UI Elements
- Required checkbox: *“All participants/characters are 18+”*
- Required checkbox: *“This is fictional role-play”*
- Optional checkbox: *“Show safety tips before starting”*
- **Continue** button is disabled until required boxes are checked

### Validation
- Block progression if either required checkbox is unchecked

---

## Screen 2 — Scenario Type

### Goal
Select the scenario category, which affects defaults in later steps.

### UI Elements
- Single-select card grid:
  - Stranger Encounter
  - Established Relationship
  - Power Dynamic (consensual)
  - Fantasy World
  - Slow Burn / Emotional Tension

Each card displays:
- Typical pacing (Slow / Medium / Fast)
- Tone range (Soft → Intense)
- Best use case (Dialogue / Story / Dynamic)

### Actions
- **Continue**
- **“Not sure?”** → opens a mini quiz modal that recommends a scenario type

### State
- `scenario.type`

---

## Screen 3 — Characters

### Goal
Define participants and their relationship.

### UI Sections

#### A. Your Role
- Optional text input: role name
- Dropdown: voice style (e.g., warm, confident, shy, playful)

#### B. Partner Role
- Choose from:
  - **Character Library** (tile selection)
  - **Quick Create** (name + up to 3 traits)

#### C. Relationship Context
Defaults based on scenario type:
- Stranger → *Just met*
- Established → *Partners*
- Power Dynamic → *Role-based dynamic*
- Fantasy → *World-dependent*
- Slow Burn → *Unspoken tension*

#### Optional
- **Add secondary character** (advanced; off by default)

### Actions
- Back
- Continue

### State
- `scenario.characters[]` (minimum of 2)
- `scenario.relationshipContext`

### Validation
- Partner role must be defined
- Relationship context must be selected

---

## Screen 4 — Setting & Atmosphere

### Goal
Define location, time, and emotional tone.

### UI Elements

#### Setting Picker (single-select + custom)
- Home
- Hotel
- Party
- Office
- Outdoors
- Fantasy location
- Custom input

#### Time of Day
- Morning
- Afternoon
- Night

#### Atmosphere Sliders (0–100)
- Romance
- Playfulness
- Tension
- Drama

#### Toggles
- *Keep it grounded / realistic*
- *Cinematic / story-driven*

#### Preview Panel
- Live-generated **non-graphic** 1–2 sentence scene opener

### State
- `scenario.setting`
- `scenario.timeOfDay`
- `scenario.atmosphere`

### Validation
- Setting is required
- Atmosphere sliders have defaults

---

## Screen 5 — Consent & Boundaries (Required)

### Goal
Allow the user to define constraints and safety controls.

### UI Elements

#### Intensity Level (radio)
- Gentle
- Moderate
- Intense

#### Pacing (radio)
- Slow burn
- Balanced
- Fast

#### Boundaries
- Hard Limits (multi-select chips + custom)
- Soft Limits (multi-select chips + custom)

#### Exit / Safe Stop
- Optional input: safe word or phrase
- Toggle: *Allow pause + redirect prompts*

### Logic by Scenario
- **Power Dynamic** scenarios require:
  - At least one hard limit
  - A safe stop OR explicit confirmation declining one (discouraged)
- Other scenarios:
  - Boundaries required
  - Safe stop optional

### State
- `scenario.intensity`
- `scenario.pacing`
- `scenario.limits.hard[]`
- `scenario.limits.soft[]`
- `scenario.safeStop`

### Validation
- Intensity and pacing are required
- At least one hard limit OR explicit “none” confirmation

---

## Screen 6 — Interaction Style

### Goal
Define how the session is written and paced.

### UI Elements

#### Perspective
- First-person (“I”)
- Third-person narrative
- Mixed (dialogue + narration)

#### Output Format Toggles
- More dialogue
- More narration
- Include inner thoughts (optional)

#### Message Length
- Short
- Medium
- Long / immersive

#### Initiator
- User initiates
- Partner initiates
- Alternating

### State
- `scenario.style.perspective`
- `scenario.style.dialogueWeight`
- `scenario.style.length`
- `scenario.initiator`

### Validation
- Perspective is required

---

## Screen 7 — Scenario Hook (First Beat)

### Goal
Define the opening narrative tension or intent.

### UI Elements

#### Hook Templates (single-select)
- A small misunderstanding
- A long-awaited reunion
- A risky secret
- A playful challenge
- A quiet confession
- Custom

#### Custom Hook
- Text area (only if “Custom” selected)

#### Optional Goal
- Reconnect
- Tease
- Resolve tension
- Explore dynamic
- Tell a story chapter

### State
- `scenario.hook`
- `scenario.goal`

### Validation
- Hook is required (template or custom)

---

## Screen 8 — Review & Start

### Goal
Confirm configuration and start the session.

### Layout

#### Left: Scenario Card Summary
- Scenario type
- Characters
- Setting
- Mood summary
- Interaction style
- Boundaries

#### Right: Advanced Options (Optional)
- Edit generated starter text
- Toggle: *Show structured prompt*
- Toggle: *Save as template* + template name

### Buttons
- Back
- **Start Session**
- *Start & Pin Settings* (reuse constraints next time)

### Output
- On start, compile a **Scenario Session Payload**

---

## Scenario Session Payload (Canonical)

```ts
type ScenarioSessionPayload = {
  type: "stranger" | "relationship" | "power_dynamic" | "fantasy" | "slow_burn";
  characters: {
    userRole?: { name?: string; traits?: string[]; voice?: string };
    partnerRole: { id?: string; name: string; traits?: string[]; voice?: string };
    extras?: Array<{ name: string; traits?: string[] }>;
  };
  relationshipContext: string;
  setting: { location: string; timeOfDay?: string; realism?: boolean; cinematic?: boolean };
  atmosphere: { romance: number; playfulness: number; tension: number; drama: number };
  consent: {
    adultOnlyConfirmed: true;
    fictionalConfirmed: true;
    intensity: "gentle" | "moderate" | "intense";
    pacing: "slow" | "balanced" | "fast";
    limits: { hard: string[]; soft: string[] };
    safeStop?: { enabled: boolean; phrase?: string };
  };
  style: {
    perspective: "first" | "third" | "mixed";
    messageLength: "short" | "medium" | "long";
    dialogueWeight: "dialogue_heavy" | "balanced" | "narration_heavy";
    innerThoughts?: boolean;
    initiator: "user" | "partner" | "alternating";
  };
  hook: { templateId?: string; customText?: string; goal?: string };
  ui: { showTips?: boolean; saveAsTemplate?: boolean; templateName?: string };
};
````

---

## UI Components (Buildable)

* `ScenarioWizardModal`
* `WizardStepHeader`
* `ScenarioTypeCardGrid`
* `CharacterPicker`
* `AtmosphereSliders`
* `BoundariesChips`
* `InteractionStyleSelector`
* `HookTemplatePicker`
* `ScenarioPreviewCard`
* `StartSessionCTA`

---

## Validation & Guardrails Summary

* Adult-only + fictional acknowledgement required
* Required fields:

  * Scenario type
  * Characters
  * Setting
  * Intensity
  * Pacing
  * Hook
* Power dynamic scenarios enforce stricter safety controls
* In-session UI must always include **Edit / Reset / Exit**

---

## Quick Start (Single-Screen Flow)

If **Quick Start** is selected:

* Scenario type
* Partner role
* Setting
* Intensity + pacing
* One hard limit
* Start session

All other values use safe defaults.

---

## Next Possible Extensions

* Figma-ready wireframes
* Prompt compiler logic
* Lovable.dev implementation plan (routes, state machine, schemas)
* Scenario analytics & template versioning

```

---
