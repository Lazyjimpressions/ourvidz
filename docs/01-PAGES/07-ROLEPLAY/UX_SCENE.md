# Roleplay Scene UX Specification

**Document Version:** 2.0
**Last Updated:** January 10, 2026
**Status:** Active
**Author:** AI Assistant
**Page:** `/roleplay/chat/:characterId` (modal-based)
**Components:** `SceneCreationModal.tsx`, `SceneGallery.tsx`, `SceneSetupSheet.tsx`

---

## Purpose

Scene templates provide context, setting, and conversation starters for roleplay interactions. Scenes are **character-agnostic** - users select a scene template and THEN choose which character(s) to use with it.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      scenes table                               │
│  (THE source for Scene Gallery - agnostic templates)            │
│  ───────────────────────────────────────────────────            │
│  • System templates: creator_id = NULL, is_public = true        │
│  • User templates: creator_id = user.id, is_public = true/false │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    User starts roleplay
                    (picks scene → picks character)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  character_scenes table                          │
│  (Conversation image artifacts ONLY - not templates)             │
│  ───────────────────────────────────────────────────             │
│  • Tracks generated scene images during conversation             │
│  • Used for scene continuity (I2I generation)                    │
│  • NOT for template storage                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Scene Types

| Type | Table | Visibility | Purpose |
|------|-------|------------|---------|
| **System Template** | `scenes` | Public (creator_id = NULL) | Pre-built scenario templates |
| **User Template** | `scenes` | Public or Private | User-created agnostic scenes |
| **Conversation Image** | `character_scenes` | N/A (artifacts) | Generated images during chat |

---

## Entry Points

| Trigger | Location | Opens |
|---------|----------|-------|
| "+ Create Scene" button | Scene Gallery section | `SceneCreationModal` |
| Scene template card | Dashboard gallery | `SceneSetupSheet` |
| Edit button on scene | Scene Gallery (user's scenes) | `SceneCreationModal` (edit mode) |

---

## SceneCreationModal

Unified modal for creating AND editing scene templates. Character-agnostic - no character selection in this modal.

### Layout Structure

```
┌─────────────────────────────────────┐
│  Dialog Header                      │
│  "Create Scene Template"     [X]    │
├─────────────────────────────────────┤
│                                     │
│  Scene Name: *                      │
│  [________________________]         │
│                                     │
│  Scenario Type:                     │
│  [stranger | relationship | ...]    │
│                                     │
│  Scene Description:                 │
│  [________________________]         │
│  [________________________]         │
│                                     │
│  Scene Prompt: * (for images)       │
│  [________________________]         │
│  [________________________]         │
│  [________________________]         │
│                                     │
│  [Enhance ✨] [Undo ↩]              │
│                                     │
│  Conversation Starters:             │
│  [________________________]         │
│  (one per line)                     │
│                                     │
│  Content Rating:                    │
│  ( ) SFW   (•) NSFW                 │
│                                     │
│  Visibility:                        │
│  [x] Make Public                    │
│                                     │
├─────────────────────────────────────┤
│                   [Cancel] [Create] │
└─────────────────────────────────────┘
```

### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Scene Name | Text | Yes | Display name (2-100 chars) |
| Scenario Type | Select | No | Category (stranger, relationship, fantasy, etc.) |
| Scene Description | Textarea | No | User-facing context |
| Scene Prompt | Textarea | Yes | Prompt for image generation (10-2000 chars) |
| Conversation Starters | Multi-line | No | One starter per line, stored as array |
| Content Rating | Radio | Yes | SFW or NSFW |
| Make Public | Checkbox | No | Whether others can see/use this scene |

### Prompt Enhancement

| Button | Action |
|--------|--------|
| Enhance | Calls `useScenePromptEnhancement` to improve prompt |
| Undo | Restores original prompt before enhancement |

### Creation Flow

1. User clicks "+ Create Scene" in Scene Gallery section
2. Fills in scene name and prompt (required)
3. Optionally: set type, description, starters, rating
4. Optionally: click "Enhance" to improve prompt
5. Click "Create"
6. Scene saved to `scenes` table with `creator_id = user.id`
7. `onSceneCreated` callback with scene ID
8. Scene appears in user's gallery section

### Edit Mode

When editing an existing scene:
- Modal title changes to "Edit Scene Template"
- Form pre-populated with existing values
- Save button instead of Create
- Only owner (creator_id = user.id) or admin can edit

### Permissions

```typescript
const isOwner = user.id === scene.creator_id;
const isAdmin = userRole === 'admin';
const canEdit = isOwner || isAdmin;
```

---

## SceneGallery

Dashboard section displaying scene templates from `scenes` table.

### Layout (Dashboard)

```
┌─────────────────────────────────────────────────────────────┐
│  Scene Gallery                    [+ Create]     [View All] │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│  │ Scene 1 │ │ Scene 2 │ │ Scene 3 │ │ Scene 4 │ │ Scene 5 ││
│  │ [Image] │ │ [Image] │ │ [Image] │ │ [Image] │ │ [Image] ││
│  │ Name    │ │ Name    │ │ Name    │ │ Name    │ │ Name    ││
│  │ Type    │ │ Type    │ │ Type    │ │ Type    │ │ Type    ││
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘│
│  ← Horizontal scroll →                                       │
└─────────────────────────────────────────────────────────────┘
```

### Data Source

```typescript
// useSceneGallery queries `scenes` table
const { scenes } = useSceneGallery(filter, limit);
// Shows: public scenes (is_public = true) + user's private scenes (creator_id = user.id)
```

### Scene Template Card

| Element | Content |
|---------|---------|
| Image | Scene preview (1:1 ratio) from `preview_image_url` |
| Name | Scene title |
| Type | Scenario type badge (stranger, relationship, fantasy, etc.) |
| Usage count | Optional popularity indicator |
| Edit icon | Shown on user's own scenes (hover) |

### Interaction

| Gesture | Action |
|---------|--------|
| Tap card | Open `SceneSetupSheet` |
| Tap edit icon | Open `SceneCreationModal` in edit mode |
| Swipe | Horizontal scroll |
| Tap "+ Create" | Open `SceneCreationModal` |

---

## SceneSetupSheet

Bottom sheet for configuring scene template before starting chat. This is where character selection happens.

### Layout

```
┌─────────────────────────────────────┐
│  ═══════════════════════════        │ ← Drag handle
│                                     │
│  [Scene Image - Full Width]         │
│                                     │
│  Scene Name                         │
│  Scene description text here...     │
│                                     │
│  Conversation Starters:             │
│  "Hey, I noticed you..."            │
│  "What brings you here?"            │
│                                     │
│  ─────────────────────────          │
│                                     │
│  Select Character:                  │
│  [Primary Character    v]           │
│                                     │
│  Your Role: (optional)              │
│  [________________________]         │
│                                     │
│  [Start Roleplay]                   │
│                                     │
└─────────────────────────────────────┘
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Primary Character | Select | Yes | Character from user's library or public |
| Your Role | Text | No | User's role in the scene |

### Start Flow

1. User taps scene card in gallery
2. `SceneSetupSheet` opens with scene details
3. User selects character(s)
4. Optionally defines their role
5. Taps "Start Roleplay"
6. Navigate to `/roleplay/chat/:characterId?scene=:sceneId`
7. Scene prompt and starters passed to chat context

---

## Data Flow

### Create Scene Template
1. User clicks "+ Create Scene" in Scene Gallery
2. `SceneCreationModal` opens
3. Fills required fields (name, prompt)
4. Optional: enhance prompt, set visibility, content rating
5. Click "Create"
6. Insert into `scenes` table with `creator_id = user.id`
7. Scene appears in gallery

### Use Scene Template
1. User taps scene card in Scene Gallery
2. `SceneSetupSheet` opens with scene details
3. User selects character(s) from dropdown
4. Optionally sets their role
5. Click "Start Roleplay"
6. `scenes.usage_count` incremented
7. Navigate to `/roleplay/chat/:characterId?scene=:sceneId`
8. Scene context (prompt, starters) passed to chat

### Scene in Conversation
1. Scene template context passed to `roleplay-chat` edge function
2. Scene prompt used for image generation
3. Conversation starters offered as suggestions
4. Generated images stored in `character_scenes` table (artifacts)

### Scene Continuity (I2I)
1. Image generated → stored in `character_scenes` with `conversation_id`
2. `useSceneContinuity` tracks `previous_scene_id` and `previous_scene_image_url`
3. Next generation uses previous image for I2I consistency

---

## Database Schema

### scenes Table (Templates)

Primary table for scene templates shown in Scene Gallery.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | Text | Required display name |
| description | Text | User-facing context |
| creator_id | UUID | FK to auth.users (NULL = system template) |
| scenario_type | Text | Category (stranger, relationship, fantasy, etc.) |
| setting | Text | Location description |
| atmosphere | JSONB | Mood sliders (drama, romance, tension, playfulness) |
| time_of_day | Text | Time context |
| min_characters | Int | Minimum characters (default: 1) |
| max_characters | Int | Maximum characters (default: 2) |
| suggested_user_role | Text | Suggested role for user |
| content_rating | Text | 'sfw' or 'nsfw' (default: 'sfw') |
| tags | Text[] | Searchable tags |
| is_public | Boolean | Visibility (default: true) |
| usage_count | Int | Popularity metric |
| preview_image_url | Text | Gallery thumbnail |
| scene_prompt | Text | Prompt for image generation |
| scene_starters | Text[] | Conversation opener suggestions |
| created_at | Timestamp | Creation time |
| updated_at | Timestamp | Last update |

### character_scenes Table (Conversation Artifacts)

Stores generated scene images during conversations. NOT for templates.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | FK to conversations (required for artifacts) |
| character_id | UUID | FK to characters |
| scene_prompt | Text | Prompt used for this specific generation |
| image_url | Text | Generated scene image URL |
| job_id | UUID | FK to generation_jobs |
| generation_metadata | JSONB | Model, settings, parameters used |
| generation_mode | Text | 't2i' or 'i2i' |
| previous_scene_id | UUID | FK to previous scene (for continuity) |
| previous_scene_image_url | Text | Reference image URL (for I2I) |
| created_at | Timestamp | Creation time |
| updated_at | Timestamp | Last update |

**Deprecated columns** (to be removed in future migration):
- scene_name, scene_description, scene_rules, scene_starters, system_prompt, priority, scene_type

These were used when `character_scenes` was overloaded for both templates and artifacts. Templates now belong exclusively in `scenes` table.

---

## Validation Rules

| Field | Rule | Error |
|-------|------|-------|
| Scene Name | Required, 2-100 chars | "Scene name is required" |
| Scene Prompt | Required, 10-2000 chars | "Scene prompt is required" |
| Priority | 0-100 integer | "Priority must be 0-100" |

---

## Loading States

| State | UI |
|-------|-----|
| Gallery loading | Skeleton cards |
| Creating scene | Button spinner |
| Enhancing prompt | Button spinner + toast |
| Saving edits | Button disabled + spinner |

---

## Error Handling

| Error | Response |
|-------|----------|
| Create failed | Toast with error, keep modal open |
| Enhance failed | Toast, keep original prompt |
| Load scenes failed | Error state in drawer |
| Permission denied | Toast, close modal |

---

## Related Components

| Component | Purpose | Status |
|-----------|---------|--------|
| `SceneCreationModal` | Create/edit scene templates | Primary (unified) |
| `SceneGallery` | Display scene templates grid | Active |
| `SceneSetupSheet` | Configure scene before starting chat | Active |
| `SceneTemplateCard` | Individual gallery card | Active |
| `SceneCard` | Scene display in chat messages | Active |
| `SceneDebugPanel` | Development debugging | Dev only |
| `SceneGenerationModal` | Character-specific scene creation | **Deprecated** |
| `ScenarioSetupWizard` | Multi-step scenario wizard | **Deprecated** |
| `SceneEditModal` | Edit character scenes | **Deprecated** |

### Deprecated Components Migration

| Old Component | Replace With |
|---------------|--------------|
| `SceneGenerationModal` | `SceneCreationModal` |
| `ScenarioSetupWizard` | `SceneCreationModal` + `SceneSetupSheet` |
| `SceneEditModal` | `SceneCreationModal` (edit mode) |

---

## Related Hooks

| Hook | Purpose |
|------|---------|
| `useSceneGallery` | Fetch scene templates from `scenes` table |
| `useSceneContinuity` | Track previous scene for I2I generation |
| `useScenePromptEnhancement` | Enhance scene prompts with AI |

---

---

## Multi-Reference Scene Generation

### Overview

For `both_characters` scene style, the system uses **multi-reference composition** with Seedream v4.5/edit to combine:
- Scene environment (Figure 1)
- AI character appearance (Figure 2)
- User character appearance (Figure 3)

### Requirements

| Component | Required | Source |
|-----------|----------|--------|
| Scene preview_image_url | **YES** | scenes.preview_image_url |
| Character reference_image_url | **YES** | characters.reference_image_url |
| User character reference_image_url | **YES** | characters.reference_image_url |

### Scene Style Options

| Style | References | Description |
|-------|------------|-------------|
| character_only | 2 | Scene + AI character |
| pov | 2 | Scene + AI character (first-person view) |
| both_characters | 3 | Scene + AI character + User character |

### UI Validation

The `both_characters` option is **disabled** in QuickSettingsDrawer if:
- User has not set a reference image for their character
- A toast notification explains the requirement

```typescript
// QuickSettingsDrawer validation
const canUseBothCharacters = useMemo(() => {
  return (
    character?.reference_image_url &&
    userCharacter?.reference_image_url
  );
}, [character, userCharacter]);
```

### Prompt Construction (Figure Notation)

```typescript
prompt: `
In the setting from Figure 1, show two people together.

SCENE (from Figure 1): ${sceneDescription}

CHARACTER 1 - AI CHARACTER (from Figure 2): ${characterVisual}

CHARACTER 2 - USER (from Figure 3): ${userCharacterVisual}

ACTION: ${action}

RULES:
- Maintain environment from Figure 1
- Preserve Character 1's appearance from Figure 2
- Preserve Character 2's appearance from Figure 3
`
```

### API Structure

```typescript
// v4.5/edit API call
{
  prompt: "In the setting from Figure 1...",
  image_urls: [
    scene.preview_image_url,           // Figure 1
    character.reference_image_url,      // Figure 2
    userCharacter.reference_image_url   // Figure 3
  ],
  enable_safety_checker: false
}
```

---

## Related Docs

- [PURPOSE.md](./PURPOSE.md) - Business requirements
- [UX_CHAT.md](./UX_CHAT.md) - Chat interface
- [UX_CHARACTER.md](./UX_CHARACTER.md) - Character creation
- [UX_DASHBOARD.md](./UX_DASHBOARD.md) - Dashboard layout
- [../../03-SYSTEMS/PROMPTING_SYSTEM.md](../../03-SYSTEMS/PROMPTING_SYSTEM.md) - Prompt templates
- [../../09-REFERENCE/FAL_AI_SEEDREAM_DEFINITIVE.md](../../09-REFERENCE/FAL_AI_SEEDREAM_DEFINITIVE.md) - Seedream API reference
- [../../09-REFERENCE/ROLEPLAY_SCENE_GENERATION.md](../../09-REFERENCE/ROLEPLAY_SCENE_GENERATION.md) - Scene generation workflow
