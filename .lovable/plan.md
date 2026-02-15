
# Fix: Mobile Video Reference Image Not Reaching Edge Function

## Root Cause

The client-side code in `useLibraryFirstWorkspace.ts` has a WAN-specific branching problem mirroring what we just fixed in the edge function. At line 1138-1157, it queries the model's capabilities to decide `isWanI2V`, but the query only selects `model_key, capabilities` -- NOT `modality`. So `(modelData as any).modality` is always `undefined`, causing `isWanI2V = false` for LTX.

This pushes LTX into the `else` branch (line 1260-1265) which sets:
```text
inputObj.image = startRefUrl    // WRONG KEY -- LTX expects "image_url"
```

The edge function's schema allow-list then strips `image` (not in LTX schema) and `image_url` is never set, causing fal.ai to reject with `"field required"`.

## The Fix

Remove ALL model-specific video branching from the client. The client should use a single, consistent approach for all video models:

### File: `src/hooks/useLibraryFirstWorkspace.ts`

1. **Remove the `isWanI2V` check entirely** (lines 1138-1157) -- no database query needed
2. **Unify the video input block** (lines 1242-1266): For ALL video models, always set `inputObj.image_url` (the standard param) from `startRefUrl || effRefUrl`. Remove the separate `else` branch that uses `inputObj.image`
3. **Remove WAN-specific `guide_scale` mapping** (lines 1251-1256) -- the edge function handles this via `input_defaults` from the table
4. **Remove WAN-specific comments** about `num_inference_steps` and `duration` -- the edge function calculates `num_frames` from table-configured `frame_rate`
5. **Clean up the validation** (lines 1178-1188): Replace the `isWanI2V` guard with a generic I2V guard that checks `input_schema.image_url.required` from capabilities

The unified video block becomes:
```text
if (isFalVideo) {
  const refImageUrl = startRefUrl || effRefUrl;
  if (refImageUrl) {
    inputObj.image_url = refImageUrl;  // Always use image_url for all video models
  }
  inputObj.duration = videoDuration || 5;  // Edge function converts to num_frames
}
```

No model-specific params (guide_scale, motion mapping, num_inference_steps) -- those come from `input_defaults` in the database and are applied by the edge function.

### Validation Update

Replace the WAN-specific "reference required" guard with a generic check using the model's `input_schema`:
- If `capabilities.input_schema.image_url.required === true` and no reference image is available, show a generic error: "This model requires a reference image for video generation"

## Technical Details

| Line Range | Change |
|---|---|
| 1138-1157 | Remove `isWanI2V` detection block and its database query |
| 1178-1188 | Replace WAN-specific validation with generic I2V validation using `input_schema` |
| 1242-1266 | Collapse into single unified video block: always use `image_url`, pass `duration` |

## Expected Result

The LTX payload from the client will now include `image_url` in `input` (not `image`), the edge function will keep it (it's in the LTX schema), and fal.ai will receive the reference image correctly.
