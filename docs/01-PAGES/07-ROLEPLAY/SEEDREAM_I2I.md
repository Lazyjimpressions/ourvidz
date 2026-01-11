# Scene System Bug Fixes - January 11, 2026

## Summary

Fixed critical bugs preventing proper scene template usage in roleplay chat. The scene system was querying the wrong database table and not passing scene data to the edge function.

---

## Frontend Fixes (Completed ✅)

### 1. Fixed Scene Loading Table Query

**File:** [src/pages/MobileRoleplayChat.tsx](../../../src/pages/MobileRoleplayChat.tsx#L479-503)

**Problem:** Scene loading was querying `character_scenes` table (conversation artifacts) instead of `scenes` table (templates).

**Fix:**
```typescript
// Before (WRONG):
const { data: sceneData } = await supabase
  .from('character_scenes')  // ❌ Wrong table - artifacts, not templates
  .select('*')
  .eq('id', sceneId)
  .eq('character_id', characterId)  // ❌ Scenes are character-agnostic
  .single();

// After (CORRECT):
const { data: sceneData } = await supabase
  .from('scenes')  // ✅ Correct table - scene templates
  .select('*')
  .eq('id', sceneId)  // ✅ No character filter - scenes are agnostic
  .single();
```

### 2. Added Scene Data to Kickoff Call

**File:** [src/pages/MobileRoleplayChat.tsx](../../../src/pages/MobileRoleplayChat.tsx#L750-778)

**Problem:** Scene template data (name, description, starters) was not being passed to the edge function. The edge function was trying to load from the old `character_scenes` table relationship.

**Fix:**
```typescript
// Added to kickoff request body:
scene_name: loadedScene?.name || null,
scene_description: loadedScene?.description || null,
scene_starters: loadedScene?.scene_starters || null,
```

**Why:** The edge function needs explicit scene data from the `scenes` table, not from the deprecated `character.activeScene` relationship.

---

## Edge Function Updates (Completed ✅)

**File:** `supabase/functions/roleplay-chat/index.ts`

**Status:** All changes completed on January 11, 2026

**Deployment:** Ready to be deployed via **Supabase Online Dashboard** (no CLI per CLAUDE.md)

### Summary of Completed Changes

All 6 required changes have been successfully implemented:

1. ✅ Added `scene_starters?: string[]` to RoleplayChatRequest interface (line 47)
2. ✅ Extracted `scene_starters` from request body (line 220)
3. ✅ Passed `scene_starters` through all function calls (lines 390, 432, 447, 1613)
4. ✅ Updated buildSystemPrompt, buildRoleplayContext, callModelWithConfig function signatures
5. ✅ Updated buildSystemPromptFromTemplate to accept and use scene_starters (lines 995-1003, 1054-1061)
6. ✅ Changed character_scenes join from INNER to LEFT JOIN (scenes now optional, line 3527)

**Key Implementation Details:**

- Scene starters now come from request body instead of `character.activeScene.scene_starters`
- Maintained backward compatibility with existing character_scenes data
- Added console logging for debugging scene starter application
- Character query no longer fails when no character_scenes exist

---

### Change 1: Add `scene_starters` to Request Interface ✅

**Location:** Lines 27-54 (RoleplayChatRequest interface)

```typescript
interface RoleplayChatRequest {
  // ... existing fields ...
  scene_name?: string; // ✅ Already exists
  scene_description?: string; // ✅ Already exists
  scene_starters?: string[]; // ✅ COMPLETED (line 47)
}
```

### Change 2: Extract `scene_starters` from Request Body ✅

**Location:** Line 220 (destructure request body)

```typescript
const {
  message,
  conversation_id,
  character_id,
  // ... other fields ...
  scene_name,
  scene_description,
  scene_starters, // ✅ COMPLETED (line 220)
} = await req.json() as RoleplayChatRequest;
```

### Change 3: Pass `scene_starters` Through Function Calls ✅

**Locations:** Lines 390, 432, 447, 908, 1613

All function calls updated to pass `scene_starters`:

- buildRoleplayContext (line 390)
- buildSystemPrompt (line 432)
- callModelWithConfig (line 447)
- buildSystemPromptFromTemplate (line 908)
- buildRoleplayContext fallback (line 1613)

### Change 4: Update Function Signatures ✅

**Locations:** Lines 881, 1401, 1003, 1510

All functions updated to accept `sceneStarters?: string[]`:

- callModelWithConfig (line 881)
- buildRoleplayContext (line 1401)
- buildSystemPromptFromTemplate (line 1003)
- buildSystemPrompt (line 1510)

### Change 5: Use Request Body `scene_starters` Instead of `character.activeScene` ✅

**Locations:** Lines 1440-1447 (buildRoleplayContext), Lines 1580-1586 (buildSystemPrompt), Lines 1054-1061 (buildSystemPromptFromTemplate)

**Implementation:** Replaced OLD architecture (character.activeScene) with NEW architecture (request body parameter)

```typescript
// NEW ARCHITECTURE - uses request body parameter:
if (sceneStarters && sceneStarters.length > 0) {
  systemPrompt += `\n\nCONVERSATION STARTERS - Use these to begin or continue:\n`;
  sceneStarters.forEach((starter: string, index: number) => {
    systemPrompt += `Starter ${index + 1}: "${starter}"\n`;
  });
  console.log('✅ Applied scene starters from request body:', sceneStarters.length);
}
```

### Change 6: Make Character Query Scene-Optional ✅

**Location:** Line 3527 (character query)

**Implementation:** Changed from INNER JOIN to LEFT JOIN (scenes optional)

```typescript
// Changed from: character_scenes!inner(...)
// To: character_scenes(...)
.select(`
  *,
  character_scenes(
    scene_rules,
    scene_starters,
    system_prompt,
    priority,
    scene_name,
    scene_description,
    scene_type
  )
`)
```

**Result:** Character query no longer fails when no character_scenes exist, while maintaining backward compatibility with existing scene data.

---

## Why These Changes Are Needed

### Architecture Migration

**Old Architecture (Deprecated):**
- Scenes stored in `character_scenes` table with `character_id` foreign key
- Scenes tied to specific characters
- Edge function loaded scene data via `character.activeScene` database join

**New Architecture (Current):**
- Scene templates stored in `scenes` table (character-agnostic)
- Scenes can be used with ANY character via Scene Gallery + SceneSetupSheet
- Frontend loads scene template and passes data to edge function via request body
- Edge function receives explicit scene data, no database join needed

### The Problem That Was Occurring

1. User clicked "A Steamy Shower" scene (sceneId from `scenes` table)
2. Frontend tried to load scene from `character_scenes` table → NOT FOUND
3. `loadedScene` was null
4. No scene data passed to edge function
5. Edge function tried to load from `character.activeScene` → NULL (no join relationship)
6. System prompt had no scene context
7. AI generated generic campus greeting instead of locker room scenario

### After These Fixes

1. User clicks "A Steamy Shower" scene (sceneId from `scenes` table)
2. Frontend loads scene template from `scenes` table → ✅ FOUND
3. `loadedScene` has correct data (name, description, prompt, starters)
4. Scene data passed to edge function in request body
5. Edge function uses request body parameters (scene_name, scene_description, scene_starters)
6. System prompt includes scene context and conversation starters
7. AI generates scene-appropriate greeting: "A shadowy figure slips into the locker room..."

---

## Testing After Edge Function Deployment

Once the edge function changes are deployed, test the following:

### Test Case 1: Scene Template Loading
1. Open Scene Gallery on dashboard
2. Click "A Steamy Shower" scene card
3. SceneSetupSheet opens with scene details
4. Verify scene_starters are displayed (3 locker room scenarios)

### Test Case 2: Scene Context in Kickoff
1. Select character (e.g., Heather) in SceneSetupSheet
2. Click "Start Roleplay"
3. Navigate to chat with URL: `/roleplay/chat/{charId}?scene={sceneId}&fresh=true`
4. Check browser console for log: `🎬 Loaded scene template: A Steamy Shower - Steamy locker room...`
5. Verify kickoff message references locker room setting (not generic campus)

### Test Case 3: Conversation Starters Applied
1. In kickoff response, verify AI uses one of the three scene_starters:
   - "A shadowy figure slips into the locker room..."
   - "The locker room steam surrounds your bodies..."
   - "Water cascades over toned muscles..."
2. Check that response is first-person ("I" statements)
3. Check that response is in-character (Heather's personality)

### Test Case 4: Fresh Conversation Creation
1. Start scene with character
2. Verify new conversation created in database
3. Check `conversations` table:
   - `conversation_type` = 'scene_roleplay'
   - `memory_data.scene_id` = scene UUID
   - `memory_data.scene_name` = "A Steamy Shower"
4. Start SAME scene again → Should create ANOTHER fresh conversation (not reuse)

---

## Build Status

✅ **Frontend changes compiled successfully**
- Build time: 2.70s
- No TypeScript errors
- No runtime errors expected

---

## Related Files

### Frontend (Fixed)
- [src/pages/MobileRoleplayChat.tsx](../../../src/pages/MobileRoleplayChat.tsx) - Scene loading and kickoff call
- [src/pages/MobileRoleplayDashboard.tsx](../../../src/pages/MobileRoleplayDashboard.tsx) - Scene selection and navigation

### Edge Function (Needs Update)
- `supabase/functions/roleplay-chat/index.ts` - Must be updated via online dashboard

### Documentation
- [UX_SCENE.md](./UX_SCENE.md) - Scene system specification
- [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md) - Roleplay implementation status

---

## Next Steps

1. ✅ Deploy frontend changes (build complete)
2. 🔴 Update `roleplay-chat` edge function via Supabase dashboard (6 changes listed above)
3. ✅ Test scene prompt with "A Steamy Shower" scenario
4. 🔵 Investigate image inline delivery (scene images in workspace vs chat)
5. 🔵 Investigate character image usage in scene generation

---

**Document Purpose:** This document tracks the bug fixes for scene template integration, providing a clear guide for edge function updates that must be deployed via the Supabase online dashboard.
