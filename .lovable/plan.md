

# Fix: Reference Image Not Used + 300s Generation Time

## Investigation Findings

### Issue 1: Reference Image Not Influencing Output
The reference image IS being sent correctly to fal.ai with the right `image_url` field. However, the workspace forces **`aspect_ratio: 1:1`** (the UI default), overriding the model's default of `auto`. When the API receives a fixed aspect ratio that doesn't match the reference image dimensions, it may crop or distort the conditioning image, weakening its influence on the output.

### Issue 2: 300-Second Generation Time
The `api_models.input_defaults` for the LTX multicondition model includes `second_pass_num_inference_steps: 8` and `first_pass_skip_final_steps: 1`. This means **every single generation runs a full two-pass refinement pipeline**, even when the user hasn't enabled "Detail Pass" in the UI. The client code only sends these params when they differ from 8, so the defaults always apply. This effectively doubles compute time on every job.

## Plan

### 1. Update `api_models.input_defaults` (DB migration)
Remove second-pass params from the defaults so that single-pass is the baseline. Only include them when the user explicitly enables "Detail Pass."

```sql
UPDATE api_models
SET input_defaults = input_defaults
  - 'second_pass_num_inference_steps'
  - 'second_pass_skip_initial_steps'
  - 'first_pass_skip_final_steps'
WHERE model_key = 'fal-ai/ltx-video-13b-distilled/multiconditioning';
```

### 2. Fix client to send second-pass params only when Detail Pass is ON
**File**: `src/hooks/useLibraryFirstWorkspace.ts` (~line 1503-1511)

Currently the client conditionally sends step counts only when they differ from 8. Instead, it should:
- When `enableDetailPass` is true: send all second-pass params (steps, skip values)
- When `enableDetailPass` is false/unset: don't send any second-pass params

```typescript
if (multiAdvancedParams?.enableDetailPass) {
  inputObj.first_pass_num_inference_steps = multiAdvancedParams.firstPassSteps ?? 8;
  inputObj.first_pass_skip_final_steps = 1;
  inputObj.second_pass_num_inference_steps = multiAdvancedParams.secondPassSteps ?? 8;
  inputObj.second_pass_skip_initial_steps = 5;
  // other detail-pass-related params...
}
```

### 3. Use `aspect_ratio: auto` for video when ref images are present
**File**: `src/hooks/useLibraryFirstWorkspace.ts`

When generating video with multi-conditioning images, override the UI aspect ratio to `auto` so the model infers dimensions from the reference image:

```typescript
// When multi-conditioning with images, let the model infer aspect ratio
if (inputObj.images?.length > 0) {
  inputObj.aspect_ratio = 'auto';
}
```

### 4. Edge function: skip second-pass params when not provided
**File**: `supabase/functions/fal-image/index.ts`

In `buildModelInput`, only include second-pass params if explicitly provided in the request (not from defaults):

```typescript
// Only include second-pass params if explicitly requested
if (body.input.second_pass_num_inference_steps !== undefined) {
  modelInput.second_pass_num_inference_steps = body.input.second_pass_num_inference_steps;
}
```

## Expected Results
- **Generation time**: ~150s instead of ~300s (single pass vs two-pass)
- **Ref image adherence**: Model uses `auto` aspect ratio, inferring from the reference image dimensions
- **Detail Pass**: Still available as an opt-in toggle for higher quality when needed

