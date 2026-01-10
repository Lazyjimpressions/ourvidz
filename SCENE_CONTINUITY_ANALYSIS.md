# Scene Continuity I2I Analysis - Latest Scene Generation Review

**Date:** 2026-01-10  
**Conversation:** 5608838d-7d68-46e5-82ff-a6edee5e80ea  
**User:** pokercpa05@gmail.com (3348b481-8fb1-4745-8e6c-db6e9847e429)

## Executive Summary

**CRITICAL ISSUE IDENTIFIED:** Scene continuity I2I is NOT working correctly. All recent scenes show `generation_mode: "i2i"` in the database, but `model_used` is still `fal-ai/bytedance/seedream/v4/text-to-image` instead of `fal-ai/bytedance/seedream/v4.5/edit`. This confirms the user's observation that fal.ai only received the original prompt and v4 model.

## Database Analysis - Latest 3 Scenes

### Scene 1 (Most Recent - 22:33:01)
- **ID:** 008d2a9b-1fe5-4613-914b-1c759e7d98f6
- **Generation Mode:** `i2i` ✅ (correctly detected)
- **Model Used:** `fal-ai/bytedance/seedream/v4/text-to-image` ❌ (WRONG - should be v4.5/edit)
- **Prompt:** "Generate a scene showing Lucy... The spa room is bathed in a soft, golden light..."
- **Settings:** `{"seed":209524903,"provider":"fal","model_key":"fal-ai/bytedance/seedream/v4/text-to-image","content_mode":"nsfw","generation_mode":"i2i"}`

### Scene 2 (22:31:23)
- **ID:** e1955cb0-ce5a-4b08-ae1f-3b124346a3a0
- **Generation Mode:** `i2i` ✅ (correctly detected)
- **Model Used:** `fal-ai/bytedance/seedream/v4/text-to-image` ❌ (WRONG - should be v4.5/edit)
- **Prompt:** "Generate a scene showing Lucy... The soft, ambient lighting of the spa..."
- **Settings:** `{"seed":485981536,"provider":"fal","model_key":"fal-ai/bytedance/seedream/v4/text-to-image","content_mode":"nsfw","generation_mode":"i2i"}`

### Scene 3 (22:30:06)
- **ID:** dd61ccb7-380d-4a77-baf4-ef45b7f8d748
- **Generation Mode:** `i2i` ✅ (correctly detected)
- **Model Used:** `fal-ai/bytedance/seedream/v4/text-to-image` ❌ (WRONG - should be v4.5/edit)
- **Prompt:** "Generate a scene showing Lucy... The soft, ambient lighting of the massage room..."
- **Settings:** `{"seed":49572292,"provider":"fal","model_key":"fal-ai/bytedance/seedream/v4/text-to-image","content_mode":"nsfw","generation_mode":"i2i"}`

## Root Cause Analysis

### Code Flow Review

1. **Generation Mode Detection** (`roleplay-chat/index.ts` lines 2040-2077)
   - ✅ **WORKING:** Correctly detects I2I mode when `sceneContinuityEnabled && !isFirstScene && !!previousSceneImageUrl`
   - Sets `useI2IIteration = true` and `generationMode = 'i2i'`

2. **Model Override Logic** (`roleplay-chat/index.ts` lines 2734-2742)
   - ✅ **WORKING:** Sets `i2iModelOverride = 'fal-ai/bytedance/seedream/v4.5/edit'` when `useI2IIteration && previousSceneImageUrl`
   - ✅ **WORKING:** Passes override via `model_key_override: i2iModelOverride` to fal-image

3. **Model Override Application** (`fal-image/index.ts` lines 233-235)
   - ✅ **WORKING:** `const modelKey = modelKeyOverride || apiModel.model_key;`
   - Should use override if provided

4. **Model Used Storage** (`fal-image/index.ts` line 1105)
   - ✅ **WORKING:** `model_used: modelKey` - stores the modelKey variable

### The Problem

**HYPOTHESIS:** The `model_key_override` is being set correctly in `roleplay-chat`, but there's a condition preventing it from being passed to `fal-image`, OR the override is being passed but not applied correctly.

**Possible Issues:**

1. **Condition Check Failure:** The condition `useI2IIteration && previousSceneImageUrl` might be failing
   - `useI2IIteration` is set correctly (we see `generation_mode: "i2i"` in DB)
   - But `previousSceneImageUrl` might be undefined/null when passed to fal-image

2. **Model Override Not Passed:** The `model_key_override` might not be in the request body when calling fal-image

3. **Override Applied But Overwritten:** The override might be applied but then overwritten by `apiModel.model_key` lookup

## Validation Needed

### From Our System Side

**Expected Behavior:**
- **First Scene (T2I):**
  - Model: `fal-ai/bytedance/seedream/v4/text-to-image` ✅
  - Prompt: Character reference + scene narrative
  - Reference: Character reference image

- **Second Scene (I2I):**
  - Model: `fal-ai/bytedance/seedream/v4.5/edit` ❌ (NOT HAPPENING)
  - Prompt: Scene iteration narrative
  - Reference: Previous scene image URL
  - Parameters: `image_urls: [previousSceneUrl]`, `strength: 0.45`

**Actual Behavior (from database):**
- All scenes using: `fal-ai/bytedance/seedream/v4/text-to-image` ❌
- All scenes marked as: `generation_mode: "i2i"` ✅
- This is inconsistent - mode is I2I but model is T2I

### From fal.ai Side (User Observation)

- **Input received:** Original prompt only
- **Model used:** v4 only
- **Missing:** Previous scene image reference
- **Missing:** I2I parameters (image_urls, strength)

## Code Investigation Points

### 1. Check if `previousSceneImageUrl` is being passed correctly

**Location:** `roleplay-chat/index.ts` line 2737
```typescript
i2iReferenceImage = previousSceneImageUrl;
```

**Issue:** If `previousSceneImageUrl` is undefined or empty, the I2I logic won't trigger.

### 2. Check if `model_key_override` is in the request body

**Location:** `roleplay-chat/index.ts` line 2765
```typescript
model_key_override: i2iModelOverride || undefined,
```

**Issue:** If `i2iModelOverride` is null, it won't be passed.

### 3. Check if override is applied before API call

**Location:** `fal-image/index.ts` line 235
```typescript
const modelKey = modelKeyOverride || apiModel.model_key;
```

**Issue:** If `modelKeyOverride` is undefined, it falls back to `apiModel.model_key` (which is v4).

## Proposed Debugging Steps

1. **Add logging** to verify `previousSceneImageUrl` value when I2I mode is detected
2. **Add logging** to verify `i2iModelOverride` value before passing to fal-image
3. **Add logging** in fal-image to verify `model_key_override` is received
4. **Check edge function logs** for the actual API calls to fal.ai

## Immediate Fix Required

The model override logic exists but isn't working. Need to verify:
1. Is `previousSceneImageUrl` actually populated when calling `generateScene()`?
2. Is the condition `useI2IIteration && previousSceneImageUrl` evaluating correctly?
3. Is `model_key_override` actually being sent in the request body to fal-image?

## Critical Finding: Model Override Condition

**Location:** `roleplay-chat/index.ts` line 2734
```typescript
} else if (useI2IIteration && previousSceneImageUrl) {
  i2iModelOverride = 'fal-ai/bytedance/seedream/v4.5/edit';
  i2iReferenceImage = previousSceneImageUrl;
  ...
}
```

**Problem:** This condition requires BOTH `useI2IIteration` AND `previousSceneImageUrl` to be truthy. If `previousSceneImageUrl` is null/undefined, the model override won't be set, even though `generation_mode` is correctly set to `'i2i'`.

**Evidence:**
- Database shows `generation_mode: "i2i"` ✅ (so `useI2IIteration` is true)
- Database shows `model_used: "fal-ai/bytedance/seedream/v4/text-to-image"` ❌ (so model override didn't happen)
- This suggests `previousSceneImageUrl` was null/undefined when the condition was evaluated

## Root Cause Hypothesis

**Most Likely Issue:** `previousSceneImageUrl` is not being passed correctly from the frontend, OR it's being passed but is null/undefined when the model override check happens.

**Why this happens:**
1. Frontend retrieves `previousSceneImageUrl` from `useSceneContinuity` hook
2. Hook looks for scenes in `character_scenes` table
3. But `character_scenes` table has NO records for this conversation (verified earlier)
4. So `previousSceneImageUrl` is null
5. So model override condition fails
6. So v4 model is used instead of v4.5/edit

**Secondary Issue:** Even if `previousSceneImageUrl` is null, the system still marks `generation_mode: "i2i"` because `useI2IIteration` is true (based on `sceneContinuityEnabled && !isFirstScene` check). But without the image URL, I2I can't actually work.

## Impact

- **User Experience:** Scene continuity is broken - all scenes are using T2I even when I2I is intended
- **Visual Continuity:** Characters and scenes won't maintain visual consistency across generations
- **Feature Functionality:** Core I2I iteration feature is non-functional despite being marked as enabled

## Validation Results

### Scene 1 (Initial - Should be T2I)
**Expected:**
- Model: `fal-ai/bytedance/seedream/v4/text-to-image` ✅
- Prompt: Character reference + scene narrative
- Reference: Character reference image
- Generation Mode: `t2i`

**Actual (from database):**
- Model: `fal-ai/bytedance/seedream/v4/text-to-image` ✅ (CORRECT)
- Generation Mode: `i2i` ❌ (WRONG - should be `t2i` for first scene)
- Prompt: Full scene narrative with character descriptions

**Issue:** First scene is incorrectly marked as `i2i` instead of `t2i`. This suggests `isFirstScene` detection is failing.

### Scene 2 (Should be I2I)
**Expected:**
- Model: `fal-ai/bytedance/seedream/v4.5/edit` ❌ (NOT HAPPENING)
- Prompt: Scene iteration narrative (using "Scene Iteration" template)
- Reference: Previous scene image URL
- Parameters: `image_urls: [previousSceneUrl]`, `strength: 0.45`
- Generation Mode: `i2i`

**Actual (from database):**
- Model: `fal-ai/bytedance/seedream/v4/text-to-image` ❌ (WRONG)
- Generation Mode: `i2i` ✅ (CORRECT)
- Prompt: Full scene narrative (NOT using "Scene Iteration" template) ❌
- Settings: `{"generation_mode":"i2i","model_key":"fal-ai/bytedance/seedream/v4/text-to-image"}`

**Issue:** Model override not applied - still using v4 instead of v4.5/edit.

### From fal.ai Side (User Observation)
- **Input received:** Original prompt only (no previous scene image)
- **Model used:** v4 only (not v4.5/edit)
- **Missing:** `image_urls` parameter
- **Missing:** `strength` parameter

**This confirms:** The I2I parameters are NOT being sent to fal.ai, even though our system thinks it's in I2I mode.

## Root Cause Summary

**PRIMARY ISSUE:** `previousSceneImageUrl` is null/undefined when model override check happens.

**Why:**
1. Scenes are created in `character_scenes` table with `image_url: null` initially
2. After generation completes, `fal-image` updates scene with `image_url`
3. Frontend calls `setLastScene` to track it in localStorage
4. BUT: If scenes aren't in `character_scenes` table (or don't have `image_url` set), the hook returns null
5. So `previousSceneImageUrl` is null when passed to `generateScene()`
6. So model override condition `useI2IIteration && previousSceneImageUrl` fails
7. So v4 model is used instead of v4.5/edit

**SECONDARY ISSUE:** First scene detection is failing - scenes are marked as `i2i` when they should be `t2i`.

**TERTIARY ISSUE:** "Scene Iteration" templates are not being used for I2I scenes (already documented).

## Fixes Required

1. **Fix Model Override Condition** - Don't require `previousSceneImageUrl` if `useI2IIteration` is true
2. **Fix First Scene Detection** - Ensure `isFirstScene` correctly identifies first scenes
3. **Fix Scene Record Creation** - Ensure scenes are created with correct `conversation_id`
4. **Fix Scene Image URL Update** - Ensure `image_url` is set after generation completes
5. **Fix Template Selection** - Use "Scene Iteration" templates for I2I scenes
