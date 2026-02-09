# Prompt Templates Schema Review

**Date**: February 9, 2026
**Status**: ✅ CLEANUP COMPLETE

## Cleanup Summary (February 2026)

**Changes Applied:**

1. **Provider Field Fixed** - Updated `provider` to reflect the **enhancer LLM source** (not target model):
   - Enhancement templates: `fal`/`replicate` → `openrouter`
   - Scene iteration/modification templates: `fal.ai`/`fal_ai` → `openrouter`
   - Total: ~26 templates updated

2. **Enhancer Model Fixed** - Updated `enhancer_model` from `qwen_instruct` to actual OpenRouter model:
   - `qwen_instruct` → `gryphe/mythomax-l2-13b` (MythoMax 13B)
   - Template names updated: "– Qwen Instruct" → "– Mythomax"
   - Total: 14 enhancement templates updated

3. **Missing Templates Added:**
   - Seedream v4.5 T2I Prompt Enhance – Mythomax (NSFW)
   - Seedream v4.5 T2I Prompt Enhance – Mythomax (SFW)
   - Scene Iteration - Seedream v4 Edit (SFW)

---

## Previous Analysis (January 2026)

## Current Schema Analysis

### Active Templates Summary

**Total Active Templates**: 19

**By Use Case:**

- `character_roleplay`: 2 templates (1 model-specific, 1 universal)
- `enhancement`: 8 templates (SDXL/WAN prompt enhancement)
- `chat`: 2 templates (SFW/NSFW)
- `scene_generation`: 2 templates
- `scene_narrative_generation`: 2 templates
- `admin`: 1 template
- `character_action`: 1 template
- `roleplay`: 1 template (legacy)

### Schema Confusion Points Identified

1. **Mixed Granularity in `target_model`:**
   - Specific models: `cognitivecomputations/dolphin-mistral-24b-venice-edition:free` ✅
   - Model families: `sdxl`, `wan` ❌ (should be specific model keys)
   - Universal: `NULL` ✅ (for fallback)

2. **Unclear Provider Distinction:**
   - No field to distinguish local vs 3rd party providers
   - Must join through `api_models` → `api_providers` to determine provider type

3. **`enhancer_model` Field Confusion:**
   - Used for prompt enhancement (qwen_base, qwen_instruct)
   - Not related to the target model being used
   - Should be separate from `target_model` concept

4. **Inconsistent Use Cases:**
   - Multiple use cases without clear model-to-template mapping
   - `character_roleplay` vs `roleplay` (legacy)
   - `enhancement` vs `scene_generation` vs `scene_narrative_generation`

## Missing Templates Analysis

### Roleplay Models (5 active models)

**Has Template:**

- ✅ `cognitivecomputations/dolphin-mistral-24b-venice-edition:free` (Venice Dolphin NSFW Roleplay)

**Missing Templates:**

- ❌ `cognitivecomputations/dolphin3.0-mistral-24b:free` (Dolphin 3.0 Mistral 24B)
- ❌ `gryphe/mythomax-l2-13b` (MythoMax 13B)
- ❌ `nothingiisreal/mn-celeste-12b` (Mistral Nemo 12B Celeste)
- ❌ `neversleep/llama-3-lumimaid-70b` (Llama 3 Lumimaid 70B)

**Universal Fallback:**

- ✅ Universal Roleplay - Qwen Instruct (NSFW) - `target_model IS NULL`

### Image Models (6 active models)

**Current Enhancement Templates:**

- Templates exist for `sdxl` and `wan` families, but not for specific model keys
- Need to verify if these work for all image models or need model-specific templates

**Active Image Models:**

- Replicate: `lucataco/realistic-vision-v5.1`, `lucataco/sdxl`, `stability-ai/sdxl`
- fal.ai: `fal-ai/bytedance/seedream/v4/text-to-image`, `fal-ai/bytedance/seedream/v4.5/edit`, `fal-ai/bytedance/seedream/v4/edit`

**Status**: Need to verify template coverage for each specific model

### Video Models (1 active model)

**Active Video Model:**

- fal.ai: `fal-ai/wan-i2v` (WAN 2.1 I2V)

**Current Templates:**

- Enhancement templates exist for `wan` family
- Need to verify if model-specific template needed

## Proposed Template Structure

### Template Identification Strategy

**Required Fields:**

- `target_model`: Must match `api_models.model_key` exactly
- `use_case`: Specific use case (`character_roleplay`, `image_generation`, `video_generation`, `prompt_enhancement`)
- `content_mode`: `'sfw'` or `'nsfw'`
- `job_type`: `'chat'`, `'image'`, or `'video'` (for roleplay, image, video generation)
- `enhancer_model`: For prompt enhancement templates only (qwen_base, qwen_instruct)

**Universal Templates:**

- `target_model IS NULL` for fallback when no model-specific template exists
- Must have appropriate `use_case` and `content_mode`

### Template Naming Convention

**Format**: `[Model Name] [Use Case] [Content Mode]`

**Examples:**

- `Dolphin 3.0 Mistral 24B Character Roleplay (NSFW)`
- `Seedream v4 Image Generation (NSFW)`
- `WAN 2.1 I2V Video Generation (NSFW)`
- `Universal Roleplay (NSFW)` (for fallback)

### Template Creation Checklist

For each active model in `api_models`:

1. **Roleplay Models** (`modality = 'roleplay'`):
   - [ ] Create template with `use_case = 'character_roleplay'`
   - [ ] Set `target_model = api_models.model_key`
   - [ ] Set `content_mode = 'nsfw'` (default for roleplay)
   - [ ] Set `job_type = 'chat'` or `'roleplay'`
   - [ ] Set `enhancer_model = 'qwen_instruct'` (if used for enhancement)

2. **Image Models** (`modality = 'image'`):
   - [ ] Create template with `use_case = 'image_generation'` or `'prompt_enhancement'`
   - [ ] Set `target_model = api_models.model_key`
   - [ ] Set `content_mode = 'nsfw'` or `'sfw'` as needed
   - [ ] Set `job_type = 'image'`
   - [ ] Set `enhancer_model` if used for prompt enhancement

3. **Video Models** (`modality = 'video'`):
   - [ ] Create template with `use_case = 'video_generation'` or `'prompt_enhancement'`
   - [ ] Set `target_model = api_models.model_key`
   - [ ] Set `content_mode = 'nsfw'` or `'sfw'` as needed
   - [ ] Set `job_type = 'video'`
   - [ ] Set `enhancer_model` if used for prompt enhancement

## Next Steps

1. ✅ Review current schema structure
2. ⏳ Design template structure (in progress)
3. ⏳ Create missing templates for all active models
4. ⏳ Update edge functions to use new template structure
5. ⏳ Update UI to use model-specific templates
