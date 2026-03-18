

# Competitive UX Improvements vs Candy.ai — Implementation Complete

## Implemented (All 4 Phases)

### Phase 1: Message Polish
- **TypewriterText**: `src/components/roleplay/TypewriterText.tsx` — Character-by-character reveal at ~45 chars/sec with blinking cursor. Skipped for historical messages.
- **Action text italics**: `*text between asterisks*` renders as italic for narration vs dialogue distinction.
- **Message grouping**: Consecutive same-sender messages collapse avatars/headers. Timestamps only shown with >5 min gap.
- **Softer AI bubbles**: Switched from `bg-gray-800` to `bg-card` with `border-border/50` for less harsh appearance.

### Phase 2: Quick Replies & Input
- **QuickReplies**: `src/components/roleplay/QuickReplies.tsx` — 3 contextual chips shown after last AI message. Falls back to defaults ("Tell me more...", "What happens next?", "Come closer...").
- **Auto-grow textarea**: `MobileChatInput.tsx` upgraded from `<Input>` to `<textarea>` with auto-resize (max 5 rows). Rounded pill shape.
- **Dynamic placeholder**: Shows "Message Luna..." using character name.
- **Action chips**: Camera/Scene button row above input for quick scene generation.

### Phase 3: Scene Images
- **Edge-to-edge**: Removed `Card` wrapper, images render directly with `rounded-xl`.
- **Fade-in animation**: Scene images animate in with `opacity` + `scale` transition on load.
- **Vignette overlay**: Subtle `bg-gradient-to-t from-black/20` at bottom of scene images.
- **Hidden actions**: Download/Edit/Share buttons only appear on hover/tap overlay.

### Phase 4: Onboarding
- **CharacterSplash**: `src/components/roleplay/CharacterSplash.tsx` — Full-screen overlay on new conversations with portrait, name, tagline. Auto-dismisses after 2s. Tap to skip.
- **Timestamp cleanup**: Timestamps hidden for grouped messages, only shown when >5 min gap.

## Files Modified
- `src/components/roleplay/ChatMessage.tsx` — Typewriter, action text, grouping, scene polish
- `src/components/roleplay/MobileChatInput.tsx` — Textarea upgrade, action chips, character placeholder
- `src/pages/MobileRoleplayChat.tsx` — Integration of all new components

## Files Created
- `src/components/roleplay/TypewriterText.tsx`
- `src/components/roleplay/QuickReplies.tsx`
- `src/components/roleplay/CharacterSplash.tsx`
