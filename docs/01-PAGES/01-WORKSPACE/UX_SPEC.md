# Workspace UX Specification

**Document Version:** 3.0
**Last Updated:** 2026-03-22
**Status:** Active
**Page:** `/workspace`
**Components:** `MobileSimplifiedWorkspace.tsx`, `MobileSimplePromptInput.tsx`, `MobileSettingsSheet.tsx`

---

## Table of Contents

1. [Layout Structure](#layout-structure)
2. [Generation Workflow](#generation-workflow)
3. [Control Panel](#control-panel)
4. [Reference Image & I2I](#reference-image--i2i)
5. [Video Multi-Reference Mode](#video-multi-reference-mode)
6. [Mobile-Specific Behaviors](#mobile-specific-behaviors)

---

## Layout Structure

```
+-----------------------------------------------+
|  Header (Title + Settings)                    |
+-----------------------------------------------+
|  Prompt Input + Reference Box                 |
|  [Prompt] [Reference Image] [Generate]        |
+-----------------------------------------------+
|  Controls (Collapsible)                       |
|  Model | Quality | Aspect | Style | Advanced  |
+-----------------------------------------------+
|  Workspace Grid                               |
|  +-----+ +-----+ +-----+ +-----+              |
|  |Card | |Card | |Card | |Card |              |
|  +-----+ +-----+ +-----+ +-----+              |
|  <- Scrollable grid ->                        |
+-----------------------------------------------+
|  Bottom Navigation (Mobile)                   |
+-----------------------------------------------+
```

### Core Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `MobileSimplifiedWorkspace` | Main workspace page | `src/pages/MobileSimplifiedWorkspace.tsx` |
| `MobileSimplePromptInput` | Prompt input with reference box | `src/components/workspace/MobileSimplePromptInput.tsx` |
| `MobileSettingsSheet` | Advanced settings modal | `src/components/workspace/MobileSettingsSheet.tsx` |
| `SharedGrid` | Unified grid for workspace | `src/components/shared/SharedGrid.tsx` |
| `SharedLightbox` | Unified image/video preview | `src/components/shared/SharedLightbox.tsx` |

### Key Hooks

| Hook | Purpose | Location |
|------|---------|----------|
| `useLibraryFirstWorkspace` | Main workspace state management | `src/hooks/useLibraryFirstWorkspace.ts` |
| `useImageModels` | Image/video model loading | `src/hooks/useImageModels.ts` |
| `useLocalModelHealth` | Worker health monitoring | `src/hooks/useLocalModelHealth.ts` |

---

## Generation Workflow

### Image Generation Flow

1. **User Input**
   - User enters prompt in prompt input field
   - Optionally sets reference image (workspace/library item or uploaded)
   - Optionally adjusts controls (model, quality, aspect ratio, style, etc.)

2. **Generation Submission**
   - User clicks "Generate" button
   - System validates input (prompt required, reference image optional)
   - System selects model based on user selection or default

3. **Job Queuing**
   - System creates job record in `jobs` table
   - System routes to appropriate edge function:
     - Local SDXL -> `queue-job` edge function
     - Replicate models -> `replicate-image` edge function
     - fal.ai models -> `fal-image` edge function

4. **Realtime Staging**
   - Worker generates image and uploads to `workspace-temp` bucket
   - `job-callback` edge function creates row in `workspace_assets` table
   - Workspace subscribes to `workspace_assets` table changes
   - New item appears in grid immediately via realtime subscription

5. **Preview & Actions**
   - User can preview item in SharedLightbox
   - User can Save to Library (copies to `user-library` bucket)
   - User can Discard (deletes from `workspace-temp` and database)
   - User can Use as Reference (sets as reference image for I2I)

### Video Generation Flow

1. **User Input**
   - User switches mode to "Video" (toggle in controls)
   - User enters prompt
   - User optionally sets beginning reference image
   - User optionally sets ending reference image
   - User sets video duration (default: 5 seconds)

2. **Generation Submission**
   - Video-specific parameters passed to edge function
   - Only video-capable models shown in model dropdown

3. **Job Queuing**
   - System routes to `fal-image` edge function for fal.ai video models
   - Video generation parameters passed (duration, motion intensity, etc.)

4. **Realtime Staging**
   - Video file uploaded to `workspace-temp` bucket
   - Video preview shows duration overlay

5. **Preview & Actions**
   - Video playback controls in SharedLightbox

### Generation Status Indicators

**Job Queued:**
- Spinner icon in grid placeholder
- "Generating..." text
- Estimated time remaining (if available)

**Job Processing:**
- Progress indicator (if available from worker)
- Status text: "Processing..."
- Cancel button (if supported)

**Job Complete:**
- Image/video appears in grid
- Success animation (fade-in)
- Actions enabled (Save, Discard, Use as Reference)

**Job Failed:**
- Error icon in grid
- Error message displayed
- Retry button
- Error details in tooltip

---

## Control Panel

### Basic Controls

#### Model Selection

**Location:** Basic Controls section (always visible)

**Component:** Dropdown selector

**Behavior:**
- Models loaded dynamically from `api_models` table - NO hard-coded model names or IDs
- Filtered by `is_active = true` and `modality = 'image'` or `'video'`
- When reference image is set, filtered by `supports_i2i = true` capability
- Local SDXL shown with availability indicator (based on health check)

**Display:**
- Model name + provider (e.g., "Seedream v4.5 Edit (fal.ai)")
- Availability badge (Available/Unavailable)
- Capabilities tooltip (speed, cost, quality, NSFW support)

**Default Selection:**
- Always non-local (API) model for reliability
- T2I default: Model with `is_default = true` and `modality = 'image'`
- I2I default: Model with `is_default = true`, `modality = 'image'`, and `supports_i2i = true`
- Video default: Model with `is_default = true` and `modality = 'video'`

#### Quality Presets

**Options:**
- **Fast**: Lower quality, faster generation (Steps: 15-20)
- **High**: Higher quality, slower generation (Steps: 25-30, default)

#### Content Type

**Options:**
- **SFW**: Safe for work content
- **NSFW**: Not safe for work content (default)

#### Mode Selection

**Options:**
- **Image**: Image generation (default)
- **Video**: Video generation

### Style Controls

#### Aspect Ratio

**Options:**
- **16:9**: Landscape (default for video)
- **1:1**: Square (default for images)
- **9:16**: Portrait

#### Shot Type

**Options:** Wide, Medium, Close

**Impact:** Added to prompt via enhancement process - applies to ALL models

#### Camera Angle

**Options:** Eye Level, Low Angle, Overhead, Over Shoulder, Bird's Eye

**Impact:** Added to prompt via enhancement process - applies to ALL models

#### Style

**Component:** Text input

**Default:** "cinematic lighting, film grain, dramatic composition"

**Impact:** Added to prompt via enhancement - applies to ALL models

### Advanced Settings

#### Enhancement Model

**Options:**
- **None**: No enhancement (default for copy mode)
- **Qwen Instruct**: LOCAL Qwen instruct model via chat worker (default for modify mode)
- **OpenRouter Fallback**: Optional fallback when local Qwen unavailable

**Important:** Qwen instruct is LOCAL - may not always be available.

#### Steps

**Range:** 10-50 (model-dependent)
**Default:** 25 (high quality), 15 (fast quality)

#### Guidance Scale

**Range:** 1.0-20.0 (model-dependent)
**Default:** 7.5 (high quality), 5.0 (fast quality)

**Note:** WAN 2.1 I2V uses `guide_scale` (range 1-10) instead of `guidance_scale`

#### Negative Prompt

**Default:** Model-specific negative prompts from `negative_prompts` table

#### Seed

**Range:** 0-4294967295 (32-bit unsigned integer)
**Default:** Random (generated by system)

### Model Control Applicability

**Controls That Apply to All Models:**
- Shot Type - Added to prompt via enhancement
- Camera Angle - Added to prompt via enhancement
- Style - Added to prompt via enhancement
- Instruct Enhancement - Uses local Qwen instruct model

**Controls That Are Model-Specific:**
- Steps - Mapped via `api_models.capabilities.input_key_mappings`
- Guidance Scale - Mapped via `api_models.capabilities.input_key_mappings`
- Negative Prompt - Model-specific support
- Seed - Model-specific support via `capabilities.seed_control`

---

## Reference Image & I2I

### Reference Image Selection

#### Workspace/Library Item Reference

**Selection Methods:**
1. **Drag & Drop**: Drag item from grid to reference box
2. **"Use as Reference" Button**: Click button on card overlay
3. **Right-Click Menu**: Right-click on card -> "Use as Reference"

**Behavior:**
- Metadata extracted from workspace/library item
- Original prompt, seed, and generation parameters preserved
- Auto-enable modify mode (default)
- Reference strength set to 0.5

#### Uploaded Image Reference

**Selection Methods:**
1. **Drag & Drop**: Drag image file to reference box
2. **Click to Upload**: Click upload area -> file picker
3. **Paste**: Paste image from clipboard

**Behavior:**
- Image validated (format, size)
- Image stored in temporary storage
- Signed URL generated for worker access
- Auto-enable modify mode (default)
- Reference strength set to 0.5

### I2I Mode Toggle

#### Modify Mode (Default)

**Parameters:**
- Reference Strength: 0.5 (preserve subject, allow changes)
- Enhancement: Enabled
- Style Controls: Enabled
- SDXL Parameters: denoise_strength: 0.5, guidance_scale: 7.5, steps: 25

**Visual:** "MOD" badge, green/blue color scheme

**Use Cases:**
- "Change black dress to red" -> Same woman, same pose, red dress
- "Woman kissing her friend" -> Same woman, same pose, kissing scenario
- "Change background to beach" -> Same subject, beach background

#### Copy Mode (Manual Selection)

**Activation:** User must explicitly toggle from modify mode

**Parameters:**
- Reference Strength: 0.95 (maximum preservation)
- Enhancement: Disabled
- Style Controls: Disabled
- SDXL Parameters: denoise_strength: 0.05, guidance_scale: 1.0, steps: 15

**Visual:** "COPY" badge, red/orange color scheme

**Use Cases:**
- Exact copy of workspace item (preserve original prompt/seed)
- Exact copy of uploaded image (high-fidelity preservation)
- Character consistency across generations

### Reference Strength

**Range:** 0.0-1.0

| Strength | Description |
|----------|-------------|
| 0.0-0.3 | Minimal reference influence, more creative freedom |
| 0.4-0.6 | Balanced (default modify mode: 0.5) |
| 0.7-0.9 | Strong reference influence, high preservation |
| 0.95 | Maximum preservation (copy mode) |

### Mode Switching Behavior

| Current Mode | User Action | New Mode | Strength | Enhancement |
|--------------|-------------|----------|----------|-------------|
| Modify | Toggle to copy | Copy | 0.95 | Disabled |
| Copy | Toggle to modify | Modify | 0.5 | Enabled |
| None | Upload image | Modify | 0.5 | Enabled |
| None | Select workspace item | Modify | 0.5 | Enabled |

### Model Filtering (I2I)

**When Reference Image Set:**
- Model dropdown automatically filters to I2I-capable models
- Filtering based on `capabilities->>'supports_i2i' = 'true'`
- Local SDXL always included when healthy

**When Reference Image Removed:**
- Model dropdown shows all models (no filtering)

---

## Video Multi-Reference Mode

For video generation, the workspace supports a multi-reference mode that enables character-swap workflows using the LTX Video 13B MultiCondition endpoint.

### Overview

Multi-reference video mode allows users to:
- Provide a single identity image anchored at multiple keyframes
- Use a motion reference video for choreography and camera movement
- Control per-anchor strength values independently

### Keyframe Slot System

5 slots map to positions along the video timeline:

| Slot | Label | Frame Position | Character-Swap |
|------|-------|----------------|----------------|
| 0 | Start | Frame 0 | Active |
| 1 | Key 2 | ~25% | Greyed out |
| 2 | Key 3 | Midpoint | Active |
| 3 | Key 4 | ~75% | Greyed out |
| 4 | End | Last frame | Active |

### Character-Swap Mode Detection

Automatically detected when:
1. Video mode is active
2. Motion reference video is set
3. At least one keyframe image is set

### Strength Configuration

- **Start anchor (slot 0):** Typically 1.0 (strong identity lock)
- **Mid anchor (slot 2):** Typically 0.75 (moderate reinforcement)
- **End anchor (slot 4):** Typically 0.5 (allow motion influence)
- **Motion video strength:** Default 0.55

### Motion Conditioning Options

| Control | Values | Effect |
|---------|--------|--------|
| Conditioning Type | default, identity, pose, depth | How motion is extracted |
| Preprocess | true/false | Apply pose estimation |
| Motion Strength | 0.0-1.0 | Motion reference influence |

**Full specification:** See [VIDEO_MULTI_REF.md](./VIDEO_MULTI_REF.md)

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
- Icon rotates

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

### Mobile Upload

1. Tap upload area
2. File picker opens
3. Select image from gallery or camera
4. Image preview shown immediately
5. Upload progress indicator (if needed)

### iOS-Specific Features

- HEIC/HEIF image conversion using `heic2any` library
- Magic byte detection for image type (iOS Safari often returns empty `file.type`)
- File input handling optimized for iOS Safari quirks
- Automatic conversion to JPEG for HEIC images

---

## Error Handling UX

### Error States

**Network Errors:**
- Error message: "Network error. Please check your connection."
- Retry button, Offline indicator

**API Errors:**
- Error message: "Generation failed. Please try again."
- Retry button, Fallback to alternative model (if available)

**Validation Errors:**
- Inline error messages
- Highlighted input fields
- Clear error messages (e.g., "Prompt is required")

### Error Recovery

**Automatic Retry:**
- Transient errors retried automatically (3 attempts)
- Exponential backoff (1s, 2s, 4s)
- User notification on final failure

**Manual Retry:**
- Retry button on failed items
- Preserves original parameters
- New job created with same parameters

---

## Related Docs

- [PURPOSE.md](./PURPOSE.md) - Business requirements
- [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md) - Implementation status
- [VIDEO_MULTI_REF.md](./VIDEO_MULTI_REF.md) - Video multi-reference/character-swap specification

### Model Reference Guides

- [SEEDREAM_I2I.md](../../09-REFERENCE/SEEDREAM/SEEDREAM_I2I.md) - Seedream I2I reference guide
- [LTX_VIDEO_13B_FAL_AI_GUIDE.md](../../09-REFERENCE/LTX/LTX_VIDEO_13B_FAL_AI_GUIDE.md) - LTX video model reference
