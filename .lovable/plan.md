

## Comprehensive Fix: Roleplay Settings Modals and Tile Images

### Overview

Three settings modals need fixes, plus the "Continue" tile image flash/disappear bug.

---

### 1. Continue Conversation Tile Images Flash and Disappear

**Problem:** `useUserConversations` signs `last_scene_image` URLs but never signs `character.image_url`. When a scene image errors out (or doesn't exist), the tile falls back to `character.image_url` which is a raw storage path -- this fails to load, triggers `onError`, and permanently hides the image via `erroredSceneImages` state.

**Fix in `src/hooks/useUserConversations.ts`:**
- In the signing step (around line 196), also sign `character.image_url` if it's a storage path (not already `http`)
- Sign from `user-library` bucket (character images are stored there)

**Fix in `src/pages/MobileRoleplayDashboard.tsx`:**
- The `onError` handler currently marks the conversation as errored regardless of which image failed. Since we now sign character URLs too, this should resolve naturally. Keep the error handler but only for genuine failures.

---

### 2. DashboardSettings (Roleplay Dashboard Page - Settings Sheet)

**File:** `src/components/roleplay/DashboardSettings.tsx`

**Current state:** Uses `useImageModels()` which returns T2I models. This is wrong for the always-I2I architecture.

**Changes:**
- Replace `useImageModels()` with `useI2IModels()` 
- Update label from "Image Model" to "I2I Model"
- This sheet is already compact (bottom sheet, `max-h-[60vh]`) -- no size issues

---

### 3. RoleplaySettingsModal (Chat Page - Advanced Settings)

**File:** `src/components/roleplay/RoleplaySettingsModal.tsx`

**Current state:** The Models tab (lines 1005-1174) has three selectors: Chat Model, T2I Model, and I2I Model.

**Changes:**
- **Remove the T2I Model selector** (lines 1060-1121) -- T2I has no place in roleplay's always-I2I architecture
- **Add I2I Multi selector** -- Import `useI2IModels` with `'i2i_multi'` task filter for multi-reference model selection. Add a new selector after the existing I2I selector labeled "I2I Multi Model" with subtitle "Multi-reference (2+ characters)"
- **Verify modal height** -- Currently uses `flex flex-col` with `overflow-y-auto` on the content area. The Sheet side="right" with `w-[85vw] sm:w-[400px]` should be fine since it's full-height. No height fix needed (the "stuck at bottom" issue was likely related to the T2I selector adding unnecessary height).

---

### 4. ScenarioSetupWizard (Scene Start Page)

**File:** `src/components/roleplay/ScenarioSetupWizard.tsx`

**Current state:** The wizard has no model selectors -- it only has character, scenario, vibe, and start (hook) steps. Model selection happens via the dashboard settings or chat settings before/during the session.

**No changes needed** for this component.

---

### 5. QuickSettingsDrawer (Mobile Chat - Quick Settings)

**File:** `src/components/roleplay/QuickSettingsDrawer.tsx`

**Current state:** Already correctly shows Chat Model and I2I Model selectors. No T2I reference.

**No changes needed.**

---

### Technical Summary

| File | Change |
|------|--------|
| `src/hooks/useUserConversations.ts` | Sign `character.image_url` alongside `last_scene_image` in the URL signing step |
| `src/pages/MobileRoleplayDashboard.tsx` | Minor: ensure error handling doesn't permanently hide tiles after signing fix |
| `src/components/roleplay/DashboardSettings.tsx` | Replace `useImageModels()` with `useI2IModels()`, update labels |
| `src/components/roleplay/RoleplaySettingsModal.tsx` | Remove T2I selector, add I2I Multi selector using `useI2IModels('i2i_multi')` |

