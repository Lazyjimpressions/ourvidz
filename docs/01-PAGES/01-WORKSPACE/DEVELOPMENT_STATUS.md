# Workspace Development Status - Consolidated

**Last Updated:** January 10, 2026 (Updated with dynamic model loading and model control implementation details)
**Status:** **95% Complete - Production Ready**
**Purpose:** Single source of truth for workspace development status, implementation details, and next steps

---

## Current Implementation Status

### Production Ready (95% Complete)

**Core Features:**
- Responsive workspace pages: SimplifiedWorkspace.tsx, MobileSimplifiedWorkspace.tsx
- Generation submission with realtime staging
- Grid display with preview (SharedLightbox)
- Save to Library / Discard workflow
- Reference box for I2I (workspace/library items or uploaded images)
- I2I modify mode (default behavior)
- I2I copy mode (manual selection)
- 3rd party API integration (Replicate, fal.ai)
- Health check system for local SDXL worker

**Missing (5% Remaining):**
- Advanced batch operations with different parameters
- Style transfer from reference images
- Character consistency across generations
- Prompt template saving and reuse
- Generation history and parameter restoration

---

## Model Control Implementation

### Prompt Enhancement Controls (Apply to All Models)

These controls are added to prompts via the enhancement process and apply to ALL models (Seedream, Replicate, Local SDXL):

- **Shot Type** (`wide`, `medium`, `close`): Added to prompt via enhancement - applies to all models
- **Camera Angle** (`eye_level`, `low_angle`, `overhead`, etc.): Added to prompt via enhancement - applies to all models
- **Style** (free-form text): Added to prompt via enhancement - applies to all models
- **Instruct Enhancement**: Uses **LOCAL Qwen instruct model** via chat worker - applies to all models

**Important**: Qwen instruct is a **LOCAL model** (like SDXL and WAN workers) and may not always be available. When local Qwen is unavailable, enhancement fails unless an optional OpenRouter fallback is implemented.

**Enhancement Process:**
1. User prompt + shot type + camera angle + style → Enhancement service (`enhance-prompt` edge function)
2. Enhancement service uses **local Qwen instruct model** (via chat worker) to enhance prompt
   - **Primary**: Local Qwen instruct (if available)
   - **Fallback** (optional): OpenRouter model (if local unavailable and user triggers enhancement)
3. Enhanced prompt sent to selected model (Seedream, Replicate, or Local SDXL)
4. All models receive the enhanced prompt with style controls included

**Enhancement Templates:**
- Each model requires its own enhancement template in `prompt_templates` table
- Template's `target_model` must match `api_models.model_key` **exactly** (model-specific, not provider-based)
- Token limits are model-specific: Seedream (250 tokens), SDXL (75 tokens), WAN (150 tokens)
- Templates must be created for each active model in `api_models` table

### Model-Specific Parameters (Vary by Model)

These controls are model-specific and may not apply to all models:

- **Steps** (`num_inference_steps`): Model-specific parameter, mapped via `api_models.capabilities.input_key_mappings.steps`
- **Guidance Scale** (`guidance_scale`): Model-specific parameter, mapped via `api_models.capabilities.input_key_mappings.guidance_scale`
  - WAN 2.1 I2V uses `guide_scale` (range 1-10) instead of `guidance_scale` (range 1-20)
- **Negative Prompt**: Model-specific support, checked via `api_models.capabilities` field
- **Seed**: Model-specific support, checked via `api_models.capabilities.seed_control` field

**Settings Modal Behavior:**
- Advanced settings (steps, guidance scale, negative prompt, seed) are model-specific
- Edge functions (`fal-image`, `replicate-image`) map UI controls to model-specific parameter names via `api_models.capabilities.input_key_mappings`
- If model doesn't support a parameter, it's silently ignored (no error shown to user)

## Model Routing Architecture

### Health Check System

The workspace feature uses a health check system to conditionally show local SDXL model only when worker is available.

**Hook:** `useLocalModelHealth` (`src/hooks/useLocalModelHealth.ts`)

**Health Status Structure:**
```typescript
{
  sdxlWorker: {
    isAvailable: boolean,    // Worker is healthy AND has URL configured
    isHealthy: boolean,       // Health check passed
    lastChecked: string,      // ISO timestamp
    responseTimeMs: number,   // Response time in milliseconds
    error: string | null      // Error message if unhealthy
  },
  isLoading: boolean,
  isEnabled: boolean          // Whether health checks are enabled in admin settings
}
```

### Dynamic Model Loading

**CRITICAL**: All models are loaded dynamically from `api_models` table - NO hard-coded model names, IDs, or display name checks.

**Model Loading Process:**
1. Models loaded from `api_models` table filtered by `is_active = true` and `modality = 'image'` or `'video'`
2. Models joined with `api_providers` table for provider information
3. Local SDXL conditionally added based on health check status
4. When reference image is set, models filtered by `supports_i2i = true` capability from `api_models.capabilities` JSONB field

**Default Model Selection:**
- Default models selected from `api_models` where `is_default = true` and `is_active = true` - configured in database, NOT hard-coded
- **T2I Default**: Model with `is_default = true` and `modality = 'image'` (e.g., Seedream v4)
- **I2I Default**: Model with `is_default = true`, `modality = 'image'`, and `supports_i2i = true` (e.g., Seedream v4.5 Edit)
- **Video Default**: Model with `is_default = true` and `modality = 'video'` (e.g., WAN 2.1 I2V)
- Falls back to first active API model if no default is set

**Model Provider Matrix:**

| Modality | Primary (Cloud) | Fallback | Local (when available) |
|----------|-----------------|----------|------------------------|
| **Images** | Replicate, fal.ai models (dynamically loaded) | Models with `is_default = true` | SDXL Lustify (health-based) |
| **Video** | fal.ai models (dynamically loaded) | Models with `is_default = true` | WAN 2.1 (health-based) |

### Routing Strategy

- **Default to cloud models** for reliability
- Local models only used when:
  1. Admin enables health check toggle
  2. Health check confirms worker availability
  3. User explicitly selects local model
- Automatic fallback to cloud on local failure
- Models dynamically loaded from `api_models` table with `is_active = true` filter

### Database Configuration

**Required Tables:**
- `api_models` - Stores API model configurations (modality: 'image' | 'video')
- `api_providers` - Stores provider information (replicate, fal)
- `system_config` - Stores worker health cache in `config.workerHealthCache`

**Model Capabilities:**
- `supports_i2i`: Boolean flag indicating I2I support (primary indicator)
- `reference_images`: Boolean flag for backward compatibility
- `nsfw`: Boolean flag for NSFW content support
- `speed`: String ('fast' | 'medium' | 'slow')
- `cost`: String ('free' | 'low' | 'medium' | 'high')
- `quality`: String ('high' | 'medium' | 'low')

**I2I Filtering:**
- When reference image is set, models filtered by `supports_i2i = true` capability from `api_models.capabilities` JSONB field
- Local SDXL always supports I2I (always included when healthy) - has `supports_i2i = true` capability
- API models must have `supports_i2i = true` in capabilities to appear in filtered list
- **NO hard-coded model name checks** - filtering based solely on `capabilities->>'supports_i2i' = 'true'`

---

## File Structure

### Pages (2 files)
```
src/pages/
├── SimplifiedWorkspace.tsx (633 lines) - Desktop workspace
└── MobileSimplifiedWorkspace.tsx (553 lines) - Mobile workspace
```

### Components (3 key files)
```
src/components/workspace/
├── MobileSimplePromptInput.tsx - Mobile prompt input with I2I support
└── SimplePromptInput.tsx - Desktop prompt input with I2I support

src/components/shared/
├── SharedGrid.tsx - Unified grid for workspace and library
└── SharedLightbox.tsx - Unified image/video preview
```

### Hooks (3 key files)
```
src/hooks/
├── useLocalModelHealth.ts - Worker health monitoring
├── useImageModels.ts - Image/video model loading with I2I filtering
└── useLibraryFirstWorkspace.ts - Main workspace state management
```

### Services (1 file)
```
src/lib/services/
└── GenerationService.ts - Job queuing and generation requests
```

### Edge Functions (4 key files)
```
supabase/functions/
├── queue-job/index.ts - Local SDXL worker routing
├── job-callback/index.ts - Realtime workspace updates
├── replicate-image/index.ts - Replicate API routing
└── fal-image/index.ts - fal.ai API routing (images and videos)
```

---

## UI/UX Implementation

### Mobile-First Components

**MobileSimplePromptInput**
- Pattern: `[Prompt Input] [Reference Box] [Controls] [Generate Button]`
- Touch-optimized controls with 44px minimum touch targets
- Reference image preview with remove button
- MOD/COPY mode toggle with clear visual indicators
- **iOS-Specific Features:**
  - HEIC/HEIF image conversion using `heic2any` library
  - Magic byte detection for image type (iOS Safari often returns empty `file.type`)
  - File input handling optimized for iOS Safari quirks
  - Automatic conversion to JPEG for HEIC images

**SharedGrid**
- Responsive grid with 1x1 aspect ratio cards
- Newest items first
- Lazy loading and pagination support
- Card actions: Save to Library, Discard, Copy link, Use as reference

**SharedLightbox**
- Full-screen image/video preview
- Swipe navigation between items
- Zoom and pan support for images
- Video playback controls

### Best Practices Implemented

**Accessibility:**
- Touch targets minimum 44px x 44px
- Proper ARIA labels via shadcn/ui
- Keyboard navigation support

**Performance:**
- Lazy loading of images
- Efficient re-renders with memoization
- Optimized model loading
- Realtime subscription optimization

**User Experience:**
- Clear visual feedback for all actions
- Loading states for async operations
- Error states with recovery options
- Consistent design language

---

## Production Readiness Checklist

### Implementation Complete
- [x] Generation submission and realtime staging
- [x] Grid display with preview (SharedLightbox)
- [x] Save to Library / Discard workflow
- [x] Reference box for I2I (workspace/library items or uploaded images)
- [x] I2I modify mode (default behavior)
- [x] I2I copy mode (manual selection)
- [x] Health check hook created
- [x] Conditional local model availability
- [x] UI indicators (Available/Unavailable badges)
- [x] Real-time health updates via subscriptions
- [x] I2I-capable model filtering when reference image set

### Database Verification
- [x] Image models in `api_models` table
- [x] Video models in `api_models` table
- [x] Providers in `api_providers` table
- [x] Default models configured
- [x] I2I capabilities set correctly (`supports_i2i` flag)

### Known Issues Fixed
1. **RV5.1 Prompt Overwriting**: Fixed by ensuring user prompt comes last in spread operator
2. **Storage and URL Cache Policy**: Confirmed and working correctly
3. **Component Duplication**: Resolved with SharedGrid/SharedLightbox
4. **I2I Model Filtering**: Fixed by adding `supports_i2i` capability filtering

---

## Testing Guide

### Quick Start Commands

```bash
# Manual testing workflow
1. Navigate to /workspace
2. Test image generation with different models
3. Test I2I modify mode with workspace item
4. Test I2I copy mode with uploaded image
5. Test save to Library workflow
6. Test discard workflow
```

### Test Coverage

| Category | Status |
|----------|--------|
| Generation Submission | Implemented |
| Realtime Updates | Implemented |
| I2I Modify Mode | Implemented |
| I2I Copy Mode | Implemented |
| Model Selection | Implemented |
| Health Check Integration | Implemented |
| Save to Library | Implemented |
| Discard Workflow | Implemented |
| Reference Image Selection | Implemented |
| Model Filtering (I2I) | Implemented |

### Critical Test Scenarios

**Test 1: I2I Modify Mode (Default)**
1. Generate "woman in black dress"
2. Use as reference (should be MOD mode)
3. Type "change to red dress"
4. Generate
5. Verify: Same woman, same pose, red dress

**Test 2: I2I Copy Mode (Manual)**
1. Set reference image
2. Manually toggle to COPY mode
3. Leave prompt empty
4. Generate
5. Verify: Near-identical copy

**Test 3: Model Filtering (I2I)**
1. Set reference image
2. Open model dropdown
3. Verify: Only I2I-capable models shown
4. Remove reference image
5. Verify: All models shown

**Test 4: Health Check Integration**
1. Enable health check toggle (admin)
2. Verify: Local SDXL shown if healthy
3. Disable health check toggle
4. Verify: Local SDXL hidden

### Performance Benchmarks
- Generation submission: < 1 second
- Realtime update latency: < 1 second
- Page load time: < 3 seconds
- Model loading: < 1 second

---

## Success Metrics

### User Experience
- **Flow Completion Rate**: Target 95%+ from generation to save
- **Generation Time**: Target <60 seconds for high-quality images
- **Save Rate**: Target 70%+ of generated items saved to Library
- **Session Duration**: Target 15+ minutes average

### Technical Performance
- **Page Load Time**: Target <3 seconds on mobile - Achieved
- **Realtime Update Latency**: Target <1 second - Achieved
- **Memory Usage**: Target <100MB on mobile - Achieved
- **Model Loading Time**: Target <1 second - Achieved

### Workspace Quality
- **I2I Consistency**: Target 70%+ visual consistency for modify mode
- **Copy Fidelity**: Target 95%+ visual similarity for copy mode
- **Model Availability**: Target 99%+ uptime for API models
- **Error Recovery**: Target <5% error rate with proper recovery

---

## Upcoming Features (Q1 2026)

### Phase 2: Advanced Batch Operations
- Generate multiple variations with different parameters
- Batch selection and saving workflow
- Parameter presets for common variations

### Phase 2: Style Transfer
- Advanced style transfer from reference images
- Style strength controls
- Style mixing capabilities

### Phase 3: Character Consistency
- Maintain character consistency across generations
- Character reference library
- Consistency scoring and feedback

### Phase 3: Prompt Templates
- Save and reuse prompt templates
- Template sharing and discovery
- Template versioning

---

## Troubleshooting

### Local Models Not Showing
1. Check `system_config.workerHealthCache` in database
2. Verify health check toggle is enabled in admin settings
3. Verify worker URLs are configured
4. Check worker `/health` endpoints are accessible
5. Review console for health check errors

### Models Not Loading
1. Verify `api_models` table has active models
2. Check `modality` field is correct ('image' or 'video')
3. Verify `api_providers` relationship exists
4. Check RLS policies allow read access
5. Verify `is_active = true` for models

### I2I Filtering Not Working
1. Verify reference image is set correctly
2. Check `supports_i2i` capability is set in `api_models.capabilities`
3. Verify `useImageModels` hook is called with `hasReferenceImage` parameter
4. Check console for filtering logic errors

### Health Checks Failing
1. Verify `health-check-workers` edge function is deployed
2. Check worker URLs in `system_config`
3. Verify network connectivity to workers
4. Check worker `/health` endpoint responses
5. Verify health check toggle is enabled in admin settings

### Generation Failures
1. Check edge function logs for errors
2. Verify model configuration in `api_models` table
3. Check provider API keys are configured
4. Verify prompt enhancement is working
5. Check storage bucket permissions

---

## Related Documentation

- **PRD:** [PURPOSE.md](./PURPOSE.md) - Business requirements and technical overview
- **UX Generation:** [UX_GENERATION.md](./UX_GENERATION.md) - Generation workflow specifications
- **UX Controls:** [UX_CONTROLS.md](./UX_CONTROLS.md) - Control panel specifications
- **UX Reference:** [UX_REFERENCE.md](./UX_REFERENCE.md) - Reference image/I2I workflow specifications
- **Prompting System:** [docs/03-SYSTEMS/PROMPTING_SYSTEM.md](../03-SYSTEMS/PROMPTING_SYSTEM.md) - Model routing details

---

**Document Purpose:** This is the consolidated development status document that provides a single source of truth for implementation progress, model routing, UI/UX patterns, and testing procedures.
