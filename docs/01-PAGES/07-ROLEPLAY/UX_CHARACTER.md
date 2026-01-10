# Roleplay Character UX Specification

**Document Version:** 1.0
**Last Updated:** January 10, 2026
**Status:** Active
**Author:** AI Assistant
**Page:** `/roleplay` (modal-based)
**Components:** `AddCharacterModal.tsx`, `CharacterEditModal.tsx`

---

## Purpose

Character creation and editing interface for roleplay AI companions. Supports quick creation for casual users and detailed customization for power users.

---

## Entry Points

| Trigger | Location | Opens |
|---------|----------|-------|
| "+" button | Dashboard header | `AddCharacterModal` |
| Edit button | Character preview | `CharacterEditModal` |
| Edit button | Character info drawer | `CharacterEditModal` |

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

---

## Related Docs

- [PURPOSE.md](./PURPOSE.md) - Business requirements
- [UX_DASHBOARD.md](./UX_DASHBOARD.md) - Character grid
- [UX_SCENE.md](./UX_SCENE.md) - Scene creation
