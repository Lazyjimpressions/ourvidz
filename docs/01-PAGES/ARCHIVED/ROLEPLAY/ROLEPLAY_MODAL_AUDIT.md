# Roleplay Modal & Dialogue Box Audit

**Date:** December 17, 2025  
**Status:** 🔄 **In Progress**  
**Purpose:** Comprehensive audit of all modals and dialogue boxes in roleplay feature

## Overview

The roleplay feature has multiple modals and dialogue boxes that need to be reviewed for:
- UX consistency
- Workflow clarity
- Dark screen/overlay issues
- Proper state management
- User flow optimization

## All Modals Identified

### 1. CharacterPreviewModal ✅
**Location:** `src/components/roleplay/CharacterPreviewModal.tsx`  
**Purpose:** Preview character details and select scenes before starting chat  
**Trigger:** Click on character card  
**Issues:**
- ⚠️ **FIXED**: Dark screen overlay persists on scene start
- ⚠️ Modal close timing needs improvement
- ✅ Good scene selection UI
- ✅ Clear action buttons

**Current State:**
- Shows character image, description, stats
- Lists available scenes
- "Start Scene" or "Start Chat" button
- Close button in header

**Recommendations:**
- ✅ Fixed: Increased delay to 250ms for proper Dialog close
- ✅ Fixed: Added pointer-events-none to closed overlay
- Consider: Add loading state during navigation

### 2. RoleplaySettingsModal ✅
**Location:** `src/components/roleplay/RoleplaySettingsModal.tsx`  
**Purpose:** Configure roleplay settings (memory, models, consistency)  
**Trigger:** Settings button in chat header  
**Issues:**
- ✅ Well organized with tabs
- ✅ Good model comparison view
- ⚠️ Could be overwhelming for new users

**Current State:**
- Three tabs: General, Models, Advanced
- Memory tier selection
- Model selection with capabilities
- Image consistency settings

**Recommendations:**
- Add tooltips for advanced settings
- Consider wizard flow for first-time setup
- Add preset configurations

### 3. SceneGenerationModal ⚠️
**Location:** `src/components/roleplay/SceneGenerationModal.tsx`  
**Purpose:** Generate new scenes for roleplay  
**Trigger:** Scene generation button  
**Issues:**
- ⚠️ Not clear when/where this is accessible
- ⚠️ Complex form with multiple character selectors
- ⚠️ Workflow unclear

**Current State:**
- Prompt input
- Character selection (user + AI)
- Narrator toggle
- Generate button

**Recommendations:**
- Clarify when this modal should appear
- Simplify character selection
- Add scene templates/presets
- Better integration with chat flow

### 4. ConversationManager Modal ⚠️
**Location:** `src/components/roleplay/ConversationManager.tsx`  
**Purpose:** Manage multiple conversations  
**Trigger:** Conversations button  
**Issues:**
- ⚠️ Modal for "All Conversations" - could be a sidebar instead
- ⚠️ Not clear how this integrates with main flow

**Current State:**
- Lists all conversations
- Shows conversation status
- Click to switch conversations

**Recommendations:**
- Consider sidebar/drawer instead of modal
- Add search/filter
- Show conversation previews

### 5. ModelSelector (Popover) ✅
**Location:** `src/components/roleplay/ModelSelector.tsx`  
**Purpose:** Quick model switching  
**Trigger:** Model selector button  
**Issues:**
- ✅ Good implementation
- ✅ Compact and accessible

**Current State:**
- Popover (not full modal)
- Shows model capabilities
- Quick switch functionality

**Recommendations:**
- ✅ Already well implemented

### 6. MessageActions (Dropdown) ✅
**Location:** `src/components/roleplay/MessageActions.tsx`  
**Purpose:** Actions for individual messages  
**Trigger:** Hover/tap on message  
**Issues:**
- ✅ Good implementation
- ✅ Mobile-friendly

**Current State:**
- Dropdown menu
- Regenerate, edit, copy, delete actions

**Recommendations:**
- ✅ Already well implemented

## Workflow Issues Identified

### Current Flow (Jumbled)
1. User sees character grid
2. Clicks character → **CharacterPreviewModal opens**
3. Selects scene (optional)
4. Clicks "Start Scene" → **Modal closes, navigates**
5. Chat page loads → **Settings modal available**
6. Can open **SceneGenerationModal** (unclear when)
7. Can open **ConversationManager** (unclear when)

### Problems
1. **Too many modals** - 4+ modals in one flow
2. **Unclear entry points** - When to use SceneGenerationModal?
3. **Modal stacking** - Can modals open on top of each other?
4. **Navigation confusion** - Modal → Navigation → New page with more modals
5. **Settings buried** - Settings modal only accessible from chat

## Recommended Workflow Improvements

### Option 1: Simplified Flow (Recommended)
```
Dashboard → Character Card Click → Quick Start (no modal)
  OR
Dashboard → Character Card Click → Preview Modal → Start Scene
Chat → Settings (accessible but not prominent)
Chat → Scene Generation (as part of chat, not separate modal)
```

**Changes:**
- Make preview modal optional (quick start by default)
- Integrate scene generation into chat interface
- Move settings to less prominent location
- Use sidebar/drawer for conversations instead of modal

### Option 2: Wizard Flow
```
Dashboard → Character Selection → Scene Selection → Settings (optional) → Chat
```

**Changes:**
- Single modal with steps
- Progress indicator
- Can skip steps
- Clear "Start Chat" at end

### Option 3: Contextual Modals
```
Dashboard → Character Preview (lightweight)
Chat → Inline controls (no modals for common actions)
Chat → Settings (drawer, not modal)
Chat → Scene Generation (inline, not modal)
```

**Changes:**
- Minimize modal usage
- Use drawers/sidebars where appropriate
- Inline controls for common actions

## Dark Screen Fix Applied

### Root Cause
Dialog overlay (`bg-black/80`) persists because:
1. Dialog Portal unmounts during navigation
2. Animation timing (200ms fade-out) not respected
3. Overlay not removed from DOM before route change

### Fixes Applied
1. ✅ Increased delay to 250ms (Dialog animation is 200ms)
2. ✅ Added `pointer-events-none` to closed overlay
3. ✅ Proper `onOpenChange` handler
4. ✅ Ensure Dialog `open` state is false before navigation

### Code Changes
```typescript
// CharacterPreviewModal.tsx
const handleStartChat = () => {
  const sceneToStart = selectedScene || undefined;
  onClose(); // Close modal
  setTimeout(() => {
    onStartChat(sceneToStart); // Navigate after Dialog closes
  }, 250); // Wait for animation
};

// dialog.tsx
"data-[state=closed]:pointer-events-none" // Prevent interaction with closed overlay
```

## Testing Checklist

### Modal Functionality
- [ ] CharacterPreviewModal opens/closes correctly
- [ ] Scene selection works
- [ ] "Start Scene" doesn't leave dark screen
- [ ] Settings modal accessible from chat
- [ ] Model selector works
- [ ] Message actions work

### Workflow Testing
- [ ] Can start chat without preview modal
- [ ] Can preview character before starting
- [ ] Settings are accessible but not intrusive
- [ ] Scene generation is clear when to use
- [ ] Conversation management is clear

### Edge Cases
- [ ] Rapid clicking doesn't break modals
- [ ] Navigation during modal open doesn't leave overlay
- [ ] Multiple modals don't stack incorrectly
- [ ] Mobile touch interactions work

## Recommendations Summary

### Immediate Fixes
1. ✅ **DONE**: Fix dark screen overlay issue
2. ✅ **DONE**: Improve modal close timing
3. ⚠️ **TODO**: Review SceneGenerationModal workflow
4. ⚠️ **TODO**: Consider sidebar for conversations

### UX Improvements
1. Make preview modal optional (quick start)
2. Integrate scene generation into chat
3. Use drawers instead of modals where appropriate
4. Add loading states during navigation
5. Clearer entry points for all features

### Code Improvements
1. Consistent modal patterns
2. Better state management
3. Prevent modal stacking
4. Proper cleanup on unmount

---

**Next Steps:**
1. Test dark screen fix
2. Implement workflow improvements
3. User testing for clarity
4. Iterate based on feedback

