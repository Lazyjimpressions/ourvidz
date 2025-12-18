# Roleplay Workflow Improvements

**Date:** December 17, 2025  
**Status:** 📋 **Proposed**  
**Purpose:** Address "jumbled mess" workflow issues and propose better UX

## Current Problems

### 1. Too Many Modals
- CharacterPreviewModal (required to start)
- RoleplaySettingsModal (buried in chat)
- SceneGenerationModal (unclear when to use)
- ConversationManager Modal (could be sidebar)
- ModelSelector (popover - OK)

### 2. Unclear Entry Points
- When should SceneGenerationModal be used?
- Where is ConversationManager accessible?
- Settings only in chat, not discoverable

### 3. Modal Stacking
- Can modals open on top of each other?
- What happens if user navigates with modal open?
- Dark screen overlay issues

### 4. Workflow Confusion
```
Dashboard → Preview Modal → Start → Chat → Settings Modal → ???
```
User doesn't know:
- Do I need to preview?
- When do I configure settings?
- How do I generate scenes?
- How do I manage conversations?

## Proposed Solutions

### Solution 1: Simplified Quick Start (Recommended)

**Principle:** Make the common path easy, advanced features discoverable

#### Changes:
1. **Quick Start by Default**
   - Click character card → Start chat immediately
   - No preview modal required
   - Use character's default scene or create new

2. **Optional Preview**
   - Long-press or "Preview" button on card
   - Shows CharacterPreviewModal
   - Can select scene before starting

3. **Settings Integration**
   - Move settings to chat header (always visible)
   - Use drawer/sidebar instead of modal
   - Quick access to model selector (already done ✅)

4. **Scene Generation**
   - Integrate into chat interface
   - Button in chat: "Generate Scene"
   - Inline form, not separate modal
   - Or: Part of message input (advanced mode)

5. **Conversation Management**
   - Sidebar/drawer instead of modal
   - Always accessible from chat
   - Shows recent conversations

#### New Flow:
```
Dashboard → Click Card → Chat Starts (quick)
  OR
Dashboard → Long-press Card → Preview → Select Scene → Start
Chat → Settings Drawer (slide out)
Chat → Scene Generator (inline)
Chat → Conversations Sidebar
```

### Solution 2: Wizard Flow

**Principle:** Guide user through setup step-by-step

#### Changes:
1. **Single Modal with Steps**
   - Step 1: Character Selection
   - Step 2: Scene Selection (optional)
   - Step 3: Settings (optional)
   - Step 4: Start Chat

2. **Progress Indicator**
   - Shows which step user is on
   - Can skip optional steps
   - Clear "Start Chat" button

3. **Remember Preferences**
   - Save user's common choices
   - Quick start uses saved preferences

#### New Flow:
```
Dashboard → Click Card → Wizard Modal
  Step 1: Character (pre-selected)
  Step 2: Scene (optional, can skip)
  Step 3: Settings (optional, can skip)
  Step 4: Start Chat
```

### Solution 3: Contextual Controls

**Principle:** Minimize modals, use inline controls

#### Changes:
1. **No Preview Modal**
   - Character details in tooltip/hover
   - Or: Expandable card on dashboard
   - Quick start is primary action

2. **Inline Settings**
   - Settings as collapsible panel in chat
   - Not a modal
   - Always visible but can be minimized

3. **Scene Generation in Chat**
   - Part of message input area
   - "Advanced" mode toggle
   - Shows scene generation form inline

4. **Conversations as Sidebar**
   - Slide-out sidebar
   - Not a modal
   - Always accessible

#### New Flow:
```
Dashboard → Click Card → Chat (immediate)
Chat → Settings Panel (inline, collapsible)
Chat → Scene Generator (inline, advanced mode)
Chat → Conversations Sidebar (slide out)
```

## Recommended Implementation

### Phase 1: Quick Wins (Do First)
1. ✅ **DONE**: Fix dark screen overlay
2. ✅ **DONE**: Improve modal close timing
3. ⚠️ **TODO**: Make preview modal optional
4. ⚠️ **TODO**: Add quick start (no preview)

### Phase 2: Workflow Improvements
1. Convert ConversationManager to sidebar
2. Integrate scene generation into chat
3. Move settings to drawer/panel
4. Add tooltips/help text

### Phase 3: Advanced Features
1. Remember user preferences
2. Quick start with saved settings
3. Advanced mode toggle
4. Keyboard shortcuts

## Specific Code Changes Needed

### 1. Make Preview Optional
```typescript
// MobileCharacterCard.tsx
const handleCardClick = () => {
  // Quick start - navigate immediately
  if (character.quick_start) {
    navigate(`/roleplay/chat/${character.id}`);
  } else {
    // Show preview for new characters
    setShowPreview(true);
  }
};

// Add long-press for preview
const handleLongPress = () => {
  setShowPreview(true);
};
```

### 2. Convert Settings to Drawer
```typescript
// Use Sheet component instead of Dialog
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

<Sheet open={isOpen} onOpenChange={onClose}>
  <SheetContent side="right" className="w-[400px]">
    {/* Settings content */}
  </SheetContent>
</Sheet>
```

### 3. Scene Generation Inline
```typescript
// In chat interface, add toggle
const [showSceneGenerator, setShowSceneGenerator] = useState(false);

{showSceneGenerator && (
  <div className="border-t p-4">
    {/* Scene generation form */}
  </div>
)}
```

### 4. Conversations Sidebar
```typescript
// Use Sheet for sidebar
<Sheet open={showConversations} onOpenChange={setShowConversations}>
  <SheetContent side="left" className="w-[300px]">
    {/* Conversations list */}
  </SheetContent>
</Sheet>
```

## User Testing Questions

1. Do you prefer quick start or preview first?
2. Where should settings be accessible?
3. When do you use scene generation?
4. How do you manage multiple conversations?
5. Is the current flow confusing?

## Success Metrics

- ✅ Reduced modal count (4+ → 2)
- ✅ Faster time to start chat
- ✅ Clearer entry points
- ✅ No dark screen issues
- ✅ Better discoverability

---

**Status:** Ready for implementation after user feedback

