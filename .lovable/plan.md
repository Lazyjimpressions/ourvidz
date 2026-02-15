

# Make Edge Function Model-Agnostic (Table-Driven Video)

## The Problem

The `fal-image/index.ts` edge function has ~200 lines of WAN-specific hardcoded logic:

- Hardcoded `fps = 16`, `num_frames` clamped to 81-100
- Hardcoded `guide_scale` range 1-10
- Hardcoded parameter name mappings (`frames_per_second` vs `frame_rate`)
- WAN-specific reference image handling duplicated from the generic I2I path
- WAN-specific parameter cleanup (`delete strength`, `delete image_size`, `delete guidance_scale`)
- Error messages that say "WAN 2.1" instead of being generic

Meanwhile, line 584 already does the right thing: `...apiModel.input_defaults` spreads the table-configured defaults. The WAN block then overwrites them with hardcoded values, defeating the purpose.

## The Fix

Replace the entire WAN-specific video block (lines 796-946) with generic, table-driven logic.

### Core Principle

The payload is built in 3 steps, all table-driven:

```text
1. Start with input_defaults from the model row (already done at line 584)
2. Apply user overrides from UI (duration, aspect ratio, resolution)
3. Clean up invalid params using input_schema as the allow-list
```

### File: `supabase/functions/fal-image/index.ts`

**Remove:**
- The `isWanI2V` variable and all code branching on it (~lines 475, 498-508, 743, 760-768, 770-778, 780-783, 796-946)
- All WAN-specific error messages, parameter name mappings, and hardcoded ranges

**Replace with generic video handling (inside `if (isVideo)` block):**

1. **Duration to num_frames conversion** (table-driven):
   - Read `frame_rate` from `input_defaults` (30 for LTX, 16 for WAN -- already in the table)
   - If `body.metadata?.duration` exists, calculate `num_frames = duration * frame_rate`
   - Clamp using `input_schema.num_frames.min/max` if available
   - No hardcoded fps or frame counts

2. **User overrides** (pass through from `body.input` or `body.metadata`):
   - `resolution`, `aspect_ratio`, `num_frames`, `frame_rate` -- just set them if provided
   - No parameter name remapping -- each model's `input_defaults` already uses the correct param names for its API

3. **Reference image for I2V** (generic, not WAN-specific):
   - If `hasReferenceImage` and `isVideo`, resolve and sign the image URL (reuse existing signing logic)
   - Set `modelInput.image_url` (the standard param name used by both WAN and LTX)
   - No model-specific branching needed -- both models use `image_url`

4. **Parameter cleanup** (table-driven allow-list):
   - After all overrides, get the list of valid param keys from `capabilities.input_schema`
   - If `input_schema` exists, remove any `modelInput` keys not in the schema (plus `prompt` which is always valid)
   - This automatically removes `strength`, `image_size`, `guidance_scale`, `frames_per_second`, or any other param that doesn't belong -- without hardcoding which params to delete per model
   - If no `input_schema` exists (legacy models), skip cleanup (pass everything through as before)

**Also remove:**
- The `isWanI2V` guard on `image_size` override (line 762) -- the allow-list cleanup handles this
- The `isWanI2V` guard on `guidance_scale` (line 781) -- same
- The `isWanI2V` guard on `strength` (line 743) -- same
- The WAN-specific reference image validation (lines 498-508, 863-908) -- replaced by generic I2V reference handling

**Keep unchanged:**
- Line 584: `...apiModel.input_defaults` (the foundation of table-driven payloads)
- Lines 587-594: Safety checker based on content mode (universal)
- Lines 599-733: I2I image handling for image models (not video, untouched)
- Lines 950-963: Aspect ratio to dimensions mapping for image models (not video, untouched)

### File: `src/components/admin/SchemaEditor.tsx`

Fix the `parseLlmsTxt` function to parse JSON defaults correctly:
- If a default value starts with `[` or `{`, run `JSON.parse()` on it
- This fixes `loras: "[]"` becoming `loras: []` (real array)

### Database Fix (manual, one-time)

Update the LTX model's `input_defaults.loras` from string `"[]"` to actual array `[]`. This can be done via the admin UI or a direct SQL update.

## What This Achieves

- Adding a new video model requires only database configuration (model key, input_defaults, capabilities.input_schema) -- zero edge function changes
- The allow-list cleanup means models only receive params they understand, eliminating "invalid parameter" errors
- Reference image handling works for any video model that has `image_url` in its schema
- Duration calculation uses each model's own `frame_rate` from the table, not a hardcoded value
- WAN 2.1 continues working because its `input_defaults` already has the correct param names and values

## Before/After Example

**LTX Video 13B payload (after fix):**
```text
{
  "prompt": "...",
  "loras": [],                     -- from input_defaults (fixed to real array)
  "frame_rate": 30,                -- from input_defaults
  "num_frames": 81,                -- calculated: duration * frame_rate, clamped by schema
  "resolution": "720p",            -- from input_defaults, overridable by UI
  "aspect_ratio": "1:1",           -- from UI
  "negative_prompt": "...",        -- from input_defaults
  "constant_rate_factor": 35,      -- from input_defaults
  "enable_safety_checker": false,  -- from content mode
  "first_pass_num_inference_steps": 8,
  "second_pass_num_inference_steps": 8,
  "first_pass_skip_final_steps": 1,
  "second_pass_skip_initial_steps": 5,
  "expand_prompt": false,
  "reverse_video": false,
  "image_url": "https://..."      -- signed reference image
}
```

No `frames_per_second`, no `guide_scale`, no `num_inference_steps` -- those aren't in LTX's schema so they get cleaned up automatically.

