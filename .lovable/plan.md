

# Refactor: fal-image Function Cleanup (Not a Split)

## Why NOT Split by Modality

Splitting into `fal-image` and `fal-video` would duplicate ~70% of the code (auth, model resolution, job creation, API call, storage, asset creation). This directly contradicts the table-driven architecture where `api_models` drives behavior. Every future bug fix or feature (usage logging, new providers) would need to be applied in two places.

The modality-specific code is only ~280 lines out of 1,824. The other 1,544 lines are shared.

## What's Actually Wrong

### Problem 1: URL Signing Copy-Pasted 5 Times
The same 15-line block for "detect bucket, split path, call createSignedUrl" is duplicated at 5 locations. Each copy has slightly different bucket defaults and error handling. This is the root cause of signing bugs.

### Problem 2: Post-Processing Bloat (300 lines)
Character portrait handling (167 lines) and scene destination handling (117 lines) are business logic that doesn't belong in a generation function. They handle file copying to `user-library`, creating library records, updating character records, retry logic, and thumbnail management. This makes the function hard to read and test.

### Problem 3: Defensive Fallback Chains
The video URL is sourced from `body.input?.video || body.metadata?.reference_image_url || body.metadata?.start_reference_url || body.input?.image_url`. The I2I reference is sourced from 6 different fields. These hide client-side bugs by "finding" the URL wherever it lands, making failures intermittent and hard to diagnose.

## Proposed Refactor

### Step 1: Extract `signIfStoragePath` Helper (Top-Level Function)
Replace all 5 copy-pasted blocks with one reusable function at module scope.

```text
Before: 5x 15-line blocks scattered through the file
After:  1x helper function, 5x one-line calls
```

Saves ~60 lines, eliminates signing inconsistencies.

### Step 2: Extract Input Mapper (Top-Level Function)
Create a `buildModelInput(body, apiModel, supabase)` function that handles:
- Prompt sanitization
- Safety parameter selection
- Reference image resolution (single, multi-ref, video conditioning)
- Aspect ratio mapping
- Schema allow-list filtering
- Required field validation

This is the core of the modality-specific logic (~400 lines) extracted into a testable, readable function.

### Step 3: Extract Post-Processing (Top-Level Function)
Create a `handlePostProcessing(supabase, body, result, user)` function that handles:
- Character portrait destination (copy to library, update character record)
- Character scene destination (copy to library, update scene record, retry)
- Scene preview destination (no-op)

This is ~300 lines that runs AFTER the generation succeeds and is independent of the API call.

### Step 4: Simplify the Main Handler to an Orchestrator
The `serve()` handler becomes a clean pipeline:

```text
1. CORS check
2. Auth
3. Resolve model from api_models
4. Build input (Step 2 helper)
5. Create job record
6. Call fal.ai API
7. Download result + upload to storage
8. Create workspace_assets record
9. Post-process destinations (Step 3 helper)
10. Return response
```

Each step is 5-15 lines in the main function, with complexity pushed into named helpers.

### Step 5: Remove Fallback Chains
For video extend: the client sends `input.video` -- period. No fallback to `metadata.reference_image_url`.
For I2V: the client sends `input.image_url` -- period. No fallback to `metadata.start_reference_url`.
For I2I: the client sends `input.image_url` or `input.image_urls` -- period.

If the field is missing, return a clear 400 error. This forces client bugs to surface immediately instead of intermittently.

## Files Changed

1. **`supabase/functions/fal-image/index.ts`** -- Refactor into orchestrator pattern with extracted helpers (all within same file per edge function rules: no subfolders, all code in index.ts)
2. **`src/hooks/useLibraryFirstWorkspace.ts`** -- Update client to send references in the correct, canonical field (no reliance on metadata fallbacks)

## What This Does NOT Change

- No new edge functions created
- No splitting by modality
- Same API contract (request/response format unchanged)
- Same table-driven model resolution
- Same fal.ai API integration pattern

## Expected Outcome

- Function drops from ~1,824 lines to ~800-900 lines (same file, helpers at module scope)
- URL signing bugs eliminated (single implementation)
- Client-side reference bugs surface immediately (no silent fallbacks)
- Post-processing logic is isolated and testable
- Adding new model types or destinations requires touching one helper, not hunting through 1,800 lines

