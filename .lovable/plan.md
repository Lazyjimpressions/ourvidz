

# Fix: Reference Image Clearing for I2V Models

## Problem

When you select an I2V (image-to-video) model like "LTX 13b - i2v" and add a reference image, the system immediately clears it. This happens because:

1. The model-switch logic checks for `supports_i2v`, `supports_i2i`, `reference_images`, or `video.reference_mode` in the model's capabilities to decide if reference images are allowed.
2. The LTX i2v model stores its reference support under `input_schema.image_url.required = true` instead -- none of the checked flags are set.
3. So the system concludes the model doesn't support reference images and clears them.
4. Later, at generation time, a different check correctly reads `input_schema.image_url.required` and blocks with "Reference Image Required" -- but the image was already cleared.

## Fix

**File:** `src/hooks/useLibraryFirstWorkspace.ts` (lines 321-325)

Add `input_schema.image_url` to the I2I/I2V support detection in the `setSelectedModel` callback. If `input_schema.image_url` exists (whether required or optional), the model accepts reference images and they should not be cleared.

```text
Before (line 322-325):
  modelSupportsI2I = capabilities?.supports_i2i === true || 
                     capabilities?.reference_images === true ||
                     capabilities?.supports_i2v === true ||
                     capabilities?.video?.reference_mode === 'single';

After:
  modelSupportsI2I = capabilities?.supports_i2i === true || 
                     capabilities?.reference_images === true ||
                     capabilities?.supports_i2v === true ||
                     capabilities?.video?.reference_mode === 'single' ||
                     !!capabilities?.input_schema?.image_url;
```

This single line addition makes the model-switch detection consistent with the generation-time validation (line 1168), which already checks `input_schema.image_url.required`.

## Why This Is Sufficient

- The `input_schema.image_url` field is present on all models that accept a reference image (LTX i2v has `required: true`, LTX t2v has `required: false`)
- Models that are pure text-to-image/video and don't accept references simply don't have `input_schema.image_url` at all
- No other files need changes -- the generation payload builder already handles passing the image URL correctly once it isn't cleared

## Technical Details

| File | Change |
|------|--------|
| `src/hooks/useLibraryFirstWorkspace.ts` | Add `!!capabilities?.input_schema?.image_url` to the `modelSupportsI2I` check (1 line) |

