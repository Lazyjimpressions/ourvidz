

# Refactor: Table-Driven Prompt Enhancement (Remove All Hardcoding)

## Problem Summary

The `enhance-prompt` edge function is stuck in a legacy architecture designed for local Qwen workers (`qwen_instruct`, `qwen_base`). It has three major issues:

1. **Worker routing is hardcoded for local models only.** The orchestrator's `selectWorkerType()` only knows about `qwen_instruct` and `qwen_base`, routing to local chat/WAN workers. There is no path to use OpenRouter (or any API provider) for the main enhancement flow -- OpenRouter is only used in the `scene_creation` and `scene_starters` branches, not in the sparkle button's general enhancement path.

2. **`model_id` is sent by the UI but never extracted.** The sparkle button sends `model_id` (the image model UUID), but line 31-39 of the edge function never destructures it. The orchestrator code at line 572 checks for `request.model_id` but it's always undefined, so it falls back to `getModelTypeFromJobType()` which returns generic `'sdxl'` for all image jobs.

3. **Multiple layers of hardcoded fallbacks.** When no template matches (which is every time for Flux models), the code cascades through: `enhanceWithTemplate` (tries local workers, fails) -> `enhanceWithRules` (appends hardcoded CLIP tags like "masterpiece, best quality") -> `enhanceWithHardcodedFallback` (more hardcoded tags). None of these know about Flux, Kontext, or any non-SDXL/WAN model.

## Current Enhancement Flow (Broken for API Models)

```text
Sparkle Button
  |-- sends { model_id, job_type, contentType }
  v
enhance-prompt edge function
  |-- extracts prompt, jobType, contentType
  |-- IGNORES model_id  <-- BUG
  v
DynamicEnhancementOrchestrator.enhancePrompt()
  |-- model_id is undefined, falls back to getModelTypeFromJobType()
  |-- returns 'sdxl' for ALL image jobs
  v
Template lookup (cache -> DB)
  |-- looks for target_model='sdxl', enhancer_model='qwen_instruct'
  |-- finds old Qwen-era SDXL template
  v
enhanceWithChatWorker()
  |-- calls getChatWorkerUrl() -> get-active-worker-url
  |-- local Qwen worker is offline -> FAILS
  v
enhanceWithRules() fallback
  |-- appends "masterpiece, best quality, detailed" <-- WRONG for Flux
```

## Proposed Architecture: Fully Table-Driven Enhancement

### Key Design Change

Instead of routing through local workers, the orchestrator should:

1. **Resolve the image model** from `model_id` to get its `model_key`
2. **Find the matching `prompt_templates` row** using `target_model = model_key`
3. **Use the template's `enhancer_model` field** to determine HOW to enhance (which LLM to call)
4. **Route to OpenRouter** using the `enhancer_model` value as the OpenRouter model key (e.g., `gryphe/mythomax-l2-13b`)
5. **Send the template's `system_prompt` + user prompt** to OpenRouter for enhancement
6. **Return the enhanced prompt** -- no hardcoded tags appended

### Fix 1: Extract `model_id` at Top Level

Add `model_id` extraction from `requestBody` (around line 36) and pass it into the orchestrator call (line 474).

### Fix 2: Route Enhancement Through OpenRouter

Replace the `enhanceWithChatWorker()` / `enhanceWithWanWorker()` local worker calls with a single `enhanceWithAPIModel()` method that:

- Takes the template's `enhancer_model` (e.g., `gryphe/mythomax-l2-13b`) as the model to call
- Sends messages to OpenRouter using the existing `OpenRouter_Roleplay_API_KEY` secret
- Falls back gracefully if OpenRouter is unavailable

This replaces the broken `selectWorkerType()` -> `getChatWorkerUrl()` -> local worker chain.

### Fix 3: Add Flux Enhancement Templates to Database

Insert enhancement templates for the 4 active Flux models, using `enhancer_model: 'gryphe/mythomax-l2-13b'` (same as Seedream templates). Each template gets Flux-appropriate system prompts -- natural language descriptions, no CLIP tag formatting:

| target_model | content_mode | Template |
|---|---|---|
| `fal-ai/flux-2` | nsfw | Flux 2 Prompt Enhance (NSFW) |
| `fal-ai/flux-2` | sfw | Flux 2 Prompt Enhance (SFW) |
| `fal-ai/flux-2/flash` | nsfw | Flux 2 Flash Prompt Enhance (NSFW) |
| `fal-ai/flux-2/flash` | sfw | Flux 2 Flash Prompt Enhance (SFW) |
| `fal-ai/flux-2/flash/edit` | nsfw | Flux 2 Flash Edit Prompt Enhance (NSFW) |
| `fal-ai/flux-2/flash/edit` | sfw | Flux 2 Flash Edit Prompt Enhance (SFW) |
| `fal-ai/flux-pro/kontext` | nsfw | Flux Kontext Prompt Enhance (NSFW) |
| `fal-ai/flux-pro/kontext` | sfw | Flux Kontext Prompt Enhance (SFW) |

Flux system prompts will instruct the LLM to produce natural language descriptions (Flux understands full sentences, not comma-separated tags).

### Fix 4: Remove Hardcoded Fallbacks

- Remove `enhanceWithHardcodedFallback()` entirely -- if no template exists for a model, return the original prompt unchanged with a clear strategy indicator (`no_template_available`)
- Remove `enhanceWithRules()` tag-appending logic -- no more "masterpiece, best quality" injection
- Remove `enhanceSDXLNSFW()` male character hardcoding
- Remove `applyTemplateEnhancement()` and `applyBasicEnhancement()` which append hardcoded strings like `"NSFW, ..., detailed anatomy, explicit content"`
- Remove `optimizeTokens()` hardcoded limits map -- use `template.token_limit` from database instead

### Fix 5: Simplify Worker Selection

Remove `selectWorkerType()`, `getChatWorkerUrl()`, `getWanWorkerUrl()`, and `getModelTypeFromJobType()`. These are all legacy local-worker concepts. The new flow is:

1. Look up template from DB by `target_model` (image model key) + `content_mode`
2. Template's `enhancer_model` tells us which LLM to call
3. Call OpenRouter with that model + template's `system_prompt`
4. Done

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/enhance-prompt/index.ts` | Major refactor: extract model_id, add OpenRouter-based enhancement, remove all hardcoded fallbacks and local worker routing |

## Database Changes

| Change | Scope |
|---|---|
| Insert Flux enhancement templates into `prompt_templates` | 8 rows (4 models x 2 content modes) |

## What Stays Unchanged

- The `scene_creation` and `scene_starters` branches (lines 81-415) -- these already use OpenRouter correctly
- The `modify` flow (lines 417-452) -- this is a simple string operation, no LLM needed
- The `exact_copy` early exit (lines 62-78)
- Frontend sparkle button code -- it already sends `model_id` correctly
- Template lookup via `cache-utils.ts` -- this already works, just needs correct input data

## Fallback Chain (New)

```text
1. Cache lookup (target_model + enhancer_model + content_mode)
2. Database lookup (same 5-tuple)
3. Return original prompt unchanged (no_template_available)
```

No hardcoded prompt manipulation at any level.

