# Scene Continuity I2I Fix Plan

**Date:** 2026-01-10  
**Status:** Ready for Implementation  
**Priority:** Critical

## Executive Summary

This plan addresses 5 critical issues preventing scene continuity I2I from working correctly:
1. **Model override not applied** - I2I scenes still use v4 instead of v4.5/edit
2. **First scene detection failing** - First scenes marked as `i2i` instead of `t2i`
3. **Scene Iteration templates not used** - I2I scenes use wrong prompt templates
4. **Scene Generation Modal missing continuity** - Modal doesn't pass continuity parameters
5. **Scene records missing** - Scenes not found in `character_scenes` table

## Issue 1: Model Override Not Applied (CRITICAL)

### Problem
Model override condition requires both `useI2IIteration` AND `previousSceneImageUrl`, but `previousSceneImageUrl` is often null, causing I2I mode to be detected but wrong model to be used.

### Root Cause
**File:** `supabase/functions/roleplay-chat/index.ts` line 2734

The condition `useI2IIteration && previousSceneImageUrl` fails when:
- Scene records don't exist in `character_scenes` table
- Scene records exist but `image_url` is null (not updated after generation)
- Frontend hook can't find previous scene

**Critical Understanding:**
- The edit model (v4.5/edit) **REQUIRES** a previous image for I2I to work
- If no previous scene image exists, we should **fall back to T2I** (v4 text-to-image), not try to use I2I
- The real fix is ensuring `previousSceneImageUrl` is always available when it should be

### Fix Strategy

**CORRECTED APPROACH:**
1. **Fix the mode detection** - If `previousSceneImageUrl` is missing, force T2I mode (not I2I)
2. **Fix scene record creation/lookup** - Ensure scenes are created and image URLs are updated
3. **Add scene persistence** - Save scenes to library (like character images) for longer persistence
4. **Improve fallback logic** - If continuity is enabled but no previous scene, use T2I with character reference

**Key Principle:** I2I mode should ONLY be used when we have a valid previous scene image. Otherwise, fall back to T2I.

### Implementation

#### Fix 1.1: Fix Mode Detection - Require Previous Scene Image for I2I

**File:** `supabase/functions/roleplay-chat/index.ts`

**Location:** Lines 2042-2077 (mode detection) and 2734-2748 (model override)

**Current Code (Mode Detection):**
```typescript
const isFirstScene = !previousSceneId || !previousSceneImageUrl;
const useI2IIteration = sceneContinuityEnabled && !isFirstScene && !!previousSceneImageUrl;
```

**Problem:** `useI2IIteration` can be true even if `previousSceneImageUrl` is null (due to timing issues or missing records).

**Fixed Code (Mode Detection):**
```typescript
// ✅ FIX: More robust first scene detection
// A scene is "first" if no valid previous scene image exists
let isFirstScene = true;

if (previousSceneId && previousSceneImageUrl) {
  // Verify the previous scene actually exists and has an image
  try {
    const { data: prevScene, error: prevSceneError } = await supabase
      .from('character_scenes')
      .select('id, image_url')
      .eq('id', previousSceneId)
      .not('image_url', 'is', null)
      .single();
    
    if (!prevSceneError && prevScene && prevScene.image_url) {
      isFirstScene = false;
      console.log('✅ Previous scene verified:', {
        scene_id: previousSceneId,
        has_image: !!prevScene.image_url
      });
    } else {
      console.warn('⚠️ Previous scene ID provided but scene not found or missing image:', {
        scene_id: previousSceneId,
        error: prevSceneError?.message
      });
      isFirstScene = true; // Treat as first scene if previous doesn't exist
    }
  } catch (error) {
    console.warn('⚠️ Error verifying previous scene:', error);
    isFirstScene = true;
  }
} else if (previousSceneId && !previousSceneImageUrl) {
  // Scene ID provided but no image URL - likely scene not completed yet
  console.warn('⚠️ Previous scene ID provided but no image URL - treating as first scene');
  isFirstScene = true;
}

// ✅ CRITICAL: I2I mode REQUIRES a valid previous scene image
// If no previous scene image, force T2I mode even if continuity is enabled
const useI2IIteration = sceneContinuityEnabled && !isFirstScene && !!previousSceneImageUrl;

if (sceneContinuityEnabled && !previousSceneImageUrl) {
  console.warn('⚠️ Scene continuity enabled but no previous scene image - falling back to T2I mode');
}
```

**Fixed Code (Model Override):**
```typescript
} else if (useI2IIteration && previousSceneImageUrl) {
  // ✅ I2I continuation mode: Use Seedream v4.5/edit with previous scene as reference
  // This block only executes if previousSceneImageUrl is valid (enforced above)
  i2iModelOverride = 'fal-ai/bytedance/seedream/v4.5/edit';
  i2iReferenceImage = previousSceneImageUrl;
  i2iStrength = effectiveDenoiseStrength ?? 0.45;
  console.log('🔄 I2I Iteration Mode: Using Seedream v4.5/edit with previous scene', {
    strength: i2iStrength,
    strength_source: effectiveDenoiseStrength ? 'user_override' : 'default',
    previous_scene_id: previousSceneId
  });
} else if (sceneContinuityEnabled && !previousSceneImageUrl) {
  // ✅ Fallback: Continuity enabled but no previous scene - use T2I with character reference
  // This ensures we don't try to use I2I model without a reference image
  console.log('📝 Scene continuity enabled but no previous scene - using T2I mode with character reference');
  // Continue with T2I mode (no model override, will use v4 text-to-image)
}
```

**Impact:**
- I2I mode only used when previous scene image is available
- Falls back to T2I if previous scene missing (prevents broken I2I calls)
- Better logging for debugging mode selection
- Prevents the "I2I mode but wrong model" issue

#### Fix 1.2: Ensure Scene Records Are Created

**File:** `supabase/functions/roleplay-chat/index.ts`

**Location:** Lines 2378-2420

**Issue:** Scene records may fail to create silently, causing next scene to not find previous scene.

**Fix:** Add better error handling and ensure scene is created before generation starts.

**Current Code:**
```typescript
const { data: sceneRecord, error: sceneError } = await supabase
  .from('character_scenes')
  .insert({...})
  .select('id')
  .single();

if (sceneError || !sceneRecord) {
  console.error('🎬❌ Failed to create scene record:', sceneError);
  // Continue with generation but scene won't be linked
} else {
  sceneId = sceneRecord.id;
  console.log('✅ Scene record created with ID:', sceneId);
}
```

**Fixed Code:**
```typescript
const { data: sceneRecord, error: sceneError } = await supabase
  .from('character_scenes')
  .insert({...})
  .select('id')
  .single();

if (sceneError || !sceneRecord) {
  console.error('🎬❌ Failed to create scene record:', sceneError);
  // Retry once with simplified data
  try {
    const { data: retryRecord, error: retryError } = await supabase
      .from('character_scenes')
      .insert({
        character_id: characterId,
        conversation_id: conversationId || null,
        scene_prompt: cleanScenePrompt || scenePrompt,
        generation_mode: generationMode,
        previous_scene_id: previousSceneId || null,
        previous_scene_image_url: previousSceneImageUrl || null
      })
      .select('id')
      .single();
    
    if (!retryError && retryRecord) {
      sceneId = retryRecord.id;
      console.log('✅ Scene record created on retry with ID:', sceneId);
    } else {
      console.error('🎬❌ Retry also failed:', retryError);
      // Continue without scene record - generation will still work
    }
  } catch (retryErr) {
    console.error('🎬❌ Retry exception:', retryErr);
  }
} else {
  sceneId = sceneRecord.id;
  console.log('✅ Scene record created with ID:', sceneId);
}
```

#### Fix 1.3: Ensure Scene Image URL Is Updated

**File:** `supabase/functions/fal-image/index.ts`

**Location:** Lines 1292-1311

**Issue:** Scene image URL update may fail silently.

**Fix:** Add retry logic and better error handling.

**Current Code:**
```typescript
if ((body.metadata?.destination === 'character_scene' || body.metadata?.destination === 'roleplay_scene') && body.metadata?.scene_id) {
  const { error: sceneUpdateError } = await supabase
    .from('character_scenes')
    .update({
      image_url: sceneImagePath,
      updated_at: new Date().toISOString()
    })
    .eq('id', body.metadata.scene_id);

  if (sceneUpdateError) {
    console.warn('⚠️ Failed to update character scene:', sceneUpdateError);
  } else {
    console.log('✅ Character scene updated successfully');
  }
}
```

**Fixed Code:**
```typescript
if ((body.metadata?.destination === 'character_scene' || body.metadata?.destination === 'roleplay_scene') && body.metadata?.scene_id) {
  console.log('🎬 Updating character scene for:', body.metadata.scene_id, '(destination:', body.metadata.destination, ')');

  // Determine the full image path - only prepend bucket if it's a storage path (not external URL)
  const sceneImagePath = storagePath.startsWith('http') ? storagePath : `workspace-temp/${storagePath}`;

  const { error: sceneUpdateError } = await supabase
    .from('character_scenes')
    .update({
      image_url: sceneImagePath,
      updated_at: new Date().toISOString()
    })
    .eq('id', body.metadata.scene_id);

  if (sceneUpdateError) {
    console.error('❌ Failed to update character scene:', sceneUpdateError);
    // Retry once
    const { error: retryError } = await supabase
      .from('character_scenes')
      .update({
        image_url: sceneImagePath,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.metadata.scene_id);
    
    if (retryError) {
      console.error('❌ Retry also failed:', retryError);
    } else {
      console.log('✅ Character scene updated on retry');
    }
  } else {
    console.log('✅ Character scene updated successfully:', {
      scene_id: body.metadata.scene_id,
      image_url: sceneImagePath.substring(0, 60) + '...'
    });
  }
}
```

---

## Issue 2: First Scene Detection Failing

### Problem
First scenes are incorrectly marked as `i2i` instead of `t2i` in the database.

### Root Cause
**File:** `supabase/functions/roleplay-chat/index.ts` lines 2042-2077

The `isFirstScene` detection may be failing if `previousSceneId` or `previousSceneImageUrl` are passed but invalid.

### Fix

**File:** `supabase/functions/roleplay-chat/index.ts`

**Location:** Lines 2042-2077

**Current Code:**
```typescript
const isFirstScene = !previousSceneId || !previousSceneImageUrl;
```

**Fixed Code:**
```typescript
// More robust first scene detection
// A scene is "first" if:
// 1. No previous scene ID provided, OR
// 2. Previous scene ID provided but no image URL, OR
// 3. Previous scene ID provided but scene doesn't exist in DB
let isFirstScene = true;

if (previousSceneId && previousSceneImageUrl) {
  // Verify the previous scene actually exists and has an image
  try {
    const { data: prevScene, error: prevSceneError } = await supabase
      .from('character_scenes')
      .select('id, image_url')
      .eq('id', previousSceneId)
      .not('image_url', 'is', null)
      .single();
    
    if (!prevSceneError && prevScene && prevScene.image_url) {
      isFirstScene = false;
      console.log('✅ Previous scene verified:', {
        scene_id: previousSceneId,
        has_image: !!prevScene.image_url
      });
    } else {
      console.warn('⚠️ Previous scene ID provided but scene not found or missing image:', {
        scene_id: previousSceneId,
        error: prevSceneError?.message
      });
      // Treat as first scene if previous scene doesn't exist
      isFirstScene = true;
    }
  } catch (error) {
    console.warn('⚠️ Error verifying previous scene:', error);
    isFirstScene = true;
  }
} else if (previousSceneId && !previousSceneImageUrl) {
  // Scene ID provided but no image URL - likely scene not completed yet
  console.warn('⚠️ Previous scene ID provided but no image URL - treating as first scene');
  isFirstScene = true;
} else {
  // No previous scene info - definitely first scene
  isFirstScene = true;
}
```

**Impact:**
- First scenes will be correctly identified
- Database will show correct `generation_mode: 't2i'` for first scenes
- Subsequent scenes will correctly use I2I mode

---

## Issue 3: Scene Iteration Templates Not Used

### Problem
I2I scenes use "Scene Narrative" templates instead of "Scene Iteration" templates, leading to suboptimal prompts for iterative generation.

### Root Cause
**File:** `supabase/functions/roleplay-chat/index.ts` lines 2124-2220

The `generateSceneNarrativeWithOpenRouter` function doesn't receive or check for I2I mode.

### Fix

**File:** `supabase/functions/roleplay-chat/index.ts`

#### Fix 3.1: Update Function Signature

**Location:** Line 2124

**Current Code:**
```typescript
async function generateSceneNarrativeWithOpenRouter(
  character: any,
  sceneContext: any,
  conversationHistory: string[],
  characterVisualDescription: string,
  modelKey: string,
  contentTier: string,
  modelConfig: any,
  supabase: any
): Promise<string> {
```

**Fixed Code:**
```typescript
async function generateSceneNarrativeWithOpenRouter(
  character: any,
  sceneContext: any,
  conversationHistory: string[],
  characterVisualDescription: string,
  modelKey: string,
  contentTier: string,
  modelConfig: any,
  supabase: any,
  useI2IIteration: boolean = false  // ✅ ADD THIS PARAMETER
): Promise<string> {
```

#### Fix 3.2: Update Template Selection Logic

**Location:** Line 2140

**Current Code:**
```typescript
const templateName = contentTier === 'nsfw' ? 'Scene Narrative - NSFW' : 'Scene Narrative - SFW';
```

**Fixed Code:**
```typescript
// ✅ FIX: Use Scene Iteration template for I2I, Scene Narrative for T2I
const templateName = useI2IIteration
  ? (contentTier === 'nsfw' ? 'Scene Iteration - NSFW' : 'Scene Iteration - SFW')
  : (contentTier === 'nsfw' ? 'Scene Narrative - NSFW' : 'Scene Narrative - SFW');

console.log('📝 Scene narrative template selection:', {
  useI2IIteration,
  contentTier,
  templateName,
  generation_mode: useI2IIteration ? 'i2i' : 't2i'
});
```

#### Fix 3.3: Update Function Call

**Location:** Line 2275

**Current Code:**
```typescript
scenePrompt = await generateSceneNarrativeWithOpenRouter(
  character,
  sceneContext,
  conversationHistory,
  characterVisualDescription,
  roleplayModel,
  sceneContext.isNSFW ? 'nsfw' : 'sfw',
  modelConfig,
  supabase
);
```

**Fixed Code:**
```typescript
scenePrompt = await generateSceneNarrativeWithOpenRouter(
  character,
  sceneContext,
  conversationHistory,
  characterVisualDescription,
  roleplayModel,
  sceneContext.isNSFW ? 'nsfw' : 'sfw',
  modelConfig,
  supabase,
  useI2IIteration  // ✅ PASS I2I FLAG
);
```

**Impact:**
- I2I scenes will use iteration-specific prompts optimized for continuity
- T2I scenes continue using narrative templates
- Better prompt quality for scene-to-scene transitions

---

## Issue 4: Scene Generation Modal Missing Continuity Parameters

### Problem
The `generateSceneNarrative` function in `useSceneNarrative.ts` doesn't pass scene continuity parameters to the edge function, breaking I2I for modal-based scene generation.

### Root Cause
**File:** `src/hooks/useSceneNarrative.ts` lines 113-126

The function doesn't accept or pass `scene_continuity_enabled`, `previous_scene_id`, or `previous_scene_image_url`.

### Fix

#### Fix 4.1: Update Hook to Accept Continuity Parameters

**File:** `src/hooks/useSceneNarrative.ts`

**Location:** Lines 31-35

**Current Code:**
```typescript
const generateSceneNarrative = useCallback(async (
  scenePrompt: string,
  characters: CharacterParticipant[] = [],
  options: SceneNarrativeOptions = {}
): Promise<string | undefined> => {
```

**Fixed Code:**
```typescript
const generateSceneNarrative = useCallback(async (
  scenePrompt: string,
  characters: CharacterParticipant[] = [],
  options: SceneNarrativeOptions = {},
  // ✅ ADD: Scene continuity parameters
  sceneContinuityEnabled?: boolean,
  previousSceneId?: string | null,
  previousSceneImageUrl?: string | null
): Promise<string | undefined> => {
```

#### Fix 4.2: Pass Continuity Parameters to Edge Function

**Location:** Lines 113-126

**Current Code:**
```typescript
const { data, error } = await supabase.functions.invoke('roleplay-chat', {
  body: {
    message: enhancedPrompt,
    conversation_id: options.conversationId || null,
    character_id: options.characterId,
    model_provider: 'openrouter',
    memory_tier: 'conversation',
    content_tier: 'nsfw',
    scene_generation: true,
    user_id: user?.id,
    scene_name: options.sceneName.trim(),
    scene_description: options.sceneDescription?.trim() || null,
  }
});
```

**Fixed Code:**
```typescript
const { data, error } = await supabase.functions.invoke('roleplay-chat', {
  body: {
    message: enhancedPrompt,
    conversation_id: options.conversationId || null,
    character_id: options.characterId,
    model_provider: 'openrouter',
    memory_tier: 'conversation',
    content_tier: 'nsfw',
    scene_generation: true,
    user_id: user?.id,
    scene_name: options.sceneName.trim(),
    scene_description: options.sceneDescription?.trim() || null,
    // ✅ ADD: Scene continuity parameters
    scene_continuity_enabled: sceneContinuityEnabled ?? true,
    previous_scene_id: previousSceneId || null,
    previous_scene_image_url: previousSceneImageUrl || null
  }
});
```

#### Fix 4.3: Update Modal to Pass Continuity State

**File:** `src/components/roleplay/SceneGenerationModal.tsx`

**Location:** Lines 169-177

**Current Code:**
```typescript
const sceneId = await generateSceneNarrative(prompt, selectedCharacters, {
  includeNarrator,
  includeUserCharacter: false,
  characterId,
  conversationId,
  userCharacterId: undefined,
  sceneName: sceneName.trim(),
  sceneDescription: sceneDescription.trim() || undefined
});
```

**Fixed Code:**
```typescript
// ✅ ADD: Get scene continuity state from hook
const {
  isEnabled: sceneContinuityEnabled,
  previousSceneId,
  previousSceneImageUrl
} = useSceneContinuity(conversationId || undefined);

const sceneId = await generateSceneNarrative(
  prompt, 
  selectedCharacters, 
  {
    includeNarrator,
    includeUserCharacter: false,
    characterId,
    conversationId,
    userCharacterId: undefined,
    sceneName: sceneName.trim(),
    sceneDescription: sceneDescription.trim() || undefined
  },
  // ✅ ADD: Pass continuity parameters
  sceneContinuityEnabled,
  previousSceneId,
  previousSceneImageUrl
);
```

**Note:** Need to import `useSceneContinuity` at top of file.

**Impact:**
- Modal-based scene generation will support I2I continuity
- Consistent behavior between chat flow and modal flow
- Users can generate continuous scenes from modal

---

## Issue 5: Scene Records Not Found in Database

### Problem
Scenes are not being found in `character_scenes` table for conversation `5608838d-7d68-46e5-82ff-a6edee5e80ea`, causing `previousSceneImageUrl` to be null.

### Root Cause
Multiple possible causes:
1. Scene records not being created
2. Scene records created but with wrong `conversation_id`
3. Scene records created but `image_url` not updated after generation
4. Frontend hook query failing

### Fix

#### Fix 5.1: Verify Scene Creation

**File:** `supabase/functions/roleplay-chat/index.ts`

**Location:** Lines 2378-2420

Already addressed in Fix 1.2 - add retry logic for scene creation.

#### Fix 5.2: Verify Conversation ID Is Passed

**File:** `supabase/functions/roleplay-chat/index.ts`

**Location:** Line 2382

**Current Code:**
```typescript
conversation_id: conversationId || null,
```

**Fix:** Add validation and logging:
```typescript
if (!conversationId) {
  console.warn('⚠️ Scene creation: conversation_id is null - scene will not be linked to conversation');
} else {
  console.log('✅ Scene creation: conversation_id provided:', conversationId);
}

conversation_id: conversationId || null,
```

#### Fix 5.3: Improve Frontend Hook Query

**File:** `src/hooks/useSceneContinuity.ts`

**Location:** Lines 94-101

**Current Code:**
```typescript
const { data, error } = await supabase
  .from('character_scenes')
  .select('id, image_url, created_at')
  .eq('conversation_id', convId)
  .not('image_url', 'is', null)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();
```

**Fixed Code:**
```typescript
// First try: Get scene with image_url
let { data, error } = await supabase
  .from('character_scenes')
  .select('id, image_url, created_at')
  .eq('conversation_id', convId)
  .not('image_url', 'is', null)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

// Fallback: If no scene with image_url, get most recent scene (image might be updating)
if (error || !data?.image_url) {
  console.log('🔄 Scene continuity: No scene with image_url, checking for any scene...');
  const { data: fallbackData, error: fallbackError } = await supabase
    .from('character_scenes')
    .select('id, image_url, created_at')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (!fallbackError && fallbackData) {
    data = fallbackData;
    error = null;
    console.log('🔄 Scene continuity: Found scene without image_url, will check again later');
  }
}
```

**Impact:**
- Hook will find scenes even if `image_url` is temporarily null
- Better fallback handling for edge cases
- More reliable scene tracking

---

## Issue 6: Scene Persistence (NEW - User Question)

### User Question
Should scene images be saved permanently in the library (e.g., another tab next to character tab) similar to character images so that they persist longer?

### Current State
- **Character images:** Saved to `user_library` table with `roleplay_metadata.type = 'character_portrait'`
- **Character images:** Displayed in Library "Characters" tab
- **Scene images:** Currently only in `character_scenes` table and `workspace_assets` table
- **Scene images:** NOT saved to `user_library` table
- **Scene images:** NOT displayed in Library

### Analysis
**Benefits of saving scenes to library:**
1. **Longer persistence** - Scenes won't be lost if `character_scenes` records are deleted
2. **Better continuity** - Previous scenes more reliably available for I2I
3. **User access** - Users can browse/view their generated scenes
4. **Consistency** - Same pattern as character images

**Implementation:**
- Similar to character image auto-save in `fal-image` and `replicate-webhook`
- Save to `user_library` with `roleplay_metadata.type = 'roleplay_scene'`
- Add "Scenes" tab to Library component (similar to "Characters" tab)
- Filter scenes by `roleplay_metadata.type === 'roleplay_scene'` or `tags.includes('scene')`

### Recommendation
**YES - Implement scene persistence to library** for the same reasons character images are saved:
- Ensures scenes persist longer
- Makes previous scenes more reliably available for I2I
- Provides better user experience (can browse scenes)
- Follows existing pattern

**Priority:** Medium (Phase 3) - Not blocking I2I functionality but improves reliability

---

## Implementation Order

### Phase 1: Critical Fixes (Immediate)
1. **Fix 1.1** - Fix mode detection to require previous scene image for I2I (prevents broken I2I calls)
2. **Fix 1.2** - Ensure scene records are created (enables scene tracking)
3. **Fix 1.3** - Ensure scene image URL is updated (enables previous scene lookup)
4. **Fix 3.1-3.3** - Use Scene Iteration templates for I2I (improves prompt quality)

### Phase 2: Data Integrity Fixes (High Priority)
3. **Fix 1.2** - Ensure scene records are created (prevents future issues)
4. **Fix 1.3** - Ensure scene image URL is updated (enables proper scene tracking)
5. **Fix 2** - Fix first scene detection (ensures correct mode in database)

### Phase 3: Feature Completeness (Medium Priority)
6. **Fix 4.1-4.3** - Add continuity to Scene Generation Modal (feature parity)
7. **Fix 5.3** - Improve frontend hook query (better fallback handling)
8. **Fix 6.1-6.2** - Add scene persistence to library (longer persistence, better UX)

## Testing Plan

After each fix:
1. **Test T2I First Scene:**
   - Generate first scene in new conversation
   - Verify: `generation_mode: 't2i'`, model is v4, Scene Narrative template used

2. **Test I2I Second Scene:**
   - Generate second scene in same conversation
   - Verify: `generation_mode: 'i2i'`, model is v4.5/edit, Scene Iteration template used, previous scene image passed

3. **Test Modal Flow:**
   - Generate scene via Scene Generation Modal
   - Verify: Continuity parameters passed, I2I works if previous scene exists

4. **Test Database State:**
   - Verify: Scenes created in `character_scenes`, `image_url` updated after generation

5. **Test Edge Cases:**
   - First scene with continuity enabled (should use T2I)
   - Second scene without previous scene image (should use v4.5/edit with character reference fallback)
   - Scene regeneration (should use modification mode)

## Success Criteria

✅ All scenes use correct model (v4 for T2I, v4.5/edit for I2I)  
✅ First scenes marked as `t2i`, subsequent as `i2i`  
✅ I2I scenes use Scene Iteration templates  
✅ Modal flow supports continuity  
✅ Scene records created and updated correctly  
✅ Previous scenes found reliably by frontend hook

## Estimated Effort

- **Phase 1:** 60 minutes (4 fixes - mode detection, scene records, image URL updates, templates)
- **Phase 2:** 30 minutes (1 fix - first scene detection)
- **Phase 3:** 60 minutes (3 fixes - modal continuity, hook query, scene persistence)
- **Testing:** 45 minutes
- **Total:** ~3.25 hours

---

## Fix 6: Scene Persistence to Library (NEW)

### Fix 6.1: Auto-Save Scenes to Library

**File:** `supabase/functions/fal-image/index.ts`

**Location:** After scene image URL update (around line 1311)

**Add scene auto-save logic similar to character portrait auto-save:**

```typescript
// Auto-save roleplay scene to library (similar to character portraits)
if ((body.metadata?.destination === 'character_scene' || body.metadata?.destination === 'roleplay_scene') 
    && body.metadata?.scene_id 
    && !storagePath.startsWith('http')) {
  
  console.log('🎬 Auto-saving scene to library:', body.metadata.scene_id);
  
  // Copy scene image from workspace-temp to user-library
  const sourceKey = storagePath.startsWith('workspace-temp/') 
    ? storagePath 
    : `workspace-temp/${storagePath}`;
  const destKey = `user-library/${body.metadata.user_id}/${body.metadata.scene_id}_${Date.now()}.png`;
  
  try {
    // Download from workspace-temp
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('workspace-temp')
      .download(sourceKey);
    
    if (!downloadError && fileData) {
      // Upload to user-library
      const { error: uploadError } = await supabase.storage
        .from('user-library')
        .upload(destKey, fileData, {
          contentType: 'image/png',
          upsert: true
        });
      
      if (!uploadError) {
        // Create library record with roleplay metadata
        const { data: libraryAsset, error: libraryError } = await supabase
          .from('user_library')
          .insert({
            user_id: body.metadata.user_id,
            asset_type: 'image',
            storage_path: destKey,
            thumbnail_path: null,
            file_size_bytes: workspaceAsset?.file_size_bytes || 0,
            mime_type: 'image/png',
            original_prompt: workspaceAsset?.original_prompt || scenePrompt,
            model_used: workspaceAsset?.model_used || modelKey,
            generation_seed: workspaceAsset?.generation_seed,
            width: workspaceAsset?.width || 1024,
            height: workspaceAsset?.height || 1024,
            tags: ['scene', 'roleplay'],
            roleplay_metadata: {
              type: 'roleplay_scene',
              scene_id: body.metadata.scene_id,
              character_id: body.metadata.character_id,
              character_name: body.metadata.character_name,
              conversation_id: body.metadata.conversation_id,
              generation_mode: body.metadata.generation_mode || 't2i'
            },
            content_category: 'scene'
          })
          .select()
          .single();
        
        if (!libraryError && libraryAsset) {
          console.log('✅ Scene saved to library:', libraryAsset.id);
          
          // Update character_scenes record with library path (optional - keep workspace-temp as primary)
          // This provides a stable reference for future I2I lookups
          const { error: sceneUpdateError } = await supabase
            .from('character_scenes')
            .update({
              library_image_url: destKey, // New field or use existing image_url
              updated_at: new Date().toISOString()
            })
            .eq('id', body.metadata.scene_id);
          
          if (sceneUpdateError) {
            console.warn('⚠️ Failed to update scene with library path:', sceneUpdateError);
          }
        } else {
          console.error('❌ Failed to create library record:', libraryError);
        }
      } else {
        console.error('❌ Failed to upload scene to library:', uploadError);
      }
    } else {
      console.error('❌ Failed to download scene from workspace-temp:', downloadError);
    }
  } catch (error) {
    console.error('❌ Error auto-saving scene to library:', error);
  }
}
```

### Fix 6.2: Add Scenes Tab to Library

**File:** `src/components/library/UpdatedOptimizedLibrary.tsx`

**Location:** Line 30 (activeTab state) and lines 44-56 (filtering logic)

**Current Code:**
```typescript
const [activeTab, setActiveTab] = useState<'all' | 'characters'>('all');

// Filtering
if (activeTab === 'characters') {
  return allAssets.filter(asset => 
    asset.metadata?.roleplay_metadata?.type === 'character_portrait' ||
    asset.metadata?.tags?.includes('character') ||
    asset.metadata?.content_category === 'character'
  );
}
```

**Fixed Code:**
```typescript
const [activeTab, setActiveTab] = useState<'all' | 'characters' | 'scenes'>('all');

// Filtering
if (activeTab === 'characters') {
  return allAssets.filter(asset => 
    asset.metadata?.roleplay_metadata?.type === 'character_portrait' ||
    asset.metadata?.tags?.includes('character') ||
    asset.metadata?.content_category === 'character'
  );
}

if (activeTab === 'scenes') {
  return allAssets.filter(asset => 
    asset.metadata?.roleplay_metadata?.type === 'roleplay_scene' ||
    asset.metadata?.tags?.includes('scene') ||
    asset.metadata?.content_category === 'scene'
  );
}
```

**Also update TabsList to include Scenes tab:**
```typescript
<TabsList>
  <TabsTrigger value="all">All</TabsTrigger>
  <TabsTrigger value="characters">Characters</TabsTrigger>
  <TabsTrigger value="scenes">Scenes</TabsTrigger>
</TabsList>
```

**Impact:**
- Scenes saved to library persist longer
- Users can browse their generated scenes
- Previous scenes more reliably available for I2I lookups
- Consistent with character image pattern
