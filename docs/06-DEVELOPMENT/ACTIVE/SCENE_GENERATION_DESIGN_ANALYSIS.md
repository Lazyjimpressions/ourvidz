# Scene Generation Design Analysis & Fix

**Date:** 2026-01-10
**Status:** Critical Design Issue Identified
**Priority:** CRITICAL

---

## Problem Statement

The scene template's `scene_prompt` (from `scenes` table) is **NOT being used for image generation**. Instead, the system analyzes the character's dialogue and generates a completely new scene narrative, ignoring the template's carefully crafted prompt.

**Result:** Generated images don't match the scene template that was selected.

---

## Current Flow Analysis

### Opening Scene (Conversation Start)

1. **Frontend** (`MobileRoleplayChat.tsx`):
   - Loads scene template from `scenes` table
   - Passes to edge function:
     - `scene_context: loadedScene?.scene_prompt` (line 806)
     - `scene_description: loadedScene?.description` (line 808)
     - `scene_name: loadedScene?.name` (line 807)

2. **Edge Function** (`roleplay-chat/index.ts`):
   - Receives `scene_context` (which is the template's `scene_prompt`)
   - Uses `scene_context` in **character system prompt** (line 438) - for character behavior
   - Uses `scene_description` in **character system prompt** (line 1608) - for character context
   - **BUT**: When `generateScene()` is called:
     - Receives `sceneDescription` parameter (template description)
     - **DOES NOT receive** the template's `scene_prompt`
     - Instead, analyzes character's dialogue response
     - Generates NEW scene narrative from dialogue
     - **Template's `scene_prompt` is IGNORED**

3. **Scene Generation** (`generateScene()` function):
   - Checks for `scenePromptOverride` (user-edited, regeneration)
   - If not override, calls `generateSceneNarrativeWithOpenRouter()`
   - This function analyzes the character's dialogue
   - Extracts scene context from dialogue
   - Generates a NEW scene description
   - **Never uses the template's `scene_prompt`**

### Subsequent Scenes

1. **Scene Continuity Enabled**:
   - Uses I2I with previous scene image
   - Still generates NEW narrative from dialogue
   - Doesn't reference original template context

2. **Scene Continuity Disabled**:
   - Uses T2I from character reference
   - Generates NEW narrative from dialogue
   - Doesn't reference original template context

---

## Design Intent (What Should Happen)

### Opening Scene (First Scene)

**Should:**
1. Use scene template's `scene_prompt` as PRIMARY source
2. Combine with character visual description
3. Apply scene style (character_only, pov, both_characters)
4. Use template's `scene_description` for context
5. Only generate NEW narrative if template doesn't have `scene_prompt`

**Current Behavior:**
- ❌ Ignores template's `scene_prompt`
- ❌ Generates new narrative from dialogue
- ❌ Loses the carefully crafted template prompt

### Subsequent Scenes

**Should:**
1. Use I2I with previous scene (if continuity enabled)
2. Reference original template context for consistency
3. Only describe what changes, not the entire scene
4. Maintain template's setting/location

**Current Behavior:**
- ✅ Uses I2I correctly
- ❌ Generates completely new narrative
- ❌ Doesn't reference template context
- ❌ May drift from original scene

---

## Root Cause

The `generateScene()` function signature doesn't accept the template's `scene_prompt`:

```typescript
async function generateScene(
  // ... other params ...
  sceneName?: string,
  sceneDescription?: string,  // ✅ Has this
  // ❌ MISSING: scenePrompt?: string (from template)
  // ...
)
```

The template's `scene_prompt` is passed as `scene_context` but:
- It's used for character behavior (system prompt)
- It's NOT passed to `generateScene()`
- It's NOT used for image generation

---

## Proposed Fix

### 1. Add Template Scene Prompt Parameter

**Add to `generateScene()` signature:**
```typescript
sceneTemplatePrompt?: string,  // scene_prompt from scenes table template
```

### 2. Use Template Prompt for First Scene

**Logic:**
```typescript
if (scenePromptOverride) {
  // User-edited prompt (regeneration)
  scenePrompt = scenePromptOverride;
} else if (sceneTemplatePrompt && isFirstScene) {
  // ✅ FIRST SCENE: Use template's scene_prompt directly
  scenePrompt = sceneTemplatePrompt;
  console.log('🎬 Using scene template prompt for first scene');
} else if (useI2IIteration && previousSceneImageUrl) {
  // ✅ SUBSEQUENT SCENE: Use I2I with previous scene
  // Generate minimal narrative describing only what changes
  scenePrompt = await generateSceneNarrativeWithOpenRouter(...);
} else {
  // ✅ FALLBACK: Generate new narrative from dialogue
  scenePrompt = await generateSceneNarrativeWithOpenRouter(...);
}
```

### 3. Combine Template Prompt with Character Description

**When using template prompt:**
```typescript
// Template prompt might be: "A steamy locker room shower, warm water streaming..."
// Combine with character: "Mary stands in a steamy locker room shower, warm water streaming down her auburn hair..."
const combinedPrompt = templatePrompt.includes(character.name)
  ? templatePrompt  // Template already includes character
  : `${character.name} ${templatePrompt}`;  // Add character name
```

### 4. Pass Template Context to Subsequent Scenes

**For I2I scenes:**
- Store template's `scene_prompt` in `character_scenes.generation_metadata`
- Reference it for consistency
- Only describe changes, not entire scene

---

## Implementation Plan

### Phase 1: Add Template Prompt Support (Immediate)

1. **Update `generateScene()` signature:**
   - Add `sceneTemplatePrompt?: string` parameter

2. **Update call site:**
   - Pass `scene_context` (template's `scene_prompt`) to `generateScene()`

3. **Update logic:**
   - Check if `sceneTemplatePrompt` exists and `isFirstScene`
   - Use template prompt directly
   - Combine with character description

### Phase 2: Enhance Template Prompt Usage (Short-term)

1. **Template Prompt Enhancement:**
   - If template prompt doesn't include character name, add it
   - If template prompt is generic, enhance with character details

2. **Subsequent Scene Context:**
   - Store template prompt in scene metadata
   - Reference for I2I scenes
   - Maintain location/setting consistency

### Phase 3: Template Prompt Validation (Medium-term)

1. **Validate Template Prompts:**
   - Check if prompt is image-generation ready
   - Suggest improvements if too generic
   - Auto-enhance if needed

---

## Expected Results

### Before (Current)
- Template: "A steamy locker room shower, warm water streaming..."
- Generated: "Mary stands on rooftop, city lights, black dress" ❌

### After (Fixed)
- Template: "A steamy locker room shower, warm water streaming..."
- Generated: "Mary stands in a steamy locker room shower, warm water streaming down her auburn hair, her wet hair clinging to her back..." ✅

---

## Related Documentation

- [SCENE_NARRATIVE_TEMPLATE_AUDIT.md](./SCENE_NARRATIVE_TEMPLATE_AUDIT.md) - Template improvements
- [SCENE_CONTEXT_EXTRACTION_FIX.md](./SCENE_CONTEXT_EXTRACTION_FIX.md) - Context extraction fixes
- [SCENE_CONTINUITY_DEVELOPMENT_PLAN.md](./SCENE_CONTINUITY_DEVELOPMENT_PLAN.md) - I2I architecture

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-10 | Design analysis and fix plan | Claude |
