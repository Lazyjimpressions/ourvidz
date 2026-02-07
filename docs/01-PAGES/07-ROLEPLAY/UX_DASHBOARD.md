# Roleplay Dashboard UX Specification

**Document Version:** 2.0
**Last Updated:** February 6, 2026
**Status:** Active
**Author:** AI Assistant
**Page:** `/roleplay`
**Component:** `MobileRoleplayDashboard.tsx`

---

## Purpose

Character selection grid with quick access to recent conversations and scene templates. Mobile-first design optimized for touch interactions.

---

## Layout Structure

```
┌───────────────────────────────────────────────┐
│  Header (Title + Refresh + Settings)          │
├───────────────────────────────────────────────┤
│  Continue Where You Left Off                  │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐     │
│  │Tile │ │Tile │ │Tile │ │Tile │ │Tile │     │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘     │
│  ← Horizontal scroll →                        │
├───────────────────────────────────────────────┤
│  Scene Gallery               [+ Create]       │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐     │
│  │Scene│ │Scene│ │Scene│ │Scene│ │Scene│     │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘     │
│  ← Horizontal scroll →                        │
├───────────────────────────────────────────────┤
│  Search + Filters                             │
├───────────────────────────────────────────────┤
│  My Characters                                │
│  ┌─────┐ ┌─────┐ ┌─────┐                     │
│  │Card │ │Card │ │Card │                     │
│  └─────┘ └─────┘ └─────┘                     │
├───────────────────────────────────────────────┤
│  Explore Public                               │
│  ┌─────┐ ┌─────┐ ┌─────┐                     │
│  │Card │ │Card │ │Card │                     │
│  └─────┘ └─────┘ └─────┘                     │
├───────────────────────────────────────────────┤
│  Bottom Navigation                            │
└───────────────────────────────────────────────┘
```

---

## Core Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `CharacterGrid` | Character card layout | `components/roleplay/CharacterGrid.tsx` |
| `MobileCharacterCard` | Individual character card | `components/roleplay/MobileCharacterCard.tsx` |
| `SearchAndFilters` | Search bar + filter chips | `components/roleplay/SearchAndFilters.tsx` |
| `SceneGallery` | Horizontal scene template scroll | `components/roleplay/SceneGallery.tsx` |
| `SceneCreationModal` | Create/edit scene templates | `components/roleplay/SceneCreationModal.tsx` |
| `SceneSetupSheet` | Character selection for scene | `components/roleplay/SceneSetupSheet.tsx` |
| `AddCharacterModal` | Create new character | `components/roleplay/AddCharacterModal.tsx` |
| `DashboardSettings` | Settings drawer | `components/roleplay/DashboardSettings.tsx` |

### Hooks

| Hook | Purpose | Location |
|------|---------|----------|
| `useUserConversations` | Fetch/manage user conversations | `hooks/useUserConversations.ts` |
| `usePublicCharacters` | Fetch public characters | `hooks/usePublicCharacters.ts` |
| `useUserCharacters` | Fetch user's characters (AI + personas) | `hooks/useUserCharacters.ts` |
| `useSceneGallery` | Fetch scene templates from `scenes` table | `hooks/useSceneGallery.ts` |
| `useCharacterImageUpdates` | Realtime subscription for character image changes | `hooks/useCharacterImageUpdates.ts` |

---

## My Personas Section

User personas (user characters) for roleplay identity. Separate from AI characters.

### Display
- Horizontal scroll of persona cards
- "+" button opens persona creation dialog
- Default persona marked with checkmark

### Persona Creation Dialog

Two-path choice dialog:

| Option | Action |
|--------|--------|
| **Quick Create** | Simple form: name, description, traits |
| **Full Editor** | Opens Character Studio with I2I reference support |

### Persona Selection
- Tap persona card to set as default
- Default stored in `profiles.default_character_id`
- Used for multi-reference scene generation (`both_characters` style)

### Reference Image Requirement
- Personas need `reference_image_url` for multi-reference scenes
- Without reference image, `both_characters` style is disabled
- Character Studio allows generating/uploading reference images

---

## Continue Where You Left Off

Displays user's recent conversations as visual tiles for quick resumption.

### Display Conditions
- Only shows if user has conversations with `last_scene_image` set
- Maximum 6 tiles displayed
- Only active conversations (not archived)

### Tile Structure
```
┌─────────────────────┐
│ [Avatar]    [X][🗑] │  ← Hover icons (top corners)
│                     │
│   Scene Thumbnail   │  ← Background image (3:4 aspect)
│                     │
│ Character Name      │  ← Bottom overlay
│ Conversation Title  │
└─────────────────────┘
```

### Tile Elements
| Element | Description |
|---------|-------------|
| Background | Last scene image from conversation, fallback to character avatar |
| Character Avatar | 32x32px circle, top-left, white border (hidden if using avatar as background) |
| Character Name | White text, truncated if long |
| Conversation Title | 60% white text, truncated |

### Hover Interactions
| Icon | Position | Action | Effect |
|------|----------|--------|--------|
| X | Top-right | Dismiss | Archives conversation (hides from list, keeps data) |
| Trash | Top-right | Delete | Permanently deletes conversation and all messages |

### Click Behavior
- **Tap tile** → Navigate to `/roleplay/chat/:characterId?conversation=:conversationId`
- Loads exact conversation (not a new one)
- Chat page checks `?conversation=` param first before other lookup methods

### Data Source
- Hook: `useUserConversations(limit, excludeEmpty)`
- Returns conversations with `message_count > 0`
- Includes character details via join

### Image Persistence
Scene thumbnails are automatically persisted when generated:

| Step | Location | TTL |
|------|----------|-----|
| Generation | `workspace-temp` bucket | Temporary |
| Persistence | `user-library/{userId}/scene-thumbnails/{conversationId}/` | Permanent |
| Database | `conversations.last_scene_image` column | N/A |

**Flow:**
1. Scene generated → stored in `workspace-temp` (temporary)
2. Background copy to `user-library` (persistent)
3. `last_scene_image` updated with persistent path
4. Dashboard signs URL with 24h TTL for display

**Cleanup:**
- Delete conversation → removes thumbnails from `user-library`
- Dismiss conversation → thumbnails remain (for potential restore)

---

## Scene Gallery

Displays scene templates from `scenes` table. Scenes are **character-agnostic** - user selects a scene, then picks which character to use.

### Data Source

```typescript
const { scenes } = useSceneGallery(filter, limit);
// Queries `scenes` table
// Shows: public templates (is_public = true) + user's private scenes (creator_id = user.id)
```

### Layout

```
┌──────────────────────────────────────────────────────┐
│  Scene Gallery                         [+ Create]    │
├──────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │ [Image] │ │ [Image] │ │ [Image] │ │ [Image] │    │
│  │ Name    │ │ Name    │ │ Name    │ │ Name    │    │
│  │ Type    │ │ Type    │ │ Type    │ │ Type    │    │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │
│  ← Horizontal scroll →                               │
└──────────────────────────────────────────────────────┘
```

### Scene Card Elements

| Element | Content |
|---------|---------|
| Image | Preview from `preview_image_url` (1:1 ratio) |
| Name | Scene title from `name` |
| Type | Scenario type badge (stranger, relationship, fantasy) |
| Edit icon | Hover-only, shown on user's own scenes |

### Interactions

| Gesture | Action |
|---------|--------|
| Tap card | Open `SceneSetupSheet` for character selection |
| Tap edit icon | Open `SceneCreationModal` in edit mode |
| Tap "+ Create" | Open `SceneCreationModal` for new scene |

### Scene Flow

1. **Tap scene card** → `SceneSetupSheet` opens
2. **Select character** → Dropdown of user's + public characters
3. **Set role (optional)** → User's role in the scene
4. **Tap "Start Roleplay"** → Navigate to `/roleplay/chat/:characterId?scene=:sceneId`

### Scene Types

| Type | Description |
|------|-------------|
| System templates | `creator_id = NULL`, always public |
| User templates | `creator_id = user.id`, public or private |

---

## User Flow

### Primary: Continue Existing Conversation
1. User lands on `/roleplay`
2. "Continue Where You Left Off" section shows recent conversations
3. **Tap** conversation tile → Navigate to `/roleplay/chat/:characterId?conversation=:id`
4. Chat loads with full message history intact

### Alternative: Start New Chat with Character
1. User scrolls to "My Characters" or "Explore Public" section
2. Grid displays characters (public + user-created)
3. **Tap** character card → Navigate to `/roleplay/chat/:characterId`
4. Chat starts new conversation (or resumes most recent if exists)

### Alternative: Start Chat via Scene Template
1. User scrolls to Scene Gallery section
2. **Tap** scene card → Opens `SceneSetupSheet`
3. **Select character** from dropdown (user's + public)
4. **Optionally** set user's role in the scene
5. **Tap "Start Roleplay"** → Navigate to `/roleplay/chat/:characterId?scene=:sceneId`
6. Chat loads with scene context (prompt, starters)

### Alternative: Preview Character First
1. **Long-press** (500ms) OR tap preview button on card
2. Opens `CharacterPreviewModal` with full details
3. View scenes, description, stats
4. **Tap** "Start Chat" → Navigate to chat

---

## Interaction Specs

### Character Card
| Gesture | Action | Duration |
|---------|--------|----------|
| Tap | Navigate to chat | Immediate |
| Long-press | Open preview modal | 500ms |
| Swipe left/right | No action (reserved) | - |

### Card Elements
- **Image**: 1:1 aspect ratio, `object-cover`
- **Name**: Truncated with ellipsis if >20 chars
- **Badge**: Content rating (SFW/NSFW)
- **Touch target**: Minimum 44x44px

### Grid Layout
- **Mobile**: 2 columns, 8px gap
- **Tablet**: 3 columns, 12px gap
- **Desktop**: 4 columns, 16px gap

---

## Filters & Search

### Filter Chips
| Filter | Values | Default |
|--------|--------|---------|
| Ownership | All, My Characters, Public | All |
| Content | All, NSFW, SFW | All |
| Status | All, Active Conversations | All |

### Search Behavior
- Debounced (300ms)
- Searches: name, description, traits
- Clears on filter change
- Shows "No results" empty state

---

## Settings (Drawer)

Accessed via settings icon in header.

| Setting | Type | Storage |
|---------|------|---------|
| Chat Model | Select | localStorage |
| Image Model | Select | localStorage |
| Content Filter | Toggle | localStorage |
| Memory Tier | Select | localStorage |
| Scene Style | Select | localStorage |

---

## Loading States

| State | UI |
|-------|-----|
| Initial load | Skeleton cards (6) |
| Refresh | Pull-to-refresh spinner |
| Character load fail | Error card with retry |
| Image load fail | Fallback avatar |

---

## Empty States

| Condition | Message | Action |
|-----------|---------|--------|
| No characters | "No characters yet" | "Create Character" button |
| No search results | "No matches found" | Clear filters button |
| No conversations | "Start chatting" | Highlight character grid |

---

## Real-time Updates

- Supabase subscription on `characters` table
- Updates grid when character image changes
- Debounced refresh (500ms) to prevent flicker

---

## Mobile-Specific Behaviors

- **No sidebar**: Hidden via `OurVidzDashboardLayout`
- **Bottom nav**: Always visible, 56px height
- **Safe areas**: iOS notch/home indicator respected
- **Pull-to-refresh**: Enabled on character grid

---

## Related Docs

- [PURPOSE.md](./PURPOSE.md) - Business requirements
- [UX_CHAT.md](./UX_CHAT.md) - Chat interface spec
- [UX_CHARACTER.md](./UX_CHARACTER.md) - Character creation/edit
- [UX_SCENE.md](./UX_SCENE.md) - Scene builder spec
