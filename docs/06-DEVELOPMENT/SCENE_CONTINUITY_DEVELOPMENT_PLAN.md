# Scene Continuity Development Plan

**Date:** 2026-01-08
**Status:** Phase 1 Complete, Phase 2 Pending
**Priority:** HIGH - Core UX Enhancement

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Related Documentation](#2-related-documentation)
3. [Architecture Overview](#3-architecture-overview)
4. [Phase 1 Implementation Status](#4-phase-1-implementation-status)
5. [Phase 2 Implementation Plan](#5-phase-2-implementation-plan)
6. [Technical Details](#6-technical-details)
7. [Known Issues & Bugs Fixed](#7-known-issues--bugs-fixed)
8. [Testing Checklist](#8-testing-checklist)
9. [Future Enhancements](#9-future-enhancements)

---

## 1. Executive Summary

The Scene Continuity feature implements **I2I (image-to-image) iteration** for roleplay scene generation, maintaining visual continuity between scenes. This addresses the core problem where each scene was previously generated from scratch using T2I (text-to-image), causing:

- Character appearance drift between scenes
- Clothing state inconsistency (character re-dressed between scenes)
- Scene context lost (different room, lighting, etc.)
- Position/pose inconsistency

### Key Benefits for NSFW Content

I2I iteration is **critical for NSFW content** because it:
- Maintains physical continuity during intimate scenes
- Preserves clothing state during undressing sequences
- Enables progressive intimacy (kissing → undressing → more)
- Maintains relative positions in two-character scenes

### Current Status

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1** | ✅ Complete | Core I2I iteration infrastructure |
| **Phase 2** | 🔲 Pending | Quick modification UI & NSFW presets |

---

## 2. Related Documentation

| Document | Purpose | Path |
|----------|---------|------|
| Scene Generation Analysis | Comprehensive system overview | [docs/09-REFERENCE/SCENE_GENERATION_ANALYSIS.md](../09-REFERENCE/SCENE_GENERATION_ANALYSIS.md) |
| Scene Regeneration Architecture | I2I architecture recommendations | [docs/06-DEVELOPMENT/SCENE_REGENERATION_ARCHITECTURE_ANALYSIS.md](SCENE_REGENERATION_ARCHITECTURE_ANALYSIS.md) |
| Scene Regeneration Audit | Previous bug fixes & UX audit | [docs/06-DEVELOPMENT/SCENE_REGENERATION_AUDIT.md](SCENE_REGENERATION_AUDIT.md) |
| Original Plan | Implementation plan file | `~/.claude/plans/quizzical-giggling-hejlsberg.md` |

---

## 3. Architecture Overview

### Scene Generation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCENE GENERATION FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  First Scene (T2I):                                              │
│    User triggers scene                                           │
│         ↓                                                        │
│    Use Seedream v4/text-to-image                                │
│         ↓                                                        │
│    Character reference image for consistency                     │
│         ↓                                                        │
│    Save to workspace_assets                                      │
│         ↓                                                        │
│    Track as "previous_scene" for conversation                   │
│                                                                   │
│  Subsequent Scenes (I2I):                                        │
│    User triggers next scene                                      │
│         ↓                                                        │
│    Check scene_continuity_enabled                                │
│         ↓ (if enabled + has previous scene)                     │
│    Use Seedream v4.5/edit (I2I)                                 │
│         ↓                                                        │
│    Pass previous scene image as reference                        │
│         ↓                                                        │
│    Maintains visual continuity                                   │
│         ↓                                                        │
│    Update "previous_scene" for next iteration                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Model Selection Logic

```typescript
// Implemented in roleplay-chat edge function
const isFirstScene = !previousSceneId || !previousSceneImageUrl;
const useI2IIteration = sceneContinuityEnabled && !isFirstScene && !!previousSceneImageUrl;
const generationMode = useI2IIteration ? 'i2i' : 't2i';

if (useI2IIteration) {
  // I2I: Iterate on previous scene
  model = 'fal-ai/seedream/v4.5/edit';
  referenceImage = previousSceneImageUrl;
  strength = 0.45; // Scene-to-scene iteration
} else {
  // T2I: Generate from scratch
  model = 'fal-ai/seedream/v4/text-to-image';
  referenceImage = character.reference_image_url;
}
```

---

## 4. Phase 1 Implementation Status

### Completed Items ✅

#### 4.1 Database Schema

**Status:** ✅ Complete
**Location:** SQL migration via Supabase dashboard

```sql
ALTER TABLE character_scenes
ADD COLUMN IF NOT EXISTS previous_scene_id UUID REFERENCES character_scenes(id),
ADD COLUMN IF NOT EXISTS previous_scene_image_url TEXT,
ADD COLUMN IF NOT EXISTS generation_mode TEXT DEFAULT 't2i'
  CHECK (generation_mode IN ('t2i', 'i2i', 'modification'));
```

#### 4.2 Edge Function: I2I Routing Logic

**Status:** ✅ Complete
**File:** [supabase/functions/roleplay-chat/index.ts](../../supabase/functions/roleplay-chat/index.ts)

Key changes to `generateScene()`:
- Added parameters: `previousSceneId`, `previousSceneImageUrl`, `sceneContinuityEnabled`
- Added generation mode detection (T2I vs I2I)
- Added model_key_override for dynamic Seedream edit selection
- Stores lineage in character_scenes record

#### 4.3 Edge Function: fal-image Seedream Edit Support

**Status:** ✅ Complete
**File:** [supabase/functions/fal-image/index.ts](../../supabase/functions/fal-image/index.ts)

Key changes:
- Added `model_key_override` support for dynamic model switching
- Seedream edit models use `image_urls` array format
- Strength parameter for I2I iteration (default: 0.45)

#### 4.4 Frontend: useSceneContinuity Hook

**Status:** ✅ Complete
**File:** [src/hooks/useSceneContinuity.ts](../../src/hooks/useSceneContinuity.ts)

```typescript
interface UseSceneContinuityReturn {
  sceneContinuityEnabled: boolean;
  setSceneContinuityEnabled: (enabled: boolean) => void;
  previousSceneId: string | null;
  previousSceneImageUrl: string | null;
  setLastScene: (conversationId: string, sceneId: string, imageUrl: string) => void;
  clearLastScene: (conversationId: string) => void;
}
```

Features:
- Tracks enabled state in localStorage
- Tracks previous scene per conversation (memory)
- Provides setLastScene/clearLastScene for conversation management

#### 4.5 Frontend: Scene Continuity Toggle

**Status:** ✅ Complete
**File:** [src/components/roleplay/RoleplaySettingsModal.tsx](../../src/components/roleplay/RoleplaySettingsModal.tsx)

Added to "Image Generation" section:
- Toggle: "Scene Continuity"
- Description: "Link scenes together for visual continuity"
- Badge: "Beta"
- Default: Enabled

#### 4.6 Frontend: MobileRoleplayChat Integration

**Status:** ✅ Complete
**File:** [src/pages/MobileRoleplayChat.tsx](../../src/pages/MobileRoleplayChat.tsx)

Key changes:
- Import and use useSceneContinuity hook
- Track last scene after job completion
- Pass scene continuity parameters to all roleplay-chat calls:
  - `scene_continuity_enabled`
  - `previous_scene_id`
  - `previous_scene_image_url`
- Clear last scene on conversation clear

#### 4.7 Frontend: Inline Scene Display Fix

**Status:** ✅ Complete
**File:** [src/pages/MobileRoleplayChat.tsx](../../src/pages/MobileRoleplayChat.tsx)

Fixed `subscribeToJobCompletion`:
- Changed `metadata` to `generation_settings` (correct column name)
- Scenes now display inline in chat messages

---

## 5. Phase 2 Implementation Plan

### Overview

Phase 2 adds the **Quick Modification UI** - a user-facing interface for targeted scene modifications using I2I.

### 5.1 Quick Modification Bottom Sheet

**Status:** 🔲 Pending
**Priority:** High

Add a bottom sheet that appears when user taps a scene image:

```
┌────────────────────────────────────────┐
│ Scene Options                      [X] │
├────────────────────────────────────────┤
│                                        │
│ Quick Modifications                    │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│ │Regenerate│ │  Modify  │ │   Save   ││
│ └──────────┘ └──────────┘ └──────────┘│
│                                        │
│ NSFW Actions (if content_tier = nsfw)  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│ │ Undress  │ │Change Pos│ │  More... ││
│ └──────────┘ └──────────┘ └──────────┘│
│                                        │
│ Intensity   [Subtle] [Moderate] [Bold] │
│                                        │
└────────────────────────────────────────┘
```

### 5.2 NSFW Modification Presets

**Status:** 🔲 Pending
**Priority:** High

| Preset | Prompt Template | Strength |
|--------|-----------------|----------|
| Remove Top | "Remove upper clothing, maintain pose and setting" | 0.35 |
| Remove All Clothing | "Remove all clothing, maintain pose and setting" | 0.45 |
| Change Position | "Change position to {{position}}, maintain clothing and setting" | 0.40 |
| Intimate Progression | "Progress to more intimate interaction" | 0.30 |

### 5.3 Intensity Presets

**Status:** 🔲 Pending
**Priority:** Medium

| Intensity | Strength | Use Case |
|-----------|----------|----------|
| Subtle | 0.25-0.35 | Minor adjustments, same scene |
| Moderate | 0.40-0.50 | Noticeable changes, same characters |
| Bold | 0.55-0.70 | Major changes, may alter setting |

### 5.4 New Prompt Templates

**Status:** 🔲 Pending
**Priority:** Medium

Add to `prompt_templates` table:

| Template Name | Use Case | Content Mode |
|---------------|----------|--------------|
| `Scene Iteration - NSFW` | Continue scene I2I | nsfw |
| `Scene Iteration - SFW` | Continue scene I2I | sfw |
| `Scene Modification - Clothing` | Change outfit | nsfw/sfw |
| `Scene Modification - Position` | Change pose | nsfw/sfw |
| `Scene Modification - Setting` | Change location | nsfw/sfw |

### 5.5 UI/UX Improvements (from Architecture Doc)

**Status:** 🔲 Pending
**Priority:** Low-Medium

Per [SCENE_REGENERATION_ARCHITECTURE_ANALYSIS.md](SCENE_REGENERATION_ARCHITECTURE_ANALYSIS.md):

1. **Admin Debug Panel**: Make collapsible, hover-revealed
2. **Edit Button**: Hover reveal instead of always visible
3. **Info Boxes**: Convert to tooltips or collapsible sections
4. **Reference Image Preview**: Add thumbnail in edit modal

---

## 6. Technical Details

### 6.1 Strength Parameters

#### Scene-to-Scene Iteration

| Scenario | Strength | Rationale |
|----------|----------|-----------|
| Conversation continues | 0.30-0.40 | Minimal change, same scene |
| Minor action | 0.40-0.50 | Same setting, slight pose change |
| Major action | 0.50-0.60 | Same characters, new pose |
| New location | 0.60-0.70 | Keep characters, change setting |

**Current Default:** 0.45 (implemented in roleplay-chat)

#### NSFW Modification Presets (Phase 2)

| Modification | Strength | Preserve |
|--------------|----------|----------|
| Remove top | 0.35 | Face, pose, setting |
| Remove all clothing | 0.45 | Face, pose, setting |
| Change position | 0.40 | Face, clothing, setting |
| Intimate progression | 0.30 | Face, body, interaction |

### 6.2 Model Routing

| Generation Mode | Model | Reference Image |
|-----------------|-------|-----------------|
| T2I (first scene) | `seedream/v4/text-to-image` | Character portrait |
| I2I (subsequent) | `seedream/v4.5/edit` | Previous scene |
| Modification | `seedream/v4.5/edit` | Current scene |

### 6.3 Data Flow

```
Frontend (MobileRoleplayChat)
    │
    ├── useSceneContinuity() hook
    │       └── Tracks: enabled, previousSceneId, previousSceneUrl
    │
    ├── handleSendMessage() / handleGenerateScene()
    │       └── Passes: scene_continuity_enabled, previous_scene_id, previous_scene_image_url
    │
    └── subscribeToJobCompletion()
            └── On completion: setLastScene() to update hook state

Edge Function (roleplay-chat)
    │
    ├── generateScene()
    │       ├── Detects: isFirstScene, useI2IIteration
    │       ├── Selects: model (T2I or I2I)
    │       └── Passes: model_key_override to fal-image
    │
    └── Creates character_scenes record with:
            ├── previous_scene_id
            ├── previous_scene_image_url
            └── generation_mode

Edge Function (fal-image)
    │
    ├── Checks: model_key_override
    ├── For Seedream edit: uses image_urls array
    └── Creates workspace_asset with job_id
```

---

## 7. Known Issues & Bugs Fixed

### 7.1 Fixed: workspace_assets Query Column Error

**Issue:** Query failed with "column workspace_assets.metadata does not exist"
**Root Cause:** The `subscribeToJobCompletion` function queried for `metadata` column which doesn't exist
**Fix:** Changed to `generation_settings` column
**Date Fixed:** 2026-01-08

```typescript
// Before (broken)
.select('id, temp_storage_path, metadata')

// After (fixed)
.select('id, temp_storage_path, generation_settings')
```

### 7.2 Fixed: Scenes Not Appearing Inline

**Issue:** Scenes generated successfully but didn't appear in chat messages
**Root Cause:** The column name error caused the query to fail, so `image_url` was never set on the message
**Fix:** Same as 7.1 - correct column name
**Date Fixed:** 2026-01-08

### 7.3 Known: Maximum Update Depth Warning

**Issue:** "Maximum update depth exceeded" warning from `useMobileDetection.ts`
**Status:** Not blocking, separate issue
**Impact:** Console warning only, scene functionality works
**Priority:** Low

### 7.4 Previous Fix: Regeneration Error (from Audit)

**Issue:** "Missing required information for regeneration" error
**Root Cause:** `conversationId` not passed from MobileRoleplayChat to ChatMessage
**Fix:** Added `conversationId` prop to ChatMessage interface
**Date Fixed:** 2026-01-07 (documented in SCENE_REGENERATION_AUDIT.md)

---

## 8. Testing Checklist

### Phase 1 Testing

- [x] Database columns added to character_scenes
- [x] First scene uses T2I (Seedream v4/text-to-image)
- [x] Scene continuity toggle appears in settings
- [x] Scene continuity toggle persists in localStorage
- [x] Subsequent scenes use I2I when continuity enabled
- [x] Scenes appear inline in chat messages
- [x] Previous scene tracked per conversation
- [x] Clear conversation clears previous scene
- [x] Toggling off continuity reverts to T2I behavior
- [ ] Visual consistency improves across 3+ scene chain
- [ ] NSFW: Clothing state persists across scenes

### Phase 2 Testing (Future)

- [ ] Quick modification bottom sheet appears on scene tap
- [ ] NSFW presets work correctly
- [ ] Intensity presets affect strength parameter
- [ ] Modification uses current scene as reference
- [ ] Admin debug panel is collapsible

---

## 9. Future Enhancements

### 9.1 Scene Branching

Allow users to "branch" from any previous scene, not just the most recent:
- Add scene history viewer
- "Use as reference" button on any scene
- Scene tree visualization

### 9.2 Consistency Scoring

Implement actual visual consistency measurement:
- Use CLIP embeddings to compare scenes
- Track consistency scores per character over time
- Display consistency metrics in UI

### 9.3 Multi-Character I2I

Enhanced support for two-character scenes:
- Track positions of both characters
- Maintain relative positioning across scenes
- Individual character modifications

### 9.4 User Preference Sync

Move scene continuity preference to database:
- Add to user_settings table
- Sync across devices
- Per-conversation override option

---

## Appendix: File Reference

### Modified Files (Phase 1)

| File | Changes |
|------|---------|
| `supabase/functions/roleplay-chat/index.ts` | I2I routing, scene lineage tracking |
| `supabase/functions/fal-image/index.ts` | model_key_override support |
| `src/hooks/useSceneContinuity.ts` | New hook (created) |
| `src/pages/MobileRoleplayChat.tsx` | Hook integration, scene tracking |
| `src/components/roleplay/RoleplaySettingsModal.tsx` | Continuity toggle |

### New Files (Phase 1)

| File | Purpose |
|------|---------|
| `src/hooks/useSceneContinuity.ts` | Scene continuity state management |

### Phase 2 Files (To Be Created)

| File | Purpose |
|------|---------|
| `src/components/roleplay/SceneModificationSheet.tsx` | Quick modification bottom sheet |
| `src/components/roleplay/NSFWPresets.tsx` | NSFW modification presets |

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-08 | Phase 1 complete, fixed inline scene display | Claude |
| 2026-01-07 | Phase 1 implementation started | Claude |
| 2026-01-07 | Architecture analysis documented | Claude |
| 2026-01-07 | Regeneration audit complete | Claude |
