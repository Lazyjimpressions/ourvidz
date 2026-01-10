# Roleplay Scene UX Specification

**Document Version:** 1.0
**Last Updated:** January 10, 2026
**Status:** Active
**Author:** AI Assistant
**Page:** `/roleplay/chat/:characterId` (modal-based)
**Components:** `SceneGenerationModal.tsx`, `SceneEditModal.tsx`, `SceneGallery.tsx`

---

## Purpose

Scene creation and management interface for roleplay conversations. Scenes provide context, setting, and conversation starters for character interactions. Supports both user-created scenes and system templates.

---

## Scene Types

| Type | Source | Purpose |
|------|--------|---------|
| **Character Scene** | User-created | Custom scene for specific character |
| **Template Scene** | System gallery | Pre-built scenario templates |
| **Generated Scene** | AI-generated | Scene created during conversation |

---

## Entry Points

| Trigger | Location | Opens |
|---------|----------|-------|
| "Create Scene" button | Character info drawer | `SceneGenerationModal` |
| Scene template card | Dashboard gallery | `SceneSetupSheet` |
| Edit button on scene | Character info drawer | `SceneEditModal` |
| Scene card in chat | Chat message | Scene details popover |

---

## SceneGenerationModal

### Layout Structure

```
┌─────────────────────────────────────┐
│  Dialog Header                      │
│  "Create New Scene"          [X]    │
├─────────────────────────────────────┤
│                                     │
│  Scene Name: *                      │
│  [________________________]         │
│                                     │
│  Scene Description:                 │
│  [________________________]         │
│  [________________________]         │
│                                     │
│  Scene Prompt: *                    │
│  [________________________]         │
│  [________________________]         │
│  [________________________]         │
│                                     │
│  [Enhance ✨] [Undo ↩]              │
│                                     │
│  Characters:                        │
│  AI Character 1: [Select v]         │
│  AI Character 2: [Select v]         │
│  [ ] Include Narrator               │
│                                     │
├─────────────────────────────────────┤
│                   [Cancel] [Create] │
└─────────────────────────────────────┘
```

### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Scene Name | Text | Yes | Display name for the scene |
| Scene Description | Textarea | No | Context shown to user |
| Scene Prompt | Textarea | Yes | Prompt for scene generation |
| AI Character 1 | Select | No | Primary character in scene |
| AI Character 2 | Select | No | Secondary character (optional) |
| Include Narrator | Checkbox | No | Adds narrator voice to scene |

### Prompt Enhancement

| Button | Action |
|--------|--------|
| Enhance | Calls `useScenePromptEnhancement` to improve prompt |
| Undo | Restores original prompt before enhancement |

### Character Selection

- Dropdown populated from `usePublicCharacters` + `useUserCharacters`
- Deduplicates characters by ID
- Shows character name and avatar
- "None" option available

### Creation Flow

1. User opens modal from character info drawer
2. Fills in scene name and prompt (required)
3. Optionally: describe scene, select characters
4. Optionally: click "Enhance" to improve prompt
5. Click "Create"
6. `useSceneNarrative.generateSceneNarrative()` called
7. Scene saved to `character_scenes` table
8. `onSceneCreated` callback with scene ID
9. Parent auto-navigates to chat with new scene

---

## SceneEditModal

### Layout Structure

```
┌─────────────────────────────────────┐
│  Dialog Header                      │
│  "Edit Scene"                [X]    │
├─────────────────────────────────────┤
│                                     │
│  Scene Name: *                      │
│  [________________________]         │
│                                     │
│  Scene Description:                 │
│  [________________________]         │
│                                     │
│  Scene Prompt: *                    │
│  [________________________]         │
│  [________________________]         │
│                                     │
│  Scene Rules:                       │
│  [________________________]         │
│                                     │
│  Conversation Starters:             │
│  [________________________]         │
│  (one per line)                     │
│                                     │
│  System Prompt Override:            │
│  [________________________]         │
│                                     │
│  Priority: [0-100]                  │
│                                     │
├─────────────────────────────────────┤
│                     [Cancel] [Save] │
└─────────────────────────────────────┘
```

### Form Fields

| Field | Type | Description |
|-------|------|-------------|
| Scene Name | Text | Required display name |
| Scene Description | Textarea | User-facing context |
| Scene Prompt | Textarea | Required prompt for image generation |
| Scene Rules | Textarea | Behavior constraints for scene |
| Conversation Starters | Multi-line | One starter per line, converted to array |
| System Prompt | Textarea | Override default system prompt |
| Priority | Number | 0-100, higher = shown first |

### Permissions

```typescript
const isOwner = user.id === scene.character.user_id;
const isAdmin = userRole === 'admin';
const canEdit = isOwner || isAdmin;
```

---

## SceneGallery

### Layout (Dashboard)

```
┌─────────────────────────────────────────────────┐
│  Scene Templates                     [View All] │
├─────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│  │ Scene 1 │ │ Scene 2 │ │ Scene 3 │ │ Scene 4 ││
│  │ [Image] │ │ [Image] │ │ [Image] │ │ [Image] ││
│  │ Name    │ │ Name    │ │ Name    │ │ Name    ││
│  │ Type    │ │ Type    │ │ Type    │ │ Type    ││
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘│
│  ← Horizontal scroll →                          │
└─────────────────────────────────────────────────┘
```

### Scene Template Card

| Element | Content |
|---------|---------|
| Image | Scene preview (1:1 ratio) |
| Name | Scene title |
| Type | Scenario type badge |
| Usage count | Optional popularity indicator |

### Interaction

| Gesture | Action |
|---------|--------|
| Tap card | Open `SceneSetupSheet` |
| Swipe | Horizontal scroll |

---

## SceneSetupSheet

Bottom sheet for configuring scene template before starting chat.

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
│  Select Character:                  │
│  [Primary Character    v]           │
│                                     │
│  Your Role:                         │
│  [________________________]         │
│                                     │
│  [Start Roleplay]                   │
│                                     │
└─────────────────────────────────────┘
```

### Fields

| Field | Type | Required |
|-------|------|----------|
| Primary Character | Select | Yes |
| Secondary Character | Select | No |
| Your Role | Text | No |

---

## Scene Display in Chat

### Character Info Drawer - Scene List

```
┌─────────────────────────────────────┐
│  Scenes                  [+ Create] │
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐│
│  │ [Thumb] Scene Name         [Ed] ││
│  │         Scene description...    ││
│  │         [Expand ▼]              ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ [Thumb] Scene Name 2       [Ed] ││
│  │         ...                     ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### Scene Card States

| State | UI |
|-------|-----|
| Collapsed | Name + truncated description |
| Expanded | Full prompt visible |
| Selected | Highlighted border |
| Has Image | Thumbnail shown |

---

## Data Flow

### Create Scene
1. User opens `SceneGenerationModal`
2. Fills required fields (name, prompt)
3. Optional: enhance prompt, add characters
4. Click "Create"
5. Insert into `character_scenes` table
6. Return scene ID via callback
7. Parent navigates to `/roleplay/chat/:characterId/scene/:sceneId`

### Select Existing Scene
1. User opens character info drawer
2. Browses scene list
3. Taps scene card
4. Scene ID added to URL
5. Scene context loaded in chat
6. System prompt includes scene rules

### Scene in Conversation
1. Scene context passed to `roleplay-chat` edge function
2. Scene prompt used for image generation
3. Scene rules added to system prompt
4. Conversation starters offered as suggestions

---

## Database Schema

### character_scenes Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| character_id | UUID | FK to characters |
| conversation_id | UUID | Optional FK |
| scene_name | Text | Display name |
| scene_description | Text | User-facing context |
| scene_prompt | Text | Image generation prompt |
| scene_rules | Text | Behavior constraints |
| scene_starters | Text[] | Conversation openers |
| system_prompt | Text | System prompt override |
| priority | Int | Sort order (higher = first) |
| image_url | Text | Generated scene image |
| generation_metadata | JSONB | Model, settings used |
| created_at | Timestamp | Creation time |
| updated_at | Timestamp | Last update |

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

| Component | Purpose |
|-----------|---------|
| `SceneCard` | Scene display in messages |
| `SceneTemplateCard` | Gallery template card |
| `SceneDebugPanel` | Development debugging |
| `ScenePromptEditModal` | Quick prompt editing |

---

## Related Docs

- [PURPOSE.md](./PURPOSE.md) - Business requirements
- [UX_CHAT.md](./UX_CHAT.md) - Chat interface
- [UX_CHARACTER.md](./UX_CHARACTER.md) - Character creation
- [../../03-SYSTEMS/PROMPTING_SYSTEM.md](../../03-SYSTEMS/PROMPTING_SYSTEM.md) - Prompt templates
