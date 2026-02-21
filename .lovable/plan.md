
## Status: ✅ COMPLETED (2026-02-21)

# Comprehensive Model Table Audit and Schema Remediation

## Audit Summary

I reviewed all 18 active image/video models in the `api_models` table against their official fal.ai `llms.txt` schemas. The findings reveal significant gaps that undermine the table-driven architecture: 8 models are missing `input_schema` entirely, several have hardcoded model-key checks in the edge function that should be schema-driven, and the string-vs-array logic has a fragile `modelKey.includes('edit')` heuristic instead of relying on the schema.

---

## Finding 1: 8 Models Missing `input_schema`

These models have **no `input_schema`** in their `capabilities` JSONB, meaning the edge function cannot validate inputs, filter allowed keys, or enforce required fields:

| Model | model_key | What's Missing |
|-------|-----------|----------------|
| Seedream v4 T2I | `fal-ai/bytedance/seedream/v4/text-to-image` | Full schema (prompt, image_size, num_images, max_images, seed, sync_mode, enable_safety_checker, enhance_prompt_mode) |
| Seedream v4.5 T2I | `fal-ai/bytedance/seedream/v4.5/text-to-image` | Full schema (prompt, image_size, num_images, max_images, seed, sync_mode, enable_safety_checker) |
| Seedream v4 Edit | `fal-ai/bytedance/seedream/v4/edit` | Full schema -- critically missing `image_urls` (required, array of strings), `enhance_prompt_mode` |
| Seedream v4.5 Edit | `fal-ai/bytedance/seedream/v4.5/edit` | Full schema -- critically missing `image_urls` (required, array of strings) |
| WAN 2.1 I2V | `fal-ai/wan-i2v` | Full schema -- critically missing `image_url` (required), `num_frames`, `frames_per_second`, `guide_scale`, `shift`, `resolution`, `acceleration`, `aspect_ratio` |
| Stability SDXL | `stability-ai/sdxl` | (Legacy - out of scope) |
| SDXL-API | `lucataco/sdxl` | (Legacy - out of scope) |
| Realistic Vision | `lucataco/realistic-vision-v5.1` | (Legacy - out of scope) |

**Impact**: Without schemas, the edge function's allow-list filter (line 468-482) is bypassed entirely, meaning any parameter the client sends gets forwarded to fal.ai. The pre-flight validation (line 489-509) also does nothing because there are no `required` fields to check.

---

## Finding 2: Missing Capability Flags

Several models lack the capability flags that the edge function and client use for routing decisions:

| Model | Missing Flags | Impact |
|-------|---------------|--------|
| Seedream v4 Edit | `requires_image_urls_array: true`, `supports_i2i: true` (has supports_i2i but not requires_array) | Edge function falls back to `modelKey.includes('edit')` heuristic |
| Seedream v4.5 Edit | `requires_image_urls_array: true` (has supports_i2i but not requires_array) | Same heuristic fallback |
| WAN 2.1 I2V | `supports_i2v: true`, `safety_checker_param: enable_safety_checker` | Client can't detect this as an I2V model via capabilities |
| Grok I2I | `supports_i2i: true`, `requires_image_urls_array: false` | Not filterable as I2I model |
| LTX 13b extend | `video.type` is `"string"` but fal.ai expects `"object"` format `{video_url: "..."}` | Schema mismatch |

---

## Finding 3: Hardcoded Logic in Edge Function That Should Be Schema-Driven

Three places in `buildModelInput()` use `modelKey.includes()` instead of schema flags:

1. **Line 295**: `(supportsI2I && modelKey.includes('edit'))` -- determines if model needs `image_urls[]` array vs `image_url` string. Should use `requires_image_urls_array` flag or detect from `input_schema.image_urls` existence.

2. **Line 359**: `const isSeedreamEdit = modelKey.includes('seedream') && modelKey.includes('edit')` -- skips strength parameter for Seedream. Should use `uses_strength_param: false` flag (already exists on some models but not enforced).

3. **Line 308**: Same `modelKeyOverride.includes('edit')` pattern in the override branch.

**Fix**: Once all models have complete schemas, these can be replaced with:
- `requiresImageUrlsArray = !!inputSchema.image_urls` (if the schema has an `image_urls` field, the model expects an array)
- `usesStrength = inputSchema.strength !== undefined` (if the schema has a `strength` field, the model accepts it)

---

## Finding 4: String vs Array Logic Analysis

The current flow for determining whether to send `image_url` (string) or `image_urls` (array):

```text
Current logic:
1. Check capabilities.requires_image_urls_array === true  --> array
2. Fallback: capabilities.supports_i2i && modelKey.includes('edit') --> array
3. Otherwise --> string
```

**What the schema actually tells us** (from fal.ai llms.txt):
- Flux-2 Flash/Edit: `image_urls` (array, required) -- CORRECT, has `requires_image_urls_array: true`
- Flux Pro/Kontext: `image_url` (string, required) -- CORRECT, has `requires_image_urls_array: false`
- Seedream v4 Edit: `image_urls` (array, required) -- BROKEN, missing flag, relies on heuristic
- Seedream v4.5 Edit: `image_urls` (array, required) -- BROKEN, missing flag, relies on heuristic
- Grok I2I: `image_url` (string, required) -- WORKS by accident (no supports_i2i flag set, so falls through to string)
- WAN I2V: `image_url` (string, required) -- WORKS (video path, not I2I)

**Proposed fix**: Derive string-vs-array entirely from the schema:
```text
if (inputSchema.image_urls)  --> model expects array
if (inputSchema.image_url)   --> model expects string
```
No heuristics, no model_key sniffing.

---

## Finding 5: Additional Hardcoded Values

1. **`FAL_PRICING` map** (lines 37-50): Hardcoded pricing for specific model keys. Should be stored in `api_models.pricing` JSONB and read from there, falling back to the static map only for unknown models.

2. **Safety parameter logic** (lines 271-276): Already partially schema-driven via `safety_checker_param`, but the `safety_tolerance` value `'6'` for NSFW is hardcoded. Should come from `input_defaults.safety_tolerance`.

3. **Aspect ratio dimension maps** (lines 452-464): Hardcoded `1:1 -> 1024x1024`, `16:9 -> 1344x768`. These are model-specific and should ideally be in the schema, but this is lower priority since they're reasonable defaults.

---

## Remediation Plan

### Step 1: Populate Missing `input_schema` for All Active fal.ai Models

Update the `capabilities` JSONB for each model using the official llms.txt data. This is the highest-impact change.

**Models to update (5 fal.ai models):**

- **Seedream v4 T2I**: Add schema with `prompt` (required), `image_size`, `num_images`, `max_images`, `seed`, `sync_mode`, `enable_safety_checker`, `enhance_prompt_mode`
- **Seedream v4.5 T2I**: Add schema with `prompt` (required), `image_size`, `num_images`, `max_images`, `seed`, `sync_mode`, `enable_safety_checker`
- **Seedream v4 Edit**: Add schema with `prompt` (required), `image_urls` (required, type: array), `image_size`, `num_images`, `max_images`, `seed`, `sync_mode`, `enable_safety_checker`, `enhance_prompt_mode`. Add `requires_image_urls_array: true`
- **Seedream v4.5 Edit**: Add schema with `prompt` (required), `image_urls` (required, type: array), `image_size`, `num_images`, `max_images`, `seed`, `sync_mode`, `enable_safety_checker`. Add `requires_image_urls_array: true`
- **WAN 2.1 I2V**: Add schema with `prompt` (required), `image_url` (required), `negative_prompt`, `num_frames`, `frames_per_second`, `seed`, `resolution`, `num_inference_steps`, `guide_scale`, `shift`, `enable_safety_checker`, `enable_prompt_expansion`, `acceleration`, `aspect_ratio`. Add `supports_i2v: true`

**Also fix:**
- **LTX 13b extend**: Change `input_schema.video.type` from `"string"` to `"object"`
- **Grok I2I**: Add `supports_i2i: true`, `requires_image_urls_array: false`

### Step 2: Remove Hardcoded Model-Key Checks from Edge Function

Replace the three `modelKey.includes()` patterns with schema-driven logic:

**File: `supabase/functions/fal-image/index.ts`**

```text
// BEFORE (line 294-295):
let requiresImageUrlsArray = capabilities?.requires_image_urls_array === true ||
    (supportsI2I && modelKey.includes('edit'));

// AFTER:
let requiresImageUrlsArray = !!inputSchema.image_urls;
```

```text
// BEFORE (line 359):
const isSeedreamEdit = modelKey.includes('seedream') && modelKey.includes('edit');

// AFTER: (remove entirely -- uses_strength_param already handles this)
// The schema allow-list filter already removes 'strength' if it's not in the schema
```

```text
// BEFORE (line 307-308):
requiresImageUrlsArray = oc?.requires_image_urls_array === true ||
    (oc?.supports_i2i === true && modelKeyOverride.includes('edit'));

// AFTER:
const overrideSchema = oc?.input_schema || {};
requiresImageUrlsArray = !!overrideSchema.image_urls;
```

### Step 3: Simplify Strength Parameter Logic

Currently the strength logic has three guards: `schemaAllowsStrength`, `usesStrengthParam`, and `isSeedreamEdit`. With complete schemas, this simplifies to:

```text
// If the schema has a 'strength' field, include it. Otherwise don't.
if (inputSchema.strength && body.input?.strength !== undefined) {
    const range = inputSchema.strength;
    modelInput.strength = Math.min(Math.max(body.input.strength, range.min || 0.1), range.max || 1.0);
}
```

No special-casing for Seedream or any other model family.

### Step 4: Move Pricing to Database (Lower Priority)

Update `api_models.pricing` JSONB for each model with the per-generation cost from fal.ai llms.txt. Update `calculateFalCost()` to read from `apiModel.pricing` first, falling back to the static map.

This is lower priority but aligns with the table-driven philosophy.

### Step 5: Client-Side `useImageModels.ts` Cleanup

The `ImageModel.capabilities` TypeScript interface is stale -- it defines `nsfw`, `speed`, `cost`, `quality`, `reference_images`, `supports_i2i`, `seed_control`, `char_limit` but the actual capabilities JSONB now contains `input_schema`, `requires_image_urls_array`, `safety_checker_param`, `uses_strength_param`, `supports_i2v`, etc.

Update the interface to `Record<string, any>` (which it effectively already is via the cast on line 84) and remove the stale typed interface to prevent confusion.

---

## Files Changed

1. **Database (7 UPDATE statements)**: Populate `input_schema` for 5 models, fix 2 capability flags
2. **`supabase/functions/fal-image/index.ts`**: Remove 3 `modelKey.includes()` checks, simplify strength logic (~15 lines changed)
3. **`src/hooks/useImageModels.ts`**: Clean up stale `ImageModel.capabilities` interface

## What This Does NOT Change

- No new edge functions
- No changes to the main orchestrator flow
- No changes to the client payload format
- Video extend and I2V flows remain the same -- they just become properly validated

