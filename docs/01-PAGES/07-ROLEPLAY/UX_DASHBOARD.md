# Roleplay Dashboard UX Specification

**Document Version:** 1.1
**Last Updated:** January 10, 2026
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
┌─────────────────────────────────────┐
│  Header (Title + Refresh + Settings)│
├─────────────────────────────────────┤
│  Continue Where You Left Off        │
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │Scene│ │Scene│ │Scene│ (up to 6) │
│  │Tile │ │Tile │ │Tile │           │
│  └─────┘ └─────┘ └─────┘           │
├─────────────────────────────────────┤
│  Scene Gallery                      │
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │Scene│ │Scene│ │Scene│           │
│  └─────┘ └─────┘ └─────┘           │
├─────────────────────────────────────┤
│  Custom Scenario (Build your own)   │
├─────────────────────────────────────┤
│  Search + Filters                   │
├─────────────────────────────────────┤
│  My Characters                      │
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │Card │ │Card │ │Card │           │
│  └─────┘ └─────┘ └─────┘           │
├─────────────────────────────────────┤
│  Explore Public                     │
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │Card │ │Card │ │Card │           │
│  └─────┘ └─────┘ └─────┘           │
├─────────────────────────────────────┤
│  Bottom Navigation                  │
└─────────────────────────────────────┘
```

---

## Core Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `CharacterGrid` | Character card layout | `components/roleplay/CharacterGrid.tsx` |
| `MobileCharacterCard` | Individual character card | `components/roleplay/MobileCharacterCard.tsx` |
| `SearchAndFilters` | Search bar + filter chips | `components/roleplay/SearchAndFilters.tsx` |
| `SceneGallery` | Horizontal scene template scroll | `components/roleplay/SceneGallery.tsx` |
| `AddCharacterModal` | Create new character | `components/roleplay/AddCharacterModal.tsx` |
| `DashboardSettings` | Settings drawer | `components/roleplay/DashboardSettings.tsx` |

### Hooks

| Hook | Purpose | Location |
|------|---------|----------|
| `useUserConversations` | Fetch/manage user conversations | `hooks/useUserConversations.ts` |
| `usePublicCharacters` | Fetch public characters | `hooks/usePublicCharacters.ts` |
| `useUserCharacters` | Fetch user's characters | `hooks/useUserCharacters.ts` |
| `useSceneGallery` | Fetch scene templates | `hooks/useSceneGallery.ts` |

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
1. User scrolls to Scene Templates section
2. **Tap** scene card → Opens `SceneSetupSheet`
3. Select character for scene → Navigate to chat with scene context

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
