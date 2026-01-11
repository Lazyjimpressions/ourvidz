# Workspace Generation UX Specification

**Document Version:** 1.0
**Last Updated:** January 10, 2026 (Updated with default model selection logic and mobile vs desktop differences)
**Status:** Active
**Author:** AI Assistant
**Page:** `/workspace`
**Component:** `SimplifiedWorkspace.tsx`, `MobileSimplifiedWorkspace.tsx`

---

## Purpose

Generation workflow specification for workspace image and video generation with realtime staging, preview, and selective saving.

---

## Layout Structure

```
┌───────────────────────────────────────────────┐
│  Header (Title + Settings)                    │
├───────────────────────────────────────────────┤
│  Prompt Input + Reference Box                 │
│  [Prompt] [Reference Image] [Generate]       │
├───────────────────────────────────────────────┤
│  Controls (Collapsible)                       │
│  Model | Quality | Aspect | Style | Advanced  │
├───────────────────────────────────────────────┤
│  Workspace Grid                               │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐            │
│  │Card │ │Card │ │Card │ │Card │            │
│  └─────┘ └─────┘ └─────┘ └─────┘            │
│  ← Scrollable grid →                          │
├───────────────────────────────────────────────┤
│  Bottom Navigation (Mobile)                   │
└───────────────────────────────────────────────┘
```

---

## Core Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `SimplifiedWorkspace` | Desktop workspace page | `src/pages/SimplifiedWorkspace.tsx` |
| `MobileSimplifiedWorkspace` | Mobile workspace page | `src/pages/MobileSimplifiedWorkspace.tsx` |
| `SimplePromptInput` | Desktop prompt input | `src/components/workspace/SimplePromptInput.tsx` |
| `MobileSimplePromptInput` | Mobile prompt input | `src/components/workspace/MobileSimplePromptInput.tsx` |
| `SharedGrid` | Unified grid for workspace | `src/components/shared/SharedGrid.tsx` |
| `SharedLightbox` | Unified image/video preview | `src/components/shared/SharedLightbox.tsx` |

### Hooks

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
   - System selects model based on:
     - User selection (if set)
     - Default model (non-local for reliability)
     - I2I filtering (if reference image set, only I2I-capable models)

3. **Job Queuing**
   - System creates job record in `jobs` table
   - System routes to appropriate edge function:
     - Local SDXL → `queue-job` edge function
     - Replicate models → `replicate-image` edge function
     - fal.ai models → `fal-image` edge function

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
   - Similar to image generation flow
   - Video-specific parameters passed to edge function
   - Only video-capable models shown in model dropdown

3. **Job Queuing**
   - System routes to appropriate edge function based on selected model's provider:
     - fal.ai video models → `fal-image` edge function
     - Model selected dynamically from `api_models` table (e.g., WAN 2.1 I2V if configured as default)
   - Video generation parameters passed (duration, motion intensity, etc.)

4. **Realtime Staging**
   - Similar to image generation flow
   - Video file uploaded to `workspace-temp` bucket
   - Video preview shows duration overlay

5. **Preview & Actions**
   - Similar to image generation flow
   - Video playback controls in SharedLightbox

---

## Model Selection UI

### Model Dropdown

**Location:** Control panel (collapsible section)

**Behavior:**
- Models loaded dynamically from `api_models` table - NO hard-coded model names or IDs
- Filtered by `modality = 'image'` or `'video'` and `is_active = true`
- Local SDXL always shown (marked unavailable if unhealthy) - availability checked via `system_config.workerHealthCache.sdxlWorker`
- When reference image is set, models filtered by `supports_i2i = true` capability from `api_models.capabilities` JSONB field

**Model Display:**
- Model name loaded from `api_models.display_name` (e.g., "Seedream v4.5 Edit")
- Provider name loaded from `api_providers.display_name` (e.g., "fal.ai")
- Availability indicator (Available/Unavailable badge) - based on `is_active` flag and health checks
- Capabilities (speed, cost, quality, NSFW support) - from `api_models.capabilities` JSONB field

**Default Selection Logic:**
- Always non-local (API) model for reliability
- Selected from `api_models` where `is_default = true` and `is_active = true` - configured in database, NOT hard-coded
- **T2I Default**: Model with `is_default = true` and `modality = 'image'` (e.g., Seedream v4)
- **I2I Default**: Model with `is_default = true`, `modality = 'image'`, and `supports_i2i = true` (e.g., Seedream v4.5 Edit)
- **Video Default**: Model with `is_default = true` and `modality = 'video'` (e.g., WAN 2.1 I2V)
- Falls back to first active API model if no default is set

### Health Check Integration

**Local SDXL Display:**
- Shown as "SDXL (Local)" when healthy
- Shown as "SDXL (Local - Offline)" when unhealthy
- Availability checked via `useLocalModelHealth` hook
- Real-time updates via Supabase subscription to `system_config` table

---

## Quality and Batch Size Controls

### Quality Presets

**Options:**
- **Fast**: Lower quality, faster generation (fewer steps, lower resolution)
- **High**: Higher quality, slower generation (more steps, higher resolution)

**Default:** High

**Impact:**
- Steps: Fast (15-20), High (25-30)
- Resolution: Fast (lower), High (higher)
- Generation time: Fast (<30s), High (<60s)

### Batch Size

**Options:**
- Single image (default)
- Multiple images (2-4, depending on model)

**Display:**
- Number input or slider
- Model-specific limits shown
- Cost indicator for multiple images

---

## Generation Status Indicators

### Loading States

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

### Realtime Updates

**Subscription:**
- Supabase realtime subscription to `workspace_assets` table
- Filters by `user_id` for current user
- Debounced updates (500ms) to prevent flicker

**Update Flow:**
1. Worker uploads to `workspace-temp` bucket
2. `job-callback` creates row in `workspace_assets` table
3. Realtime subscription triggers
4. Workspace signs URL and renders item
5. Item appears in grid immediately

---

## Error Handling UX

### Error States

**Network Errors:**
- Error message: "Network error. Please check your connection."
- Retry button
- Offline indicator

**API Errors:**
- Error message: "Generation failed. Please try again."
- Retry button
- Fallback to alternative model (if available)

**Validation Errors:**
- Inline error messages
- Highlighted input fields
- Clear error messages (e.g., "Prompt is required")

**Storage Errors:**
- Error message: "Storage error. Please try again."
- Retry button
- Automatic retry with exponential backoff

### Error Recovery

**Automatic Retry:**
- Transient errors retried automatically (3 attempts)
- Exponential backoff (1s, 2s, 4s)
- User notification on final failure

**Manual Retry:**
- Retry button on failed items
- Preserves original parameters
- New job created with same parameters

**Fallback:**
- Automatic fallback to alternative model (if available)
- User notification of fallback
- Original model selection preserved for next generation

---

## Mobile vs Desktop Differences

### Feature Parity

**Both Platforms Support:**
- Image and video generation
- Reference image upload and I2I workflows
- Exact copy mode
- All model types (Replicate, fal.ai, Local SDXL)
- All style controls (shot type, camera angle, style)
- Advanced settings (steps, guidance scale, negative prompt, seed)
- Realtime workspace updates
- Save to Library / Discard actions

### Mobile-Specific Behaviors

**Touch Interactions:**
- Swipe to scroll grid
- Tap to preview in SharedLightbox
- Long-press for context menu (Save, Discard, Use as Reference)
- Collapsible sections (tap to expand/collapse)
- Touch-optimized buttons (44px minimum)

**Input Handling:**
- HEIC/HEIF image conversion for iOS devices
- Magic byte detection for image type (iOS Safari often returns empty file.type)
- Keyboard-aware layout (adjusts when keyboard visible)
- Dismiss keyboard on generate
- Auto-focus on prompt input

**UI Layout:**
- Compact control panel (collapsed by default)
- Bottom navigation bar
- Full-screen modals for dropdowns
- Sliders for numeric inputs (instead of number inputs)

**Performance Optimizations:**
- Lazy loading: Images loaded on scroll
- Placeholder shown until loaded
- Progressive image loading (thumbnail → full)
- Pagination: Load more on scroll (infinite scroll)
- Batch loading (10-20 items per batch)
- Loading indicator at bottom

### Desktop-Specific Behaviors

**UI Layout:**
- Expanded control panel (more controls visible by default)
- Sidebar navigation
- Dropdown menus (not full-screen modals)
- Number inputs for numeric values (instead of sliders)

**Interaction:**
- Hover states for buttons and cards
- Keyboard shortcuts (Enter to generate, etc.)
- Right-click context menus
- Drag-and-drop for reference images

---

## Related Docs

- [PURPOSE.md](./PURPOSE.md) - Business requirements
- [UX_CONTROLS.md](./UX_CONTROLS.md) - Control panel spec
- [UX_REFERENCE.md](./UX_REFERENCE.md) - Reference image/I2I spec
- [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md) - Implementation status
