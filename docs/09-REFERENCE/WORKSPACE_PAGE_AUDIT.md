# Workspace Page Audit

**Date**: January 2026  
**Files**: 
- `src/pages/MobileSimplifiedWorkspace.tsx`
- `src/pages/SimplifiedWorkspace.tsx`
- `src/hooks/useLibraryFirstWorkspace.ts`

## Current Implementation Status

### ✅ Working Correctly

1. **Model Loading**: 
   - Uses `useImageModels()` hook to load models from `api_models` table
   - Models filtered by `is_active = true`
   - Supports both image and video models

2. **Model Selection**:
   - Model selection stored in `selectedModel` state
   - Model persisted to localStorage
   - Model selection UI in `MobileSimplePromptInput` component

3. **Model Routing**:
   - Correctly routes to `replicate-image` edge function for Replicate models
   - Correctly routes to `fal-image` edge function for fal.ai models
   - Correctly routes to local SDXL/WAN workers for local models

### ⚠️ Areas to Verify

1. **Prompt Enhancement Templates**:
   - Workspace uses `queue-job` edge function which calls `enhance-prompt`
   - `enhance-prompt` uses templates from `prompt_templates` table
   - Need to verify template selection uses `target_model` matching `api_models.model_key`
   - Current templates use generic `target_model` values like "sdxl", "wan" instead of specific model keys

2. **Template Selection for Image/Video Generation**:
   - Templates are selected in `enhance-prompt` edge function
   - Selection criteria: `(target_model, enhancer_model, job_type, use_case, content_mode)`
   - Need to verify `target_model` matches selected model's `model_key`

## Template Usage Flow

1. **User selects model** → `selectedModel` state updated
2. **User generates content** → `generate()` function called
3. **Generation request** → Routes to `queue-job` edge function
4. **Queue job** → Calls `enhance-prompt` edge function
5. **Enhance prompt** → Selects template based on:
   - `target_model`: Should match `api_models.model_key`
   - `job_type`: 'image' or 'video'
   - `use_case`: 'enhancement' or 'image_generation' or 'video_generation'
   - `content_mode`: 'sfw' or 'nsfw'

## Issues Found

1. **Generic Template Targets**:
   - Current templates use `target_model = 'sdxl'` or `target_model = 'wan'`
   - Should use specific model keys like `target_model = 'lucataco/realistic-vision-v5.1'`
   - This prevents model-specific template customization

2. **No Model-Specific Templates for Image/Video**:
   - All image models share same enhancement templates
   - All video models share same enhancement templates
   - Missing templates for specific models (Replicate RV5.1, fal.ai Seedream, etc.)

## Required Fixes

### Fix 1: Update Template Selection in `enhance-prompt`

**Current**: Uses generic `target_model` values ('sdxl', 'wan')

**Should**: Use specific `api_models.model_key` values

**Impact**: Allows model-specific prompt enhancement customization

### Fix 2: Create Model-Specific Enhancement Templates

For each active image/video model, create enhancement templates with:
- `target_model` = `api_models.model_key`
- `use_case` = 'enhancement' or 'image_generation' or 'video_generation'
- `job_type` = 'image' or 'video'
- `content_mode` = 'nsfw' (default) or 'sfw'

## Verification Checklist

- [ ] Models loaded from `api_models` table ✅
- [ ] Model selection works correctly ✅
- [ ] Edge function routing works correctly ✅
- [ ] Template selection uses `target_model` matching `api_models.model_key` ⚠️
- [ ] Model-specific enhancement templates exist ❌
- [ ] Fallback to universal templates works ⚠️

