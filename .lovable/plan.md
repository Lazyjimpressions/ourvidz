
# Plan: Keep Only Per-Message Generate Scene Button

## Summary
Remove the "Generate Scene" button from the bottom navigation bar and keep only the per-message "Generate Scene" button that appears under each AI chat message.

---

## Current State

| Location | Button | Status |
|----------|--------|--------|
| `ChatBottomNav.tsx` (lines 51-67) | Generate Scene with Sparkles icon | **Remove** |
| `ChatMessage.tsx` (lines 626-639) | Generate Scene with ImageIcon | **Keep** |
| `ChatMessage.tsx` (lines 453-469) | Camera icon (manual mode) | **Remove** (redundant) |

---

## Changes

### 1. Simplify ChatBottomNav.tsx
Remove the "Generate Scene" button from the bottom nav, leaving only "Character" and "Settings" buttons.

**Before:**
```
[Character] [Generate Scene] [Settings]
```

**After:**
```
[Character]            [Settings]
```

**Props to remove:**
- `onGenerateSceneClick`
- `isGenerating`

### 2. Remove Camera Icon from ChatMessage.tsx
Remove the manual mode camera icon button (lines 453-469) since the main "Generate Scene" button under each message serves this purpose.

### 3. Update MobileRoleplayChat.tsx
- Remove `onGenerateSceneClick` prop from `ChatBottomNav`
- Remove `isGenerating` prop from `ChatBottomNav`
- Clean up any unused state/handlers if applicable

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/roleplay/ChatBottomNav.tsx` | Remove Generate Scene button (lines 51-67), remove related props |
| `src/components/roleplay/ChatMessage.tsx` | Remove camera icon button (lines 453-469) |
| `src/pages/MobileRoleplayChat.tsx` | Update `ChatBottomNav` usage, remove unused props |

---

## Final Result

- **One button only**: "Generate Scene" button appears under each AI message that doesn't have a scene
- **No camera icons**: Removed from everywhere
- **Bottom nav simplified**: Shows only "Character" and "Settings" navigation

