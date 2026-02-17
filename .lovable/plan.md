

# Remove Legacy Hardcoded Local Model References from Character Generation

## Problem

The character portrait and scene generation pipeline has multiple hardcoded references to `sdxl`, `queue-job`, and `chat_worker` that cause 500 errors when the local worker infrastructure (Upstash Redis) is unavailable. Since the system now runs third-party models dynamically, these legacy paths should be removed or made dynamic.

## Hardcoded Locations Found

### 1. `src/services/CharacterImageService.ts` (Critical - causes the 500)

- **Line 59**: `if (params.apiModelId === 'sdxl')` routes to `queue-job` edge function (the one failing with the Redis error)
- **Line 251**: `model_used: 'sdxl'` hardcoded in `generateCharacterScene()`
- The entire `sdxl` branch (lines 59-78) should be removed. When no `apiModelId` is provided, it already defaults to `fal-image`. The `else` branch (line 79+) correctly queries `api_models` for provider routing.

**Fix**: Remove the `sdxl` branch entirely. If someone somehow passes `'sdxl'` as an `apiModelId`, it will fall through to the dynamic `api_models` lookup (which won't find it and will gracefully fall back to `fal-image`). In `generateCharacterScene`, replace `model_used: 'sdxl'` with `model_used: 'fal'`.

### 2. `src/utils/characterImageUtils.ts`

- **Line 177**: `model_used: 'sdxl_high'` hardcoded when saving to user library

**Fix**: Change to `model_used: 'fal'` or accept a parameter for the actual model used.

### 3. `src/services/ImageConsistencyService.ts`

- **Line 14**: Type `modelChoice: 'sdxl' | 'replicate'` limits options
- **Line 53**: `if (request.modelChoice === 'sdxl')` routes to `queue-job`
- **Lines 170-176**: `generateWithSDXL` method calls `queue-job`

**Fix**: Change the type to `string`, remove the `sdxl` branch, and route all requests through `fal-image` (or the dynamic provider lookup). The `generateWithSDXL` method can be removed.

### 4. `src/components/characters/CharacterCard.tsx`

- **Line 119**: Reads `localStorage.getItem('roleplay_image_model')` which could return `'sdxl'`

**Fix**: No change needed here -- it passes whatever is stored. The fix in `CharacterImageService` will handle the `'sdxl'` value gracefully.

### 5. `src/hooks/useImageModels.ts`

- **Lines 113-129**: Hardcodes a local SDXL model option in the UI model list

**Fix**: Keep this for now (it shows as "Offline" when unavailable), but ensure it doesn't get selected as default. The real fix is in the service layer routing.

## Files to Change

| File | Change |
|---|---|
| `src/services/CharacterImageService.ts` | Remove `sdxl`/`queue-job` branch from `generateCharacterPortrait()`. Fix hardcoded `model_used` in `generateCharacterScene()`. |
| `src/utils/characterImageUtils.ts` | Change `model_used: 'sdxl_high'` to `'fal'` or make dynamic. |
| `src/services/ImageConsistencyService.ts` | Widen `modelChoice` type to `string`. Remove `sdxl` routing branch and `generateWithSDXL` method. Route all through `fal-image`. |

## Result

- Character tile "Generate" button will always route through `fal-image` (cloud) or `replicate-image`, never through `queue-job` (local Redis)
- No more 500 errors from Upstash being unavailable
- Model selection remains dynamic via the `api_models` database table

