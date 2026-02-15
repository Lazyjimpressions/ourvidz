

# Schema-Driven Model Configuration

## Overview

Replace the raw JSON textarea for `input_defaults` and `capabilities` with a structured, schema-driven admin form. Each model's full input schema is stored in `capabilities.input_schema`, and the admin UI renders proper controls (sliders, dropdowns, toggles, text fields) for each parameter. The admin can set defaults, mark params as active/hidden, and define valid ranges -- all without editing raw JSON.

## Architecture

### 1. Store Input Schema in `capabilities`

Add a structured `input_schema` key inside the existing `capabilities` JSONB column. No DB migration needed -- it's already JSONB.

```text
capabilities: {
  // Existing fields (char_limit, nsfw_status, etc.) remain
  ...existing,
  
  input_schema: {
    prompt: { type: "string", required: true, hidden: true },
    negative_prompt: { type: "string", default: "" },
    image_size: {
      type: "object",
      properties: {
        width: { type: "integer", min: 256, max: 4096, step: 8, default: 1024 },
        height: { type: "integer", min: 256, max: 4096, step: 8, default: 1024 }
      }
    },
    num_inference_steps: { type: "integer", min: 1, max: 50, default: 30 },
    guidance_scale: { type: "float", min: 1, max: 20, step: 0.5, default: 7.5 },
    seed: { type: "integer", min: 0, max: 2147483647, default: null },
    enable_safety_checker: { type: "boolean", default: false },
    // Video-specific (LTX example):
    image_url: { type: "string", label: "Start Frame Image", description: "First frame reference" },
    image_url_end: { type: "string", label: "End Frame Image", description: "Last frame reference" },
    frame_rate: { type: "integer", min: 1, max: 60, default: 25 },
    num_frames: { type: "integer", min: 1, max: 257, default: 97 },
    aspect_ratio: { type: "enum", options: ["16:9","9:16","1:1","4:3","3:4","21:9","9:21"], default: "16:9" },
    resolution: { type: "enum", options: ["480p","720p","1080p"], default: "720p" },
    expand_prompt: { type: "boolean", default: true, description: "Let model expand prompt for quality" }
  }
}
```

Each parameter definition supports:
- `type`: string, integer, float, boolean, enum, object
- `min`, `max`, `step`: numeric range constraints
- `options`: enum values (for dropdowns)
- `default`: the default value (goes into `input_defaults` on save)
- `label`: human-readable name (falls back to param key)
- `description`: tooltip help text
- `required`: if true, must have a value
- `hidden`: if true, not shown to end users (system-managed like `prompt`)
- `active`: if false, param exists in schema but won't be sent (admin can toggle)

### 2. LTX Video 13B Example Configuration

Based on the fal.ai `fal-ai/ltx-video-13b-distilled` endpoint schema:

**input_defaults** (what gets spread into API payload):
```json
{
  "num_frames": 97,
  "frame_rate": 25,
  "resolution": "720p",
  "aspect_ratio": "16:9",
  "expand_prompt": true,
  "enable_safety_checker": false
}
```

**capabilities** (drives UI and validation):
```json
{
  "supports_i2v": true,
  "supports_t2v": true,
  "supports_start_end_frames": true,
  "char_limit": 2000,
  "safety_checker_param": "enable_safety_checker",
  "video": {
    "duration_range": { "min": 2, "max": 10, "default": 4 },
    "num_frames_range": { "min": 33, "max": 257, "default": 97 },
    "fps_range": { "min": 1, "max": 60, "default": 25 },
    "resolutions": ["480p", "720p", "1080p"],
    "aspect_ratios": ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "9:21"],
    "reference_mode": "dual"
  },
  "input_schema": {
    "prompt": { "type": "string", "required": true, "hidden": true },
    "negative_prompt": { "type": "string", "default": "" },
    "image_url": { "type": "string", "label": "Start Frame", "description": "Reference image for first frame" },
    "image_url_end": { "type": "string", "label": "End Frame", "description": "Reference image for last frame (optional)" },
    "num_frames": { "type": "integer", "min": 33, "max": 257, "default": 97, "description": "Total frames to generate" },
    "frame_rate": { "type": "integer", "min": 1, "max": 60, "default": 25 },
    "resolution": { "type": "enum", "options": ["480p", "720p", "1080p"], "default": "720p" },
    "aspect_ratio": { "type": "enum", "options": ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "9:21"], "default": "16:9" },
    "expand_prompt": { "type": "boolean", "default": true, "description": "LLM-based prompt expansion for quality" },
    "seed": { "type": "integer", "min": 0, "max": 2147483647, "default": null },
    "enable_safety_checker": { "type": "boolean", "default": false, "hidden": true }
  }
}
```

### 3. Admin UI Changes

**File: `src/components/admin/ApiModelsTab.tsx`**

Replace the raw JSON `Textarea` for `input_defaults` with a new `SchemaEditor` component that renders inside the ModelForm.

#### SchemaEditor Component

A new inline component (inside `ApiModelsTab.tsx` or a small helper file) that:

1. **Reads `capabilities.input_schema`** -- if present, renders structured controls
2. **Falls back to raw JSON textarea** -- if no schema defined, keeps current behavior
3. **Renders each parameter** as the appropriate control:
   - `integer`/`float` with min/max: Slider + number input
   - `boolean`: Switch toggle
   - `enum`: Select dropdown
   - `string`: Text input
   - `object`: Nested group (e.g., image_size with width/height)
4. **Each parameter row** shows:
   - Active toggle (switch) -- if inactive, param won't be included in defaults
   - Label + tooltip (from schema description)
   - Control (slider/select/switch/input)
   - Current value or "API default" placeholder when empty
5. **On save**, the component builds the `input_defaults` object from all active params with values

Layout: compact 2-column grid of parameter rows, each ~28px tall.

```text
+------------------------------------------------------------------+
| Input Parameters                              [Raw JSON toggle]   |
|------------------------------------------------------------------|
| [x] num_frames      [===|====97====|===]  97    (33-257)         |
| [x] frame_rate      [===|===25=====|===]  25    (1-60)           |
| [x] resolution      [ 720p          v ]                          |
| [x] aspect_ratio    [ 16:9          v ]                          |
| [x] expand_prompt   [ON]                                         |
| [ ] negative_prompt  ___________________________                 |
| [ ] seed             ___________________________  (API default)  |
+------------------------------------------------------------------+
```

#### Schema Builder (for new models)

When adding a model that has no `input_schema` yet, provide a small "Add Parameter" button that lets the admin define params one at a time:
- Parameter name (key)
- Type (dropdown: string, integer, float, boolean, enum)
- Default value
- Min/max/step (for numeric)
- Options (for enum, comma-separated)
- Description (optional)

This builds the schema incrementally. Alternatively, the admin can paste the full schema JSON (a "Paste Schema" button that accepts the fal.ai format and auto-maps it).

### 4. Capabilities Editor

Add a second section in ModelForm for non-input capabilities (the existing fields like `char_limit`, `supports_i2i`, `reference_mode`, `video.duration_range`, etc.). This is a simpler key-value editor:

```text
+------------------------------------------------------------------+
| Capabilities                                  [Raw JSON toggle]   |
|------------------------------------------------------------------|
| supports_i2v          [ON]                                        |
| supports_t2v          [ON]                                        |
| supports_start_end    [ON]                                        |
| char_limit            [ 2000        ]                             |
| reference_mode        [ dual    v   ]                             |
+------------------------------------------------------------------+
```

Known capability keys get appropriate controls (boolean = switch, numeric = input, enum = select). Unknown keys show as raw text inputs. This is simpler than the input schema editor since capabilities are less standardized.

### 5. Edge Function Impact

**No edge function changes needed for this phase.** The edge function already does `...apiModel.input_defaults` into the payload. As long as the admin UI correctly populates `input_defaults` from the schema editor, it works.

However, for LTX Video 13B specifically, the edge function's video parameter handling (lines 796-946) currently has WAN-specific branching. The "else" branch (line 935-946) handles "other video models" but only maps `num_frames`, `resolution`, and `fps`. LTX uses `frame_rate` (not `fps`), `aspect_ratio`, and `expand_prompt`. Since these come from `input_defaults` via the spread, they'll be included automatically -- the only risk is the else branch overwriting them with `body.input.fps` mapped to `modelInput.fps` (wrong key for LTX).

**Recommendation**: Add a small guard in the edge function else branch: if the model's `input_defaults` already has `frame_rate`, don't map `fps` to `fps`. This is a 2-line fix but not strictly required for the admin UI work.

### 6. How Empty Settings Work

- Parameters with `active: false` or no default: **not included** in `input_defaults`
- fal.ai uses its own server-side defaults for missing params
- In the user-facing UI (`useVideoModelSettings`), only params present in `capabilities.video` or `input_defaults` appear as selectable options
- Empty/null values: the admin sees "(API default)" placeholder -- the param row exists in the schema but has no override value

### 7. Files to Change

| File | Change |
|------|--------|
| `src/components/admin/ApiModelsTab.tsx` | Replace JSON textarea with SchemaEditor; add CapabilitiesEditor; add "Paste Schema" button |
| `src/components/admin/SchemaEditor.tsx` | New component -- renders structured param controls from `input_schema` |
| No new dependencies | Uses existing Slider, Switch, Select, Input, Tooltip components |
| No DB migration | `capabilities` is already JSONB |

### 8. Implementation Order

1. Build `SchemaEditor` component (renders params from schema, outputs `input_defaults` object)
2. Update `ModelForm` to use SchemaEditor when `input_schema` exists, raw JSON fallback otherwise
3. Add "Paste Schema" / "Add Parameter" UI for building schemas for new models
4. Add simple CapabilitiesEditor for the non-input capability fields
5. Populate LTX Video 13B with proper `input_defaults` and `capabilities` via the new UI (or a one-time DB update)
6. Optional: 2-line edge function guard for `frame_rate` vs `fps` key mapping

