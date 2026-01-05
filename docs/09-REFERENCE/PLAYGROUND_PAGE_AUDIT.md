# Playground Page Audit

**Date**: January 2026  
**Files**: 
- `src/components/playground/ChatInterface.tsx`
- `src/contexts/PlaygroundContext.tsx`
- `supabase/functions/playground-chat/index.ts`

## Current Implementation Status

### ✅ Working Correctly

1. **Conversation Management**:
   - Creates conversations with different types (chat, roleplay, admin, creative)
   - Manages conversation state and messages
   - Supports multiple conversation modes

2. **Template Usage**:
   - Uses `playground-chat` edge function
   - Edge function selects templates from `prompt_templates` table
   - Templates selected based on conversation type and content tier

### ⚠️ Areas to Verify

1. **Model Selection**:
   - **Issue**: Playground doesn't have model selection UI
   - **Current**: Uses generic chat worker (local Qwen) or hardcoded models
   - **Expected**: Should use models from `api_models` table if model selection is added

2. **Template Selection**:
   - **Current**: Uses universal templates (`target_model IS NULL`)
   - **Location**: `playground-chat/index.ts` line 174
   - **Query**: `getDatabaseTemplate(null, 'qwen_instruct', 'chat', 'character_roleplay', contentTier)`
   - **Issue**: Doesn't use model-specific templates because no model selection exists

3. **Roleplay Mode**:
   - Uses roleplay templates but doesn't select model-specific templates
   - Template selection doesn't consider selected model (because no model selection UI)

## Template Usage Flow

1. **User sends message** → `sendMessage()` called
2. **Playground context** → Routes to `playground-chat` edge function
3. **Edge function** → Selects template based on:
   - `target_model`: `null` (universal)
   - `enhancer_model`: `'qwen_instruct'` (from settings or default)
   - `job_type`: `'chat'`
   - `use_case`: `'character_roleplay'`, `'chat'`, `'admin'`, or `'creative'`
   - `content_mode`: `'sfw'` or `'nsfw'`

## Issues Found

1. **No Model Selection**:
   - Playground doesn't have UI for model selection
   - Always uses local chat worker or hardcoded models
   - Should add model selection from `api_models` table if needed

2. **Universal Templates Only**:
   - Always uses universal templates (`target_model IS NULL`)
   - Can't use model-specific templates because no model is selected
   - This is acceptable if playground is meant to be generic

3. **No Model-Specific Template Support**:
   - Even if model selection is added, template selection doesn't use `target_model`
   - Would need to update `getDatabaseTemplate()` call to pass model key

## Required Fixes (If Model Selection Added)

### Fix 1: Add Model Selection UI

**If playground should support model selection:**
- Add model selection dropdown in `ChatInterface.tsx`
- Use `useRoleplayModels()` hook to load models
- Store selected model in playground context

### Fix 2: Update Template Selection

**If model selection is added:**
- Update `playground-chat` edge function to accept `model_provider` parameter
- Update `getDatabaseTemplate()` call to use model key:
  ```typescript
  const dbTemplate = await getDatabaseTemplate(
    modelKey,  // Use selected model key instead of null
    'qwen_instruct',
    'chat',
    'character_roleplay',
    contentTier
  );
  ```

## Verification Checklist

- [ ] Models loaded from `api_models` table ❌ (No model selection exists)
- [ ] Model selection UI exists ❌ (Not implemented)
- [ ] Template selection uses `target_model` matching `api_models.model_key` ❌ (Uses universal templates)
- [ ] Roleplay mode uses correct templates ⚠️ (Uses universal templates)
- [ ] Chat mode uses correct templates ✅ (Uses universal templates)
- [ ] Admin mode uses correct templates ✅ (Uses universal templates)
- [ ] Creative mode uses correct templates ✅ (Uses universal templates)

## Recommendation

**Current State**: Playground uses universal templates and doesn't have model selection. This is acceptable if playground is meant to be a generic chat interface.

**If Model Selection is Desired**:
1. Add model selection UI to `ChatInterface.tsx`
2. Update `PlaygroundContext` to store selected model
3. Update `playground-chat` edge function to accept and use model key
4. Update template selection to use model-specific templates

**If Current State is Intended**:
- No changes needed
- Playground works correctly with universal templates
- Model-specific templates not required for generic chat interface

