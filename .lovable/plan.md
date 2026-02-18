

# Dynamic Enhancement Model Assignment

## What Changes

The enhancement LLM (the model that rewrites prompts before generation) will become a first-class dynamic assignment -- just like roleplay and reasoning models already are in `api_models`. No model keys will be hardcoded in edge functions.

## 1. Register Enhancement Models in `api_models`

Insert the current default (MythoMax) as a `chat / enhancement` model so the system can resolve it dynamically. Future models (Grok, etc.) are added via the Admin Portal with zero code changes.

**Database insert** (not a schema migration -- the table already supports `task: 'enhancement'`):

```text
| display_name | model_key                  | modality | task        | is_default |
|-------------|----------------------------|----------|-------------|------------|
| MythoMax 13B | gryphe/mythomax-l2-13b    | chat     | enhancement | true       |
```

## 2. Edge Function: Resolve Enhancer from `api_models`

**File:** `supabase/functions/enhance-prompt/index.ts`

Replace every instance of the hardcoded `'gryphe/mythomax-l2-13b'` fallback with a dynamic DB lookup:

- Accept optional `enhancement_model` from request body (user's explicit choice from UI)
- If not provided, query `api_models` for the default: `modality = 'chat'`, `task = 'enhancement'`, `is_default = true`
- Only use a hardcoded string as an absolute last-resort if the DB query itself fails

Specific changes:
- **Line 31**: Also extract `enhancement_model` from `requestBody`
- **Line 565**: Replace `request.selectedModel || 'gryphe/mythomax-l2-13b'` with resolved enhancer
- **Line 641**: Replace `template.enhancer_model || 'gryphe/mythomax-l2-13b'` with resolved enhancer
- **Line 678**: Same replacement in `enhanceViaOpenRouter`
- Add a `resolveEnhancerModel()` method that: checks `request.enhancement_model` (user choice) then queries DB default then falls back

## 3. Decouple `enhancer_model` from Template Lookup

The template lookup currently uses a 5-tuple key including `enhancer_model`. This couples "which LLM runs enhancement" to "which template is found." The same system prompt works regardless of whether MythoMax or Grok runs it.

**File:** `supabase/functions/_shared/cache-utils.ts`

- `getTemplateFromCache()` (line 100-134): Change from 5-tuple `[targetModel][enhancerModel][jobType][useCase][contentMode]` to 4-tuple `[targetModel][jobType][useCase][contentMode]`. Remove `enhancerModel` parameter.
- `getDatabaseTemplate()` (line 278-365): Remove `.eq('enhancer_model', enhancerModel)` from the query. Remove the `qwen_instruct`/`qwen_base` fallback logic (lines 314-329). Remove `enhancerModel` parameter.
- Update `CacheData` interface (line 13) -- `enhancement` record nesting drops one level.

**File:** `supabase/functions/enhance-prompt/index.ts`

- Lines 581-586 and 601-607: Remove `enhancerModel` argument from `getTemplateFromCache()` and `getDatabaseTemplate()` calls.

## 4. Add Enhancement Model to Playground Settings UI

**File:** `src/hooks/usePlaygroundSettings.ts`
- Add `enhancementModel: string` to `PlaygroundSettings` interface
- Default value: `''` (empty string = use DB default)

**File:** `src/hooks/usePlaygroundModels.ts`
- Add `enhancement` group to `useGroupedModels()`: `models?.filter(m => m.modality === 'chat' && m.task === 'enhancement')`

**File:** `src/components/playground/PlaygroundSettingsPopover.tsx`
- Add an "Enhance" model selector row (same pattern as Chat/Image/Video selectors), populated from `grouped.enhancement`

## 5. Pass Enhancement Model from UI to Edge Function

**File:** `src/components/workspace/SimplePromptInput.tsx` (line 605-611)
- Add `enhancement_model: settings.enhancementModel || undefined` to the request body
- This requires the component to read playground settings (via `usePlaygroundSettings` hook or prop)

**File:** `src/components/workspace/MobileSimplePromptInput.tsx` (line 110-116)
- Same change as desktop

## 6. Update Cache Builder (if applicable)

The cache builder that populates `system_config.config.promptCache.templateCache.enhancement` must also drop the `enhancerModel` nesting level. This is likely in an edge function like `refresh-cache` or `build-cache`.

## Summary of All Changes

| File | Change |
|------|--------|
| `supabase/functions/enhance-prompt/index.ts` | Extract `enhancement_model`, add `resolveEnhancerModel()`, remove all hardcoded model keys, drop `enhancerModel` from template lookup calls |
| `supabase/functions/_shared/cache-utils.ts` | Simplify template lookup from 5-tuple to 4-tuple, remove `enhancerModel` parameter and qwen fallbacks |
| `src/hooks/usePlaygroundSettings.ts` | Add `enhancementModel` field |
| `src/hooks/usePlaygroundModels.ts` | Add `enhancement` group |
| `src/components/playground/PlaygroundSettingsPopover.tsx` | Add Enhance model selector |
| `src/components/workspace/SimplePromptInput.tsx` | Pass `enhancement_model` in sparkle request |
| `src/components/workspace/MobileSimplePromptInput.tsx` | Pass `enhancement_model` in sparkle request |
| Cache builder edge function | Drop `enhancerModel` nesting level |

## Database Changes

| Change | Detail |
|--------|--------|
| Insert into `api_models` | 1 row: MythoMax as `chat/enhancement` default (data insert, not schema migration) |

## Resolution Chain (New)

```text
1. User-selected enhancement_model from UI (if set)
2. DB default: api_models WHERE modality='chat' AND task='enhancement' AND is_default=true
3. Last-resort hardcoded fallback (only if DB query fails entirely)
```

