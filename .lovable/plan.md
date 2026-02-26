

# Enable Multi-Provider Routing in character-portrait Edge Function

## Problem

The `character-portrait` edge function is hardcoded to fal.ai in four places:
- **Auto-select** (line 121): Filters to `.eq('api_providers.name', 'fal')` only
- **API key error messages** (lines 147-151): Say "fal.ai" specifically
- **API call** (line 395): Always calls `https://fal.run/{modelKey}` with `Key` auth
- **Response parsing** (lines 440-449): Only handles fal response shapes

The client (sidebar model selector, `useCharacterStudio`) already sends the correct `apiModelId` for any provider. The edge function just ignores the provider and calls fal.run regardless.

## Approach

Follow the same pattern as the workspace (`useLibraryFirstWorkspace`): resolve the provider from the model's `api_providers.name`, then branch the API call. Reuse the existing `replicate-image` function's patterns for Replicate calls (polling, version-based predictions).

The NSFW `content_rating` already flows to the edge function. For fal, it maps to `enable_safety_checker: false`. For Replicate, most models don't have a safety checker toggle, so this is a no-op (which is correct -- Replicate models like RV5.1 are inherently uncensored).

## Changes

### File: `supabase/functions/character-portrait/index.ts`

**1. Fix auto-select query (line 121)**

Remove `.eq('api_providers.name', 'fal')`. Instead, use `default_for_tasks` to find the best model for the current task (`t2i` or `i2i`), regardless of provider. Fallback: any active image model by priority.

```
// Before
.eq('api_providers.name', 'fal');

// After
// No provider filter -- resolve by task + priority
if (isI2I) {
  modelQuery.contains('default_for_tasks', ['i2i']);
} else {
  modelQuery.contains('default_for_tasks', ['t2i']);
}
// Fallback: remove default_for_tasks filter, just get highest priority
```

**2. Fix API key error messages (lines 147-151)**

Replace "fal.ai" with the resolved provider name.

**3. Provider-aware API call (lines 392-412)**

Branch based on `apiModel.api_providers.name`:

- **`fal`**: Keep existing synchronous `POST https://fal.run/{modelKey}` with `Key` auth header. No changes.
- **`replicate`**: Use `POST https://api.replicate.com/v1/predictions` with `Bearer` auth and `version` from `apiModel.version`. Poll `GET /v1/predictions/{id}` until `succeeded`/`failed` (with 120s timeout, 2s intervals). This matches the existing `replicate-image` function.

**4. Provider-aware input building (lines 322-390)**

For fal: keep existing logic (`image_size: 'portrait_4_3'`, `enable_safety_checker`, `prompt_strength`, `image_url`/`image_urls`).

For Replicate:
- Use `width: 768, height: 1024` (3:4 portrait) instead of fal's preset string
- Map reference image to `image` input field
- Use `prompt_strength` (same name, same inverse logic) for I2I
- Merge `apiModel.input_defaults` for model-specific parameters
- No `enable_safety_checker` (Replicate models don't use it -- NSFW is inherently supported)

**5. Provider-aware response parsing (lines 440-449)**

- **fal**: Keep existing `result.images[].url` / `result.image.url`
- **replicate**: Parse from `prediction.output` (array of URL strings)

**6. Fix hardcoded `model_type: 'sdxl'` in job insert (line 295)**

Replace with `model_type: apiModel.api_providers.name` to reflect the actual provider.

## No Client-Side Changes Needed

The sidebar model selector already shows all active image models (fal + replicate) and passes the selected `apiModelId` through to the edge function. The `content_rating` already flows correctly. No UI changes are required -- the left pane already dictates model selection, reference strength, and content rating.

## Technical Details

### Replicate polling helper (new, inside the edge function)

```text
async function pollReplicatePrediction(predictionId, apiKey, timeoutMs = 120000)
  - GET https://api.replicate.com/v1/predictions/{id}
  - Poll every 2s until status is "succeeded" or "failed"
  - Timeout after 120s
  - Return the final prediction object
```

### NSFW / Safety Checker mapping

| Provider | content_rating='nsfw' | content_rating='sfw' |
|----------|----------------------|---------------------|
| fal | `enable_safety_checker: false` | `enable_safety_checker: true` |
| replicate | No parameter needed (uncensored by default) | No parameter needed |

### Batch generation for Replicate

Replicate models typically return `num_outputs` images in a single prediction. The `num_outputs` field maps directly to the `numImages` parameter. If a model doesn't support it, run multiple predictions via `Promise.all`.

## Files to Change

| File | Change |
|------|--------|
| `supabase/functions/character-portrait/index.ts` | Remove fal-only filter; add provider branching for input, API call, response parsing; add Replicate polling helper; fix hardcoded model_type |

