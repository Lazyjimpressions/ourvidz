# Roleplay Character UX Specification

**Document Version:** 2.0
**Last Updated:** February 6, 2026
**Status:** Active
**Author:** AI Assistant
**Page:** `/roleplay` (modal-based)
**Components:** `AddCharacterModal.tsx`, `CharacterEditModal.tsx`

---

## Purpose

Character creation and editing interface for roleplay AI companions and user personas. Supports quick creation for casual users and detailed customization for power users. Now includes a distinct path for user personas (player characters) vs AI characters.

---

## Character Types

| Type | Description | Table | Purpose |
|------|-------------|-------|---------|
| **AI Character** | AI-controlled roleplay companion | `characters` | Chat partner that responds to user messages |
| **User Persona** | User's own character for roleplay | `characters` (user_id = current user) | Player identity in multi-reference scenes |

### User Personas

User personas are characters that represent the player in roleplay scenarios. They are used for:

1. **Multi-reference scene generation** - `both_characters` style combines AI + user references
2. **Role identification** - Clear user identity in scene descriptions
3. **Visual consistency** - User's appearance maintained across scenes

**Key Requirements:**

- Must have `reference_image_url` for multi-reference scene generation
- Stored in same `characters` table with `user_id` matching current user
- Default persona stored in `profiles.default_character_id`

---

## Entry Points

| Trigger | Location | Opens |
|---------|----------|-------|
| "+" button | Dashboard header | `AddCharacterModal` |
| "+" button | My Personas section | Persona Creation Dialog |
| Edit button | Character preview | `CharacterEditModal` |
| Edit button | Character info drawer | `CharacterEditModal` |

---

## Persona Creation Dialog

Two-path choice dialog for creating user personas. Accessed via "+" button in My Personas section on dashboard.

### Layout Structure

```
┌─────────────────────────────────────┐
│  Create Your Persona                │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  🚀 Quick Create            │   │
│  │  Simple form: name,         │   │
│  │  description, traits        │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  🎨 Full Editor             │   │
│  │  Character Studio with      │   │
│  │  I2I reference support      │   │
│  └─────────────────────────────┘   │
│                                     │
│                         [Cancel]    │
└─────────────────────────────────────┘
```

### Creation Paths

| Path | Fields | Output | Use Case |
|------|--------|--------|----------|
| **Quick Create** | Name, Description, Traits | Basic persona (no reference image) | Users who want text-only identity |
| **Full Editor** | Full Character Studio access | Complete persona with reference image | Users who want visual consistency in scenes |

### Quick Create Form

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text | Yes | User's persona name |
| Description | Textarea | No | Brief character description |
| Traits | Tag input | No | Personality traits |

### Full Editor Path

Opens Character Studio (`/character-studio`) with:

- Pre-selected "Persona" mode
- I2I reference generation enabled
- Avatar upload option
- Full customization options

### Reference Image Requirement

For multi-reference scene generation (`both_characters` style):

| Has Reference Image | Result |
|---------------------|--------|
| ✅ Yes | Full multi-reference with AI character + user persona |
| ❌ No | `both_characters` style disabled, falls back to `character_only` |

**Reference Image Sources:**

- Generated via Character Studio
- Uploaded via avatar upload
- Set from existing library asset

---

## AddCharacterModal

### Layout Structure

```
┌─────────────────────────────────────┐
│  Dialog Header                      │
│  "Create Character"          [X]    │
├─────────────────────────────────────┤
│  Tabs: [Create] [Browse Public]     │
├─────────────────────────────────────┤
│  Mode Toggle: [Quick] [Detailed]    │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────┐  Name: _________     │
│  │           │                      │
│  │  Portrait │  Description:        │
│  │  Preview  │  _______________     │
│  │           │  _______________     │
│  │  [Gen]    │                      │
│  └───────────┘  Persona: ________   │
│                                     │
│  Traits: [tag] [tag] [+]            │
│                                     │
│  [Detailed only section...]         │
│                                     │
├─────────────────────────────────────┤
│  [ ] Make Public     [Cancel] [Save]│
└─────────────────────────────────────┘
```

### Creation Modes

| Mode | Fields Shown | Target User |
|------|--------------|-------------|
| **Quick** | Name, Description, Persona, Traits, Image | Casual users |
| **Detailed** | + Voice, Mood, Gender, Role, Content Rating, Appearance Tags | Power users |

### Form Fields

#### Quick Mode Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Name | Text input | Yes | 2-50 chars |
| Description | Textarea | Yes | 10-500 chars |
| Persona | Textarea | No | Max 1000 chars |
| Traits | Tag input | No | Max 10 tags |
| Portrait | Image | No | Generated or uploaded |

#### Detailed Mode Additional Fields

| Field | Type | Options |
|-------|------|---------|
| Voice Tone | Select | Warm, Direct, Teasing, Formal, Soft-spoken, Confident, Playful |
| Mood | Select | Friendly, Serious, Playful, Mysterious, etc. |
| Gender | Text | Free-form |
| Role | Text | Free-form |
| Content Rating | Toggle | SFW / NSFW (default: NSFW) |
| Appearance Tags | Tag input | Visual descriptors |
| Voice Examples | Multi-line | Sample dialogue |
| Forbidden Phrases | Multi-line | Phrases to avoid |

### Portrait Generation

| Action | Behavior |
|--------|----------|
| Click "Generate" | Uses `buildCharacterPortraitPrompt()` with name, description, traits |
| Model Selection | Uses default image model from `api_models` table |
| Progress | Shows generation progress bar |
| Completion | Auto-populates `image_url` and `reference_image_url` |

### Tabs

| Tab | Content |
|-----|---------|
| **Create** | Character creation form |
| **Browse Public** | Grid of public characters to clone/adopt |

---

## CharacterEditModal

### Layout Structure

```
┌─────────────────────────────────────┐
│  Dialog Header                      │
│  "Edit Character"            [X]    │
├─────────────────────────────────────┤
│  ┌───────────┐  Name: _________     │
│  │           │                      │
│  │  Current  │  Description:        │
│  │  Image    │  _______________     │
│  │           │                      │
│  │ [Gen][Up] │  Persona: ________   │
│  └───────────┘                      │
│                                     │
│  Traits: [tag] [tag] [+]            │
│  Voice Tone: [Select]               │
│  Mood: [Select]                     │
│  Content Rating: [SFW/NSFW]         │
│  Gender: _______  Role: _______     │
│                                     │
│  [ ] Make Public                    │
│                                     │
├─────────────────────────────────────┤
│                     [Cancel] [Save] │
└─────────────────────────────────────┘
```

### Permissions

```typescript
const isOwner = user.id === character.user_id;
const isAdmin = userRole === 'admin';
const canEdit = isOwner || isAdmin;
```

| User Type | Can Edit |
|-----------|----------|
| Owner | Own characters only |
| Admin | All characters (public and private) |
| Other | No edit access |

### Image Actions

| Action | Behavior |
|--------|----------|
| Generate | Creates new portrait, prompts to set as avatar |
| Upload | Opens file picker, uploads to `avatars` bucket |
| Set from Scene | Option to use existing scene image |
| Set as Reference | Copies image to `reference_image_url` for I2I/multi-reference |

### Reference Image Field

The `reference_image_url` field is critical for scene generation consistency:

| Field | Purpose | Used By |
|-------|---------|---------|
| `image_url` | Display avatar in UI | Dashboard, chat header, cards |
| `reference_image_url` | Source for I2I generation | Scene generation, multi-reference |

**Auto-Population:**

- When generating a new portrait, both `image_url` and `reference_image_url` are set
- When uploading, user can choose to also set as reference
- Reference image should be high-quality, clear face/body shot

### Auto-Save Behavior

- Changes saved on explicit "Save" click
- No auto-save (prevents accidental changes)
- Unsaved changes warning on close

---

## Interaction Specs

### Tag Input

| Gesture | Action |
|---------|--------|
| Type + Enter | Add tag |
| Click X on tag | Remove tag |
| Max tags | 10 per field |

### Image Generation

| State | UI |
|-------|-----|
| Idle | "Generate Portrait" button |
| Generating | Progress bar + spinner |
| Complete | Preview updates, toast notification |
| Error | Toast with retry option |

---

## Data Flow

### Create Character

1. User fills form
2. Optional: Generate portrait
3. Click "Save"
4. `createUserCharacter()` via `useUserCharacters` hook
5. Character added to `characters` table
6. `onCharacterAdded` callback triggers grid refresh
7. Modal closes

### Edit Character

1. User modifies fields
2. Click "Save"
3. Owner: `updateUserCharacter()` via hook
4. Admin: Direct Supabase update
5. `onCharacterUpdated` callback
6. Modal closes

---

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| Name | Required, 2-50 chars | "Name is required" |
| Description | Required, 10-500 chars | "Description too short/long" |
| Image URL | Valid URL if provided | "Invalid image URL" |

---

## Loading States

| State | UI |
|-------|-----|
| Modal opening | Skeleton form |
| Portrait generating | Progress bar in image area |
| Saving | Button disabled + spinner |
| Image uploading | Progress indicator |

---

## Error Handling

| Error | Response |
|-------|----------|
| Save failed | Toast with error, keep modal open |
| Image gen failed | Toast, allow retry |
| Upload failed | Toast, fallback to generated URL |
| Permission denied | Toast, close modal |

---

## Related Components

| Component | Purpose |
|-----------|---------|
| `CharacterPreviewModal` | View-only character details |
| `CharacterInfoDrawer` | Character info in chat |
| `MobileCharacterCard` | Grid card display |
| `PersonaCreationDialog` | Two-path persona creation |
| `PersonaCard` | Persona display in My Personas section |

---

## Related Hooks

| Hook | Purpose |
|------|---------|
| `useUserCharacters` | Fetch user's AI characters + personas |
| `usePublicCharacters` | Fetch public characters |
| `useAuth` | Get current user and default persona ID |

---

## Related Docs

- [PURPOSE.md](./PURPOSE.md) - Business requirements
- [UX_DASHBOARD.md](./UX_DASHBOARD.md) - Character grid and persona section
- [UX_SCENE.md](./UX_SCENE.md) - Scene creation
- [UX_CHAT.md](./UX_CHAT.md) - Multi-reference scene generation
