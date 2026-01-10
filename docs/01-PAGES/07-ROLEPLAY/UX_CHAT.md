# Roleplay Chat UX Specification

**Document Version:** 1.0
**Last Updated:** January 10, 2026
**Status:** Active
**Author:** AI Assistant
**Page:** `/roleplay/chat/:characterId` and `/roleplay/chat/:characterId/scene/:sceneId`
**Component:** `MobileRoleplayChat.tsx`

---

## Purpose

Full-screen chat interface for roleplay conversations with AI characters. Supports scene generation, character info access, and real-time streaming responses.

---

## Layout Structure

### Mobile Layout
```
┌─────────────────────────────────────┐
│  MobileChatHeader (Fixed)           │
│  [Back] [Avatar] [Name] [≡ Menu]    │
├─────────────────────────────────────┤
│                                     │
│  Messages Area (Scrollable)         │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Character Message           │   │
│  │ [Avatar] [Bubble]           │   │
│  │          [Scene Image]      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │          User Message       │   │
│  │          [Bubble] [Avatar]  │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│  MobileChatInput (Fixed)            │
│  [📷] [Input Field] [Send]          │
├─────────────────────────────────────┤
│  ChatBottomNav (Fixed)              │
│  [Home] [Settings] [Info] [More]    │
└─────────────────────────────────────┘
```

### Z-Index Layering
| Element | Z-Index | Notes |
|---------|---------|-------|
| Messages | z-10 | Base layer |
| Input Area | z-30 | Above messages |
| Bottom Nav | z-40 | Above input |
| Drawers/Modals | z-50 | Overlay layer |

---

## Core Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `MobileChatHeader` | Back, character info, menu | `components/roleplay/MobileChatHeader.tsx` |
| `ChatMessage` | Message bubble with scene images | `components/roleplay/ChatMessage.tsx` |
| `MobileChatInput` | Text input + scene generation | `components/roleplay/MobileChatInput.tsx` |
| `ChatBottomNav` | Navigation + quick actions | `components/roleplay/ChatBottomNav.tsx` |
| `CharacterInfoDrawer` | Character details + scenes | `components/roleplay/CharacterInfoDrawer.tsx` |
| `QuickSettingsDrawer` | Model + style settings | `components/roleplay/QuickSettingsDrawer.tsx` |
| `RoleplaySettingsModal` | Full settings (desktop) | `components/roleplay/RoleplaySettingsModal.tsx` |

---

## User Flows

### Primary: Send Message
1. User types in input field
2. **Tap** Send button or press Enter
3. User message appears immediately (optimistic)
4. Loading indicator shows "Character is thinking..."
5. Character response streams in
6. Scene generation triggered if enabled

### Scene Generation
1. Character responds with scene-worthy content
2. System auto-triggers scene generation (if enabled)
3. Loading spinner in message area
4. Scene image appears inline with message
5. User can tap to enlarge or regenerate

### Access Character Info
1. **Tap** character avatar in header
2. `CharacterInfoDrawer` slides in from right
3. View: description, traits, scenes
4. Select scene to apply to conversation
5. Create new scene from drawer

### Access Settings
1. **Tap** settings icon in header/bottom nav
2. Mobile: `QuickSettingsDrawer` slides up
3. Desktop: `RoleplaySettingsModal` opens
4. Changes auto-save to localStorage

---

## Interaction Specs

### Header Actions
| Element | Tap Action |
|---------|------------|
| Back arrow | Navigate to `/roleplay` |
| Character avatar | Open `CharacterInfoDrawer` |
| Character name | Open `CharacterInfoDrawer` |
| Menu icon | Open context menu |
| Settings icon | Open settings |

### Message Interactions
| Gesture | Action | Target |
|---------|--------|--------|
| Tap scene image | Open fullscreen lightbox | Scene images |
| Long-press message | Copy text / report | Any message |
| Tap regenerate | Regenerate scene | Scene images |
| Swipe left | No action (reserved) | Messages |

### Input Area
| Element | Action |
|---------|--------|
| Camera icon | Generate scene manually |
| Text input | 16px min font (no zoom) |
| Send button | Submit message |

---

## Message Types

### Character Message
```
┌────────────────────────────────────┐
│ [Avatar]  Character Name           │
│           ┌──────────────────────┐ │
│           │ Message text here... │ │
│           └──────────────────────┘ │
│           ┌──────────────────────┐ │
│           │   [Scene Image]      │ │
│           │   📷 Regenerate      │ │
│           └──────────────────────┘ │
│           12:34 PM                 │
└────────────────────────────────────┘
```

### User Message
```
┌────────────────────────────────────┐
│                    User Name [Ava] │
│ ┌──────────────────────┐           │
│ │ Message text here... │           │
│ └──────────────────────┘           │
│                        12:35 PM    │
└────────────────────────────────────┘
```

---

## Drawers (Non-Blocking)

### CharacterInfoDrawer
- **Position**: Right side, 80% width on mobile
- **Trigger**: Tap avatar or character name
- **Content**: Character bio, traits, scenes list
- **Actions**: Select scene, create scene, edit (if owner)

### QuickSettingsDrawer
- **Position**: Bottom sheet
- **Trigger**: Settings icon
- **Content**: Model select, image model, scene style
- **Auto-save**: Changes persist to localStorage

---

## Settings Persistence

| Setting | Storage Key | Default |
|---------|-------------|---------|
| Chat Model | `roleplay-settings.modelProvider` | API default |
| Image Model | `roleplay-settings.selectedImageModel` | API default |
| Scene Style | `roleplay-settings.sceneStyle` | `character_only` |
| User Character | `roleplay-settings.userCharacterId` | Profile default |
| Consistency | `roleplay-settings.consistencySettings` | Hybrid method |

---

## Loading States

| State | UI |
|-------|-----|
| Sending message | Input disabled, send button loading |
| AI responding | "Character is thinking..." with dots animation |
| Scene generating | Spinner in image placeholder |
| Scene loading | Skeleton with shimmer |
| Character loading | Full page skeleton |

---

## Error States

| Error | UI | Recovery |
|-------|-----|----------|
| Message send fail | Toast + retry button | Tap to resend |
| Scene generation fail | Error placeholder | "Retry" button in image area |
| Character load fail | Error page | Back button + retry |
| Network offline | Toast notification | Auto-retry on reconnect |

---

## Mobile-Specific Behaviors

### Keyboard Handling
- Input moves above keyboard
- Messages scroll to stay visible
- Bottom nav hides when keyboard open
- Safe area insets respected

### Fixed Positioning
- Header: `fixed top-0`
- Input: `fixed bottom-14` (above bottom nav)
- Bottom Nav: `fixed bottom-0`
- Messages: `padding-bottom: 140px` to account for fixed elements

### Image Width
- Scene images: `calc(100vw - 16px)` max width
- Full viewport utilization
- Maintains aspect ratio

---

## Scene Continuity System

When enabled, maintains visual consistency across scenes:

1. First scene in conversation: T2I (text-to-image)
2. Subsequent scenes: I2I (image-to-image) using previous scene
3. Reference passed via `useSceneContinuity` hook
4. Strength setting controls how much previous scene influences new one

---

## Real-time Updates

- Supabase subscription on `messages` table
- Streaming responses via edge function
- Auto-scroll to latest message
- Scene image updates via workspace asset polling

---

## Related Docs

- [PURPOSE.md](./PURPOSE.md) - Business requirements
- [UX_DASHBOARD.md](./UX_DASHBOARD.md) - Character selection
- [UX_CHARACTER.md](./UX_CHARACTER.md) - Character creation/edit
- [UX_SCENE.md](./UX_SCENE.md) - Scene builder spec
- [../../03-SYSTEMS/PROMPTING_SYSTEM.md](../../03-SYSTEMS/PROMPTING_SYSTEM.md) - Prompt templates
