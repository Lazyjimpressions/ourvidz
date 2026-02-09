# Character Hub & Studio V2 Implementation Summary

For the full phased plan see [implementation_plan_merged.md](implementation_plan_merged.md).

## 1. Executive Summary

This document summarizes the current state of the **Character Hub** and **Character Studio V2** implementation. The initiative shifts the user experience from one-off prompts to a **character-centric model**, where characters are persistent assets with defined identities, consistent visual anchors, and reusable data.

The implementation follows the [Character System PRD](character_prd.md) and aligns with the visual direction established in [character_research.md](character_research.md) and reference design [character_studio.png](character_studio.png).

## 2. Implementation Status

### ✅ Completed Components

#### A. Character Hub V2 (`/character-hub-v2`)

The central library for managing character assets.

- **Grid Layout**: Responsive card-based grid displaying character thumbnails, names, and roles.
- **Filtering**: Sidebar filters for Search, Genre, and Content Rating.
- **Card Actions**:
  - **Quick Actions**: Edit (opens Studio), **Generate Image** (opens Studio V2 prompt panel), Duplicate, Delete.
  - **Context**: Differentiates between User personas and AI Characters.
- **Creation Flow**: "Create Character" CTA leads directly to Studio V2.

#### B. Character Studio V2 (`/character-studio-v2`)

A dedicated, professional-grade editor for character definition and generation.

- **Three-Column Layout** (corrected per reference design):
  1. **Column A (Left - Configuration)**: Tabbed interface for deep character customization.
  2. **Column B (Center - Preview + Media Strip)**: Large preview canvas with media strip below showing Canon/Album/Scenes tabs.
  3. **Column C (Right - Prompt)**: Generation prompt bar with consistency controls.

- **Tab System (Column A)**:
  - **Identity Tab**: Name, Tagline, Bio, Role, Personality Sliders, Visual Guardrails (locked/avoid traits), and auto-generated **Canon Spec** preview.
  - **Appearance Tab**: Physical traits (age, body, hair), **Typed Anchor Slots** (Face/Body/Style).
  - **Style Tab**: Art style presets (Realistic, Anime, Cinematic, etc.).
  - **Media Tab**: Video defaults (aspect ratio, framing, motion intensity).

- **Media Strip (Column B)** - `CharacterMediaStrip` component with three tabs:
  - **Canon Tab**: Shows pinned canonical portraits from `character_portraits` table (official character looks).
  - **Album Tab**: Shows saved images from `user_library` filtered by `roleplay_metadata.character_id` (permanent, visible in Library page).
  - **Scenes Tab**: Shows generation history from `character_scenes` table (ephemeral, can be cleaned up).

- **State Management**:
  - **`useCharacterStudioV2` Hook**: Centralized state logic handling form data, tabs, typed anchor uploads, and database synchronization.
  - **`usePortraitVersions` Hook**: Manages Canon (character_portraits) CRUD with real-time subscriptions.
  - **`useCharacterAlbum` Hook**: Manages Album queries and save-to-album action.
  - **Supabase Integration**: Seamless fetching and saving to `characters`, `character_anchors`, `character_portraits`, and `user_library` tables.

### Recent Updates (2026-02-08)

#### Three Workflow Architecture

The studio now supports three distinct workflows:

1. **Create New Character**: Define identity in Column A, generate portrait in Visuals Tab, pin to Canon, set as Primary.
2. **Edit Existing Character**: Modify identity fields, manage canon images, regenerate portraits.
3. **Album Image Generation**: With character "locked" via Canon, use Column C anchor slots for i2i outfit/pose variations.

#### Column C Anchor Reference Panel

- **AnchorReferencePanel Component**: New session-based anchor input panel in Column C above prompt bar.
- **Three Slots**: Face, Body, Style - each can be filled from:
  - Upload File
  - From Library
  - From References (character_anchors)
  - From Canon (character_portraits)
- **Session-Based**: Anchor references are ephemeral generation inputs, not persisted per-generation.
- **Auto-i2i Mode**: Setting anchors automatically enables i2i generation - no toggle needed.

#### Visuals Tab (Replaces Appearance Tab)

- **Portrait Generation**: Built-in AI portrait generation using fal-image edge function.
- **Image Upload**: File upload + Library picker for reference images.
- **AI Suggestions**: SuggestButton for AI-generated physical trait suggestions.
- **Physical Traits**: Age, ethnicity, hair, eyes, body type, distinguishing features.
- **Outfit & Items**: Default outfit description and signature items.

#### Simplified Prompt Bar

- **Consistency Toggle Removed**: Anchors in Column C imply i2i mode automatically.
- **Anchor Status Display**: Shows which reference anchors are set (Face/Body/Style).
- **Variation Slider**: Controls i2i strength (Strict 0% to Creative 100%).

#### Media Strip Reference Actions

- **Use as Reference**: Right-click any image in Canon/Album/Scenes tabs to use as Face/Body/Style reference.
- **Copies to Column C**: Selected images populate the AnchorReferencePanel slots.
- **Quick Workflow**: Generate scene, right-click, "Use as Face Reference" to lock identity for next generation.

#### Previous Updates

##### Layout Correction

- **Media Strip Location**: Moved to Column B under preview canvas per reference design.
- **CharacterMediaStrip**: Canon | Album | Scenes tabs.

##### Canon Spec Auto-Generation

- **canonSpecBuilder Utility**: Compiles identity fields into structured generation prompt.
- **IdentityTab Display**: Collapsible Canon Spec preview with copy-to-clipboard.

##### Album System

- **Save to Album Action**: Copies image to `user-library` bucket.
- **useCharacterAlbum Hook**: Manages album with `roleplay_metadata.character_id` filter.

##### Pin to Canon Action

- **Workflow**: Scene → "Pin to Canon" → creates `character_portraits` record.

### Database Schema Updates

Added columns to `characters` table:

- `tagline` (text)
- `bio` (text)
- `backstory` (text)
- `lighting` (text, default: 'natural')
- `rendering_rules` (jsonb)
- `avoid_traits` (text[])
- `signature_items` (text)
- `canon_spec` (text)

Added column to `character_anchors` table:

- `anchor_type` (text, CHECK constraint: 'face' | 'body' | 'style')

### Verification Checklist

**Layout & Navigation**

- [ ] Three-column layout displays correctly (Column A/B/C)
- [ ] Media strip appears under preview canvas in Column B
- [ ] Canon/Album/Scenes tabs switch content correctly
- [ ] Visuals tab shows portrait generation + physical traits

**Column C Anchor Panel**

- [ ] Face/Body/Style anchor slots display in Column C
- [ ] Can set anchor from file upload
- [ ] Can set anchor from Library picker
- [ ] Can set anchor from Canon portraits dropdown
- [ ] Clearing anchor removes it from slot

**Portrait Generation (Visuals Tab)**

- [ ] AI Generate Portrait creates image from description
- [ ] Upload file sets portrait image
- [ ] Library picker sets portrait image
- [ ] AI Suggestions populate physical traits

**Media Strip Actions**

- [ ] "Use as Face/Body/Style Reference" sets Column C anchor slot
- [ ] "Save to Album" copies scene to user_library
- [ ] "Pin to Canon" creates character_portrait record
- [ ] "Set as Primary" updates character.image_url

**Generation Flow**

- [ ] Generation uses anchor refs when set (i2i mode)
- [ ] Generation works without anchors (t2i mode)
- [ ] Variation slider affects i2i strength
- [ ] Results appear in Scenes tab

**Full Workflow**

- [ ] Create: Hub → New → Identity → Visuals → Generate → Pin to Canon → Save
- [ ] Edit: Hub → Character → Edit Identity → Regenerate → Save
- [ ] Album: Set anchors → Prompt outfit/pose → Generate → Save to Album

## 3. Workflow & UX Design

The system implements a clear **Define → Customize → Generate → Curate** workflow:

1. **Discovery (Hub)**: Users find existing characters or start new ones.
2. **Definition (Studio - Column A)**:
    - Users define **Identity** (Who they are) with auto-generated Canon Spec.
    - Users define **Appearance** with typed anchor slots (Face/Body/Style).
3. **Visualization (Studio - Column B)**:
    - Users iterate on the character's look using the **Preview** canvas.
    - **Media Strip** shows Canon/Album/Scenes for quick reference.
4. **Generation (Studio - Column C)**:
    - Users enter scene prompts with Consistency Controls.
    - Canon Spec automatically enhances prompts when Consistency Mode is ON.
5. **Curation (Media Strip Actions)**:
    - **Pin to Canon**: Save as official character look.
    - **Save to Album**: Save to permanent library collection.

### Key UX Decisions

- **Separation of Concerns**: Character data (Identity/Appearance) is distinct from Scene data (Prompts).
- **Three-Tier Asset System**:
  - **Canon** (character_portraits): Official, pinned looks
  - **Album** (user_library): Curated permanent collection
  - **Scenes** (character_scenes): Ephemeral generation history
- **Typed Anchors**: Face/Body/Style slots enable precise consistency control.
- **Auto-Generated Canon Spec**: Identity fields compile to structured prompt automatically.
- **Progressive Disclosure**: Advanced settings (Media defaults, detailed physical traits) organized in tabs.

## 4. Technical Architecture

### Database Tables

| Table | Purpose | Persistence |
|-------|---------|-------------|
| `characters` | Core character identity and settings | Permanent |
| `character_anchors` | Typed consistency references (Face/Body/Style) | Permanent |
| `character_portraits` | **Canon** - Official pinned looks | Permanent |
| `user_library` | **Album** - Curated images (filtered by `roleplay_metadata.character_id`) | Permanent |
| `character_scenes` | **Scenes** - Generation history | Ephemeral |

### Storage Buckets

| Bucket | Purpose |
|--------|---------|
| `user-library` | Permanent storage for Canon, Album, and Anchor images |
| `workspace-temp` | Temporary storage for Scene generation history |

### Key Components

| Component | Purpose |
|-----------|---------|
| `CharacterStudioV2.tsx` | Main page with three-column layout |
| `CharacterMediaStrip.tsx` | Tab-based Canon/Album/Scenes strip in Column B |
| `AnchorReferencePanel.tsx` | Session-based Face/Body/Style anchor slots in Column C |
| `VisualsTab.tsx` | Portrait generation, physical traits, outfit/items |
| `IdentityTab.tsx` | Identity form with Canon Spec preview |
| `CharacterStudioPromptBarV2.tsx` | Generation prompt bar with anchor status |
| `SuggestButton.tsx` | AI suggestion button for character fields |

### Key Hooks

| Hook | Purpose |
|------|---------|
| `useCharacterStudioV2` | Main state management for studio |
| `usePortraitVersions` | Canon (character_portraits) CRUD |
| `useCharacterAlbum` | Album (user_library) queries and save |

### Key Services

| Service | Purpose |
|---------|---------|
| `CharacterServiceV2` | Generation with canon spec injection |
| `canonSpecBuilder` | Identity → prompt compilation |

### Routing

- `/character-hub-v2` - Character library/browser
- `/character-studio-v2/:id` - Edit existing character
- `/character-studio-v2/new` - Create new character

---
**Last Updated**: 2026-02-08
**Author**: Antigravity (Assistant)

For detailed implementation plan, see [linear-nibbling-ladybug.md](/.claude/plans/linear-nibbling-ladybug.md).
