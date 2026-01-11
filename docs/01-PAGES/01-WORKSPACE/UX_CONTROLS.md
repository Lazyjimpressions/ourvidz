# Workspace Controls UX Specification

**Document Version:** 1.0
**Last Updated:** January 10, 2026 (Updated with model control applicability and dynamic model loading details)
**Status:** Active
**Author:** AI Assistant
**Page:** `/workspace`
**Component:** `SimplePromptInput.tsx`, `MobileSimplePromptInput.tsx`

---

## Purpose

Control panel layout and structure specification for workspace generation controls, including model selection, quality presets, style controls, and advanced settings.

---

## Layout Structure

```
┌───────────────────────────────────────────────┐
│  Controls Panel (Collapsible)                │
├───────────────────────────────────────────────┤
│  [▼] Basic Controls                           │
│  Model: [Dropdown ▼]                          │
│  Quality: [Fast] [High]                       │
│  Content: [SFW] [NSFW]                       │
│  Mode: [Image] [Video]                        │
├───────────────────────────────────────────────┤
│  [▼] Style Controls                           │
│  Aspect Ratio: [16:9] [1:1] [9:16]          │
│  Shot Type: [Wide] [Medium] [Close]          │
│  Camera Angle: [Eye Level] [Low] [Overhead]  │
│  Style: [Text Input]                          │
├───────────────────────────────────────────────┤
│  [▼] Advanced Settings                        │
│  Enhancement: [Model Dropdown]               │
│  Steps: [Slider]                              │
│  Guidance Scale: [Slider]                     │
│  Negative Prompt: [Text Input]               │
│  Seed: [Number Input]                         │
└───────────────────────────────────────────────┘
```

---

## Basic Controls

### Model Selection

**Location:** Basic Controls section (always visible)

**Component:** Dropdown selector

**Behavior:**
- Models loaded dynamically from `api_models` table - NO hard-coded model names or IDs
- Filtered by `is_active = true` and `modality = 'image'` or `'video'`
- When reference image is set, filtered by `supports_i2i = true` capability from `api_models.capabilities` JSONB field
- Local SDXL shown with availability indicator (based on `system_config.workerHealthCache.sdxlWorker` health check)

**Display:**
- Model name + provider (e.g., "Seedream v4.5 Edit (fal.ai)") - loaded from `api_models.display_name` and `api_providers.display_name`
- Availability badge (Available/Unavailable) - based on `is_active` flag and health checks
- Capabilities tooltip (speed, cost, quality, NSFW support) - from `api_models.capabilities` JSONB field

**Default:**
- Always non-local (API) model for reliability
- Selected from `api_models` where `is_default = true` and `is_active = true` - configured in database, NOT hard-coded
- T2I default: Model with `is_default = true` and `modality = 'image'` (e.g., Seedream v4)
- I2I default: Model with `is_default = true`, `modality = 'image'`, and `supports_i2i = true` (e.g., Seedream v4.5 Edit)
- Video default: Model with `is_default = true` and `modality = 'video'` (e.g., WAN 2.1 I2V)

### Quality Presets

**Location:** Basic Controls section

**Component:** Toggle buttons or radio group

**Options:**
- **Fast**: Lower quality, faster generation
- **High**: Higher quality, slower generation (default)

**Impact:**
- Steps: Fast (15-20), High (25-30)
- Resolution: Fast (lower), High (higher)
- Generation time: Fast (<30s), High (<60s)

**Visual:**
- Active state highlighted
- Tooltip showing impact on generation time and quality

### Content Type

**Location:** Basic Controls section

**Component:** Toggle buttons or radio group

**Options:**
- **SFW**: Safe for work content
- **NSFW**: Not safe for work content (default)

**Impact:**
- Prompt templates selected based on content type
- Negative prompts filtered by content mode
- Model capabilities checked (NSFW support)

**Visual:**
- Active state highlighted
- Warning icon for NSFW mode

### Mode Selection

**Location:** Basic Controls section

**Component:** Toggle buttons or radio group

**Options:**
- **Image**: Image generation (default)
- **Video**: Video generation

**Impact:**
- Model dropdown filtered by `modality = 'image'` or `'video'`
- Video-specific controls shown (duration, motion intensity)
- Beginning/ending reference images enabled for video

**Visual:**
- Active state highlighted
- Mode-specific icons

---

## Style Controls

### Aspect Ratio

**Location:** Style Controls section (collapsible)

**Component:** Button group or dropdown

**Options:**
- **16:9**: Landscape (default for video)
- **1:1**: Square (default for images)
- **9:16**: Portrait

**Impact:**
- Image dimensions adjusted based on aspect ratio
- Model-specific aspect ratio support checked
- Preview updated to show aspect ratio

**Visual:**
- Aspect ratio preview icon
- Active state highlighted

### Shot Type

**Location:** Style Controls section

**Component:** Button group or dropdown

**Options:**
- **Wide**: Wide shot (default)
- **Medium**: Medium shot
- **Close**: Close-up shot

**Impact:**
- Added to prompt via enhancement process (applies to ALL models - Seedream, Replicate, Local SDXL)
- Shot type is added to the prompt before generation, so it works with all models
- No model-specific checks needed - all models receive the enhanced prompt with shot type included

**Visual:**
- Shot type preview icon
- Active state highlighted

### Camera Angle

**Location:** Style Controls section

**Component:** Button group or dropdown

**Options:**
- **Eye Level**: Eye level shot (default)
- **Low Angle**: Low angle shot
- **Overhead**: Overhead shot
- **Over Shoulder**: Over shoulder shot
- **Bird's Eye**: Bird's eye view

**Impact:**
- Added to prompt via enhancement process (applies to ALL models - Seedream, Replicate, Local SDXL)
- Camera angle is added to the prompt before generation, so it works with all models
- No model-specific checks needed - all models receive the enhanced prompt with camera angle included

**Visual:**
- Camera angle preview icon
- Active state highlighted

### Style

**Location:** Style Controls section

**Component:** Text input

**Default:** "cinematic lighting, film grain, dramatic composition"

**Behavior:**
- Free-form text input
- Auto-complete suggestions (optional)
- Style presets (optional)

**Impact:**
- Added to prompt via enhancement process (applies to ALL models - Seedream, Replicate, Local SDXL)
- Style text is added to the prompt before generation, so it works with all models
- No model-specific checks needed - all models receive the enhanced prompt with style included

**Visual:**
- Text input with placeholder
- Character count (optional)

---

## Advanced Settings

### Enhancement Model

**Location:** Advanced Settings section (collapsible) OR optional "Enhance Prompt" button

**Component:** Dropdown selector OR button

**Options:**
- **None**: No enhancement (default for copy mode)
- **Qwen Instruct**: **LOCAL** Qwen instruct model via chat worker (default for modify mode)
- **Qwen Base**: **LOCAL** Qwen base model via chat worker (alternative)
- **OpenRouter Fallback**: Optional fallback when local Qwen unavailable (user-triggered)

**Important Notes:**
- Qwen instruct is **LOCAL** (like SDXL and WAN workers) - may not always be available
- When local Qwen unavailable, enhancement fails unless OpenRouter fallback is implemented
- Enhancement templates are **model-specific** - each model in `api_models` needs its own template
- Template's `target_model` must match `api_models.model_key` exactly (not provider-based)
- Token limits vary by model: Seedream (250 tokens), SDXL (75 tokens), WAN (150 tokens)

**Impact:**
- Prompt sent to **local Qwen instruct model** (via chat worker) for enhancement before generation
- Enhanced prompt includes user prompt + shot type + camera angle + style
- Enhanced prompt used for generation with selected model (Seedream, Replicate, or Local SDXL)
- Applies to ALL models - enhancement happens before model selection
- Skipped in exact copy mode
- **Fallback**: If local unavailable, optional OpenRouter enhancement (user-triggered button)

**Visual:**
- Model name + "Local" badge (if local) or "OpenRouter" badge (if fallback)
- Active state highlighted
- Disabled in copy mode
- Shows availability status (Available/Unavailable) for local models

### Steps

**Location:** Advanced Settings section

**Component:** Slider or number input

**Range:** 10-50 (model-dependent)

**Default:** 25 (high quality), 15 (fast quality)

**Impact:**
- Number of diffusion steps (model-specific parameter)
- Higher steps = better quality, slower generation
- Parameter name mapped via `api_models.capabilities.input_key_mappings.steps` (may be `steps` or `num_inference_steps`)
- Model-specific step limits enforced (range varies by model)
- WAN 2.1 I2V uses default steps (30) unless explicitly provided

**Visual:**
- Slider with value display
- Min/max labels
- Tooltip showing impact

### Guidance Scale

**Location:** Advanced Settings section

**Component:** Slider or number input

**Range:** 1.0-20.0 (model-dependent)

**Default:** 7.5 (high quality), 5.0 (fast quality)

**Impact:**
- Strength of prompt guidance (model-specific parameter)
- Higher scale = more adherence to prompt
- Parameter name mapped via `api_models.capabilities.input_key_mappings.guidance_scale` (may be `guidance_scale` or `guide_scale`)
- Model-specific scale limits enforced (range varies by model)
- WAN 2.1 I2V uses `guide_scale` (range 1-10) instead of `guidance_scale` (range 1-20)

**Visual:**
- Slider with value display
- Min/max labels
- Tooltip showing impact

### Negative Prompt

**Location:** Advanced Settings section

**Component:** Text input

**Default:** Model-specific negative prompts from `negative_prompts` table

**Behavior:**
- Free-form text input
- Preset negative prompts (optional)
- Model-specific negative prompts loaded automatically

**Impact:**
- Added to generation parameters (model-specific support)
- Model-specific negative prompt support checked via `api_models.capabilities` field
- If model doesn't support negative prompts, parameter is silently ignored

**Visual:**
- Text input with placeholder
- Character count (optional)

### Seed

**Location:** Advanced Settings section

**Component:** Number input

**Range:** 0-4294967295 (32-bit unsigned integer)

**Default:** Random (generated by system)

**Impact:**
- Controls random seed for generation (model-specific support)
- Same seed + same prompt = same result
- Used for consistency in I2I copy mode
- Model-specific seed support checked via `api_models.capabilities.seed_control` field
- If model doesn't support seed control, parameter is silently ignored

**Visual:**
- Number input with randomize button
- Lock icon when seed is locked
- Tooltip explaining seed usage

---

## Control States

### Disabled States

**Exact Copy Mode:**
- Style controls disabled (aspect ratio, shot type, camera angle, style)
- Enhancement model disabled (set to "None")
- Advanced settings disabled (steps, guidance scale, negative prompt)
- Reference strength locked to 0.95

**No Reference Image:**
- I2I-specific controls hidden
- Model filtering shows all models (not just I2I-capable)

**Video Mode:**
- Image-specific controls hidden
- Video-specific controls shown (duration, motion intensity, beginning/ending reference)

### Loading States

**Model Loading:**
- Dropdown shows "Loading models..."
- Spinner icon
- Disabled until models loaded

**Health Check:**
- Local model availability checked
- Badge shows "Checking..." during health check
- Updates in real-time via subscription

---

## Mobile-Specific Behaviors

### Collapsible Sections

**Default State:**
- Basic Controls: Expanded (always visible)
- Style Controls: Collapsed
- Advanced Settings: Collapsed

**Interaction:**
- Tap section header to expand/collapse
- Smooth animation
- Icon rotates (▼/▲)

### Touch Targets

**Minimum Size:** 44px x 44px

**Spacing:**
- 8px between controls
- 16px between sections
- 24px padding around panel

### Input Methods

**Sliders:**
- Large touch targets
- Value display above slider
- Increment/decrement buttons (optional)

**Dropdowns:**
- Full-screen modal on mobile
- Search/filter capability
- Scrollable list

**Text Inputs:**
- Keyboard-aware layout
- Auto-focus on tap
- Dismiss keyboard button

---

## Model Control Applicability

### Controls That Apply to All Models

These controls are added to prompts via the enhancement process and apply to ALL models (Seedream, Replicate, Local SDXL):

- **Shot Type**: Added to prompt via enhancement - applies to all models
- **Camera Angle**: Added to prompt via enhancement - applies to all models
- **Style**: Added to prompt via enhancement - applies to all models
- **Instruct Enhancement**: Uses local Qwen instruct model (via chat worker, NOT OpenRouter) - applies to all models

### Controls That Are Model-Specific

These controls are model-specific parameters and may not apply to all models:

- **Steps**: Model-specific parameter, mapped via `api_models.capabilities.input_key_mappings`
- **Guidance Scale**: Model-specific parameter, mapped via `api_models.capabilities.input_key_mappings`
- **Negative Prompt**: Model-specific support, checked via `api_models.capabilities` field
- **Seed**: Model-specific support, checked via `api_models.capabilities.seed_control` field

**Settings Modal Behavior:**
- Advanced settings (steps, guidance scale, negative prompt, seed) are model-specific
- Edge functions (`fal-image`, `replicate-image`) map UI controls to model-specific parameter names via `api_models.capabilities.input_key_mappings`
- If model doesn't support a parameter, it's silently ignored (no error shown to user)

## Related Docs

- [PURPOSE.md](./PURPOSE.md) - Business requirements
- [UX_GENERATION.md](./UX_GENERATION.md) - Generation workflow spec
- [UX_REFERENCE.md](./UX_REFERENCE.md) - Reference image/I2I spec
- [SEEDREAM_I2I.md](./SEEDREAM_I2I.md) - **NEW:** Comprehensive Seedream I2I reference image guide (v4 Edit, v4.5 Edit, exact copy mode, NSFW enhancement)
- [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md) - Implementation status
