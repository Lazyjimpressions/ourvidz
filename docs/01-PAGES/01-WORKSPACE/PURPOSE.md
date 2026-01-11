# Workspace Purpose & PRD (Product Requirements Document)

**Last Updated:** January 10, 2026 (Updated with model control applicability and dynamic model loading details)
**Status:** ✅ **Production Ready - 95% Complete**
**Priority:** **HIGH** - Core MVP Feature

## **🎯 Purpose Statement**

Provide a responsive workspace for generating, staging, previewing, iterating, and selectively saving AI-generated images and videos to the Library. Enable rapid iteration with image-to-image (I2I) capabilities for subject modification and exact copying.

## **👤 User Intent & Business Goals**

### **Primary User Intent**
- **Rapid Generation**: Generate and iterate quickly on AI content
- **Selective Saving**: Preview and save only the best results to Library
- **Subject Modification**: Modify existing images while preserving subject/pose/composition
- **Workflow Efficiency**: Streamlined staging-to-library workflow

### **Secondary User Intent**
- **Reference-Based Generation**: Use workspace/library items or uploaded images as references for I2I
- **Exact Copying**: Create high-fidelity copies of existing images (manual selection)
- **Batch Operations**: Generate multiple variations and select favorites
- **Style Transfer**: Apply styles from reference images to new generations

### **Business Value**
- **User Engagement**: Rapid iteration increases session duration and content creation
- **Content Quality**: Selective saving ensures only high-quality content enters Library
- **Competitive Differentiation**: Advanced I2I capabilities vs. basic generation tools
- **User Retention**: Efficient workflow reduces friction and increases satisfaction
- **Revenue Opportunity**: Premium features for advanced consistency and batch operations

## **🏗️ Core Functionality Requirements**

### **Primary Features (MVP)**
1. **Generation Submission** - Image and video generation with realtime staging
2. **Grid Display** - Responsive grid with preview (SharedLightbox)
3. **Save to Library / Discard** - Selective saving workflow
4. **Reference Box for I2I** - Workspace/library items or uploaded images
5. **I2I Modify Mode** - Default mode for subject modification (preserve subject, allow changes)
6. **I2I Copy Mode** - Manual mode for exact copying (high-fidelity preservation)
7. **Model Selection** - Dynamic model selection from `api_models` table with health-based availability
8. **Realtime Updates** - Event-driven workspace updates via Supabase subscriptions

**Model Selection Details:**
- **Dynamic Loading**: All models loaded dynamically from `api_models` table filtered by `is_active = true` - NO hard-coded model names or IDs
- **I2I Filtering**: When reference image is set, models filtered by `supports_i2i = true` capability from `api_models.capabilities` JSONB field
- **Health-Based Availability**: Local SDXL conditionally available based on worker health checks via `system_config.workerHealthCache.sdxlWorker`
- **Default Selection**: Default models selected from `api_models` table where `is_default = true` and `is_active = true` - configured in database, NOT hard-coded
  - **T2I Default**: Seedream v4 (fal.ai) - must have `is_default = true` in `api_models` table
  - **I2I Default**: Seedream v4.5 Edit (fal.ai) - must have `is_default = true` and `supports_i2i = true` in `api_models` table
  - **Video Default**: WAN 2.1 I2V (fal.ai) - must have `is_default = true` and `modality = 'video'` in `api_models` table
- **Provider Support**: Replicate, fal.ai, Local SDXL - all configured in `api_models` table with `api_providers` foreign key

### **Secondary Features (Phase 2)**
1. **Advanced Batch Operations** - Generate multiple variations with different parameters
2. **Style Transfer** - Advanced style transfer from reference images
3. **Character Consistency** - Maintain character consistency across generations
4. **Prompt Templates** - Save and reuse prompt templates
5. **Generation History** - View and restore previous generation parameters

## **🎨 UX/UI Design Requirements**

### **Layout Structure**
- **Responsive Grid**: SharedGrid component with 1x1 aspect ratio cards
- **Staging-First**: Workspace items displayed immediately via realtime subscriptions
- **Non-Blocking Actions**: Save/Discard actions don't block generation workflow
- **Mobile-First**: Touch-optimized controls and interactions
- **Progressive Disclosure**: Advanced controls hidden by default, accessible when needed

### **User Flow**
1. **Generate** → User submits generation via control box (image/video)
2. **Staging** → Worker uploads to `workspace-temp`, realtime display in grid
3. **Preview** → User previews items in SharedLightbox
4. **Iterate** → User can use items as reference for I2I modifications
5. **Save/Discard** → User selectively saves best results to Library

### **Key Interactions**
- **Touch-Optimized Cards**: Large touch targets (44px minimum)
- **Immediate Feedback**: Realtime updates show generation progress
- **Quick Actions**: Save/Discard actions accessible from card overlay
- **Reference Selection**: Drag-and-drop or "Use as Reference" button
- **Mode Toggle**: Clear visual indicators for MOD/COPY mode

## **🔌 3rd Party API Integration (Active)**

### **Model Providers**

| Modality | Primary (Cloud) | Fallback | Local (when available) | Edge Function |
|----------|-----------------|----------|------------------------|---------------|
| **Images** | Replicate (RV5.1, Seedream), fal.ai (Seedream) | Seedream v4.5 Edit, RV5.1 | SDXL Lustify | `replicate-image`, `fal-image` |
| **Video** | fal.ai (WAN 2.1 I2V) | - | WAN 2.1 | `fal-image` |

### **Routing Strategy**

- **Default to cloud models** for reliability
- Local models only used when:
  1. Admin enables health check toggle
  2. Health check confirms worker availability
  3. User explicitly selects local model
- Automatic fallback to cloud on local failure
- Models dynamically loaded from `api_models` table with `is_active = true` filter

### **Model Selection UI**

The workspace system provides dynamic model selection through the following components:

**Hooks:**
- **`useImageModels`**: Loads image/video models from `api_models` table where `modality IN ('image', 'video')` and `is_active = true`. Supports both Replicate and fal.ai models. Filters by `supports_i2i` capability when reference image is set. Exposes `sdxlWorkerHealthy` status for local model availability. Always returns a non-local default model for reliability.

**Model Availability:**
- Models are only displayed in UI dropdowns when `is_active = true` in `api_models` table
- Local SDXL is conditionally available based on health check status
- API models are always available when `is_active = true`
- Default model selection prioritizes non-local models for reliability
- When reference image is set, models filtered by `supports_i2i = true` capability

**I2I-Capable Model Filtering:**
- When reference image is set, model dropdown automatically filters to show only I2I-capable models
- Filtering based on `api_models.capabilities->>'supports_i2i' = 'true'` - NO hard-coded model name checks
- Models with `supports_i2i = true` capability dynamically loaded from `api_models` table
- Local SDXL (always available when healthy) - has `supports_i2i = true` capability

**Health Check Integration:**
- Local SDXL checks health status via `system_config.workerHealthCache.sdxlWorker`
- Unhealthy local models are marked unavailable but still shown in UI with status indicator
- Automatic fallback to API models when local models are unhealthy
- Health status checked via `useLocalModelHealth` hook polling `system_config.workerHealthCache`

### **Database Configuration**

**Required Tables:**
- `api_models` - Stores API model configurations (modality: 'image' | 'video')
- `api_providers` - Stores provider information (replicate, fal)
- `system_config` - Stores worker health cache in `config.workerHealthCache`

**API Models Table Structure:**
- `api_models.model_key`: Unique identifier matching provider's model (e.g., `fal-ai/bytedance/seedream/v4/text-to-image`)
- `api_models.provider_id`: Links to `api_providers` table for provider configuration
- `api_models.modality`: Determines which edge function to use (`image`, `video`)
- `api_models.is_active`: Controls dropdown availability in UI
- `api_models.is_default`: Boolean flag for default model selection (must be configured in database, NOT hard-coded)
- `api_models.priority`: Integer for sorting order in UI dropdowns
- `api_models.capabilities`: JSONB field with model capabilities (speed, cost, quality, NSFW support, `supports_i2i`, `reference_images`)
- **CRITICAL**: All model selection logic must use `api_models` table - NO hard-coded model names, IDs, or display name checks

**Edge Function Routing:**
- Image models → `replicate-image` or `fal-image` edge function → Provider API
- Video models → `fal-image` edge function → fal.ai API
- Local SDXL → `queue-job` edge function → Local worker

## **🎛️ Model Control Applicability**

### **Prompt Enhancement Controls (Apply to All Models)**

These controls are added to prompts via the enhancement process and apply to ALL models (Seedream, Replicate, Local SDXL):

- **Shot Type** (`wide`, `medium`, `close`): Added to prompt via enhancement, applies to all models
- **Camera Angle** (`eye_level`, `low_angle`, `overhead`, etc.): Added to prompt via enhancement, applies to all models
- **Style** (free-form text): Added to prompt via enhancement, applies to all models
- **Instruct Enhancement**: Uses **LOCAL Qwen instruct model** via chat worker to enhance prompts before generation - applies to all models

**Important**: Qwen instruct is a **LOCAL model** (like SDXL and WAN workers) and may not always be available. When local Qwen is unavailable, enhancement fails unless an optional OpenRouter fallback is implemented.

**Enhancement Process:**
1. User prompt + shot type + camera angle + style → Enhancement service
2. Enhancement service uses **local Qwen instruct model** (via chat worker) to enhance prompt
   - **Primary**: Local Qwen instruct (if available)
   - **Fallback** (optional): OpenRouter model (if local unavailable and user triggers enhancement)
3. Enhanced prompt sent to selected model (Seedream, Replicate, or Local SDXL)
4. All models receive the enhanced prompt with style controls included

**Enhancement Templates:**
- Each model requires its own enhancement template in `prompt_templates` table
- Template's `target_model` must match `api_models.model_key` **exactly** (model-specific, not provider-based)
- Token limits vary by model: Seedream (250 tokens), SDXL (75 tokens), WAN (150 tokens)
- Templates are model-specific because each model has different capabilities and token limits

### **Model-Specific Parameters (Vary by Model)**

These controls are model-specific and may not apply to all models:

- **Steps** (`num_inference_steps`): Model-specific parameter, mapped via `api_models.capabilities.input_key_mappings`
- **Guidance Scale** (`guidance_scale`): Model-specific parameter, mapped via `api_models.capabilities.input_key_mappings`
  - WAN 2.1 I2V uses `guide_scale` (range 1-10) instead of `guidance_scale` (range 1-20)
- **Negative Prompt**: Model-specific support, checked via `api_models.capabilities` field
- **Seed**: Model-specific support, checked via `api_models.capabilities.seed_control` field

**Settings Modal Applicability:**
- Advanced settings (steps, guidance scale, negative prompt, seed) are model-specific
- Edge functions (`fal-image`, `replicate-image`) map UI controls to model-specific parameter names via `api_models.capabilities.input_key_mappings`
- If model doesn't support a parameter, it's silently ignored (no error)

### **I2I-Specific Controls**

- **Reference Strength**: Model-specific parameter, mapped via `api_models.capabilities.input_key_mappings.i2i_strength_key`
  - Seedream edit models use `image_urls` (array) instead of `image_url` (string)
  - WAN 2.1 I2V uses `image_url` (required) and doesn't use `strength` parameter
- **Reference Type** (`style`, `character`, `composition`): Added to prompt via enhancement, applies to all I2I models

## **🔧 Technical Requirements**

### **Performance Requirements**
- **Page Load**: <3 seconds on mobile devices
- **Image Generation**: <60 seconds for high-quality images
- **Realtime Updates**: <1 second latency for workspace updates
- **Memory Usage**: <100MB on mobile devices

### **Integration Requirements**
- **Database**: Leverage existing `workspace_assets`, `user_library`, `jobs` tables
- **Edge Functions**: Use existing `queue-job`, `job-callback`, `replicate-image`, `fal-image`
- **Storage**: Use existing `workspace-temp` (staging) and `user-library` (permanent) buckets
- **Workers**: SDXL Worker (local), API integrations (Replicate, fal.ai)
- **API Models Table**: Dynamic model configuration via `api_models` table with `is_active` flag controlling UI availability

### **Storage & URL Conventions**

**Staging (Workspace):**
- Bucket: `workspace-temp`
- Key: `userId/jobId/{index}.{ext}` (e.g., `8d1f.../b4a2.../0.png`)
- Access: time-bounded signed URL (15–60 min TTL), client caches blob URL

**Library (Saved):**
- Bucket: `user-library`
- Key: `userId/{assetId}.{ext}`
- Access: time-bounded signed URL with Cache-Control headers
- Thumbnails: pre-generated `*.jpg` thumbnails for grid speed

### **Workspace Workflow**

1. User submits generation via control box (image/video). Batch size and quality per selection.
2. Worker uploads outputs to `workspace-temp` under `userId/jobId/index.ext`.
3. `job-callback` creates rows in workspace table for realtime display.
4. Workspace subscribes, signs URLs, renders items with thumbnails, and enables actions.
5. User can Save to Library (copy to `user-library`) or Discard (delete staging + row).

## **🎯 IMAGE-TO-IMAGE (I2I) & EXACT COPY**

### **Overview**
- **Primary Use Case**: Modify existing images while preserving subject/pose/composition
- **Secondary Use Case**: Exact copying (manual selection only)
- **Default Behavior**: Always "modify" mode - user must explicitly choose "copy" mode
- **Focus**: Position/pose preservation for modifications, not exact copying

### **Core Use Cases**

#### **Primary Use Case: Subject Modification**
**Scenario**: User generates "woman in black dress" → wants to modify specific elements
1. **"Change black dress to red"** → Same woman, same pose, red dress
2. **"Woman kissing her friend"** → Same woman, same pose, kissing scenario

#### **Secondary Use Case: Exact Copying**
**Scenario**: User wants identical copy (manual selection required)
- Workspace items: Preserve original prompt/seed for consistency
- Uploaded images: High-fidelity composition preservation

### **Default Behavior & User Workflow**

#### **Workspace/Library Items**
1. **Select as Reference** → Auto-enable "modify" mode
2. **Reference Strength**: 0.5 (preserve subject, allow changes)
3. **Enhancement**: Enabled (normal generation flow)
4. **User Types Modification** → System preserves subject/pose, applies changes

#### **Uploaded Images**
1. **Upload Image** → Auto-enable "modify" mode (NOT copy mode)
2. **Reference Strength**: 0.5 (preserve composition, allow changes)
3. **Enhancement**: Enabled (normal generation flow)
4. **User Types Modification** → System preserves composition, applies changes

#### **Manual Copy Mode**
1. **User Must Explicitly Toggle** to "copy" mode
2. **Reference Strength**: 0.95 (maximum preservation)
3. **Enhancement**: Disabled (skip enhancement)
4. **SDXL Parameters**: denoise_strength: 0.05, guidance_scale: 1.0

### **Technical Implementation**

#### **Mode Switching Defaults**
```typescript
// Modify Mode (Default) - Uses SDXL worker defaults
const modifyDefaults = {
  referenceStrength: 0.5,        // Worker converts to denoise_strength = 0.5
  enhancementEnabled: true,
  styleControlsEnabled: true,
  guidanceScale: 7.5,            // Worker default for high quality
  steps: 25                      // Worker default for high quality
};

// Copy Mode (Manual Selection Only) - Uses SDXL worker exact copy mode
const copyDefaults = {
  referenceStrength: 0.95,       // Worker clamps denoise_strength to ≤0.05
  enhancementEnabled: false,
  styleControlsEnabled: false,
  guidanceScale: 1.0,            // Worker exact copy mode
  steps: 15                      // Worker exact copy mode
};
```

#### **Edge Function Behavior**
```typescript
// queue-job edge function
if (exactCopyMode) {
  // Set exact_copy_mode flag - worker handles optimization
  exact_copy_mode: true,
  skip_enhancement: true,
  // Worker will clamp denoise_strength to ≤0.05, set CFG=1.0
} else {
  // Normal modify mode - use worker defaults
  exact_copy_mode: false,
  skip_enhancement: false,
  // Worker uses denoise_strength = 0.5 (default), CFG=7.5
}
```

## **📊 Success Criteria & Metrics**

### **User Experience Metrics**
- **Flow Completion**: 95%+ success rate from generation to save
- **Generation Time**: <60 seconds for high-quality images
- **Save Rate**: 70%+ of generated items saved to Library
- **Session Duration**: 15+ minutes average session length

### **Technical Performance Metrics**
- **Page Load Time**: <3 seconds on mobile devices
- **Realtime Update Latency**: <1 second for workspace updates
- **Memory Usage**: <100MB on mobile devices
- **Error Recovery**: <5% error rate with proper recovery

### **Business Metrics**
- **User Retention**: 70%+ day 7 retention
- **Feature Adoption**: 80%+ workspace usage rate
- **User Satisfaction**: 4.5+ star rating
- **Revenue Impact**: Premium feature adoption tracking

## **🚨 Error Scenarios & Handling**

### **Common Failure Modes**
- **Network Failures**: Offline mode with message queuing
- **API Errors**: Fallback to alternative models and services
- **Generation Failures**: Graceful degradation with error messages
- **Storage Issues**: Automatic retry with exponential backoff

### **Error Handling Strategy**
- **Error Boundaries**: React error boundaries for component recovery
- **User Feedback**: Clear error messages with recovery options
- **Automatic Retry**: Intelligent retry logic for transient failures
- **Graceful Degradation**: Fallback modes for partial failures

## **🔗 Dependencies & Constraints**

### **Technical Dependencies**
- **SDXL Worker**: Image generation and consistency management
- **Supabase**: Database, authentication, and real-time features
- **API Integrations**: Replicate, fal.ai for cloud generation
- **Storage**: Supabase Storage for workspace and library buckets

### **Business Dependencies**
- **User Permissions**: Role-based access for admin features
- **Content Moderation**: Generated content filtering
- **Privacy Controls**: User data protection and storage management
- **Legal Compliance**: Content guidelines and user agreements

## **📈 Future Enhancements (Phase 2+)**

### **Advanced Features**
- **Multi-modal Interactions**: Generate images/videos from text prompts
- **Advanced Analytics**: Detailed usage analytics and insights
- **Collaborative Features**: Share workspace items with other users
- **AI-Assisted Selection**: AI recommendations for best results

### **Premium Features**
- **High Consistency**: IP-Adapter for 90%+ consistency
- **Advanced Batch Operations**: Generate multiple variations with different parameters
- **Custom Models**: User-specific model training
- **Priority Generation**: Faster generation for premium users

## **📝 Implementation Guidelines**

### **Critical Technical Decisions**
1. **I2I Method**: Hybrid approach using reference strength (0.5 for modify, 0.95 for copy)
2. **Staging Architecture**: Workspace-first with selective saving to Library
3. **Mobile Priority**: Design mobile-first with progressive desktop enhancement
4. **Performance Focus**: Optimize for speed and reliability over advanced features
5. **UI/UX Philosophy**: Immediate feedback, optional complexity, no blocking modals

### **UI/UX Principles**
- **Immediate Feedback**: Realtime updates show generation progress
- **Optional Complexity**: Advanced features accessible but not required
- **Mobile-First**: Touch-optimized, no modal stacking
- **Progressive Disclosure**: Simple by default, advanced when needed

### **Development Guidelines**
- **Component Reusability**: Design components for reuse across pages
- **State Management**: Use consistent patterns with React hooks
- **Testing Strategy**: Comprehensive testing at each development phase
- **Documentation**: Maintain up-to-date documentation throughout development

### **Quality Assurance**
- **Mobile Testing**: Extensive testing on various mobile devices
- **Performance Monitoring**: Continuous monitoring of load times and memory usage
- **User Testing**: Regular user testing and feedback collection
- **Error Tracking**: Comprehensive error tracking and resolution

---

## **📋 Known Issues & Resolutions**

### **RV5.1 Prompt Fix (January 2025)**

**Issue Resolved:**
**Problem**: RV5.1 model was generating random images instead of following user prompts due to prompt overwriting in the edge function.

**Root Cause**: JavaScript spread operator order bug in `replicate-image` edge function:
```typescript
// BEFORE (broken)
const modelInput = {
  prompt: body.prompt,  // ✅ User's prompt
  ...apiModel.input_defaults  // ❌ Overwrites with "prompt": ""
};
```

**Solution Applied**:
```typescript
// AFTER (fixed)
const modelInput = {
  num_outputs: 1,
  ...apiModel.input_defaults,
  prompt: body.prompt // ✅ User's prompt comes LAST (preserved)
};
```

**Database Fix:**
- **Migration**: `20250110000004_fix_rv51_prompt_defaults.sql`
- **Action**: Removed empty `prompt` field from `input_defaults` to prevent future overwrites
- **Impact**: RV5.1 now correctly uses user prompts instead of generating random images

**Files Modified:**
1. ✅ **`supabase/functions/replicate-image/index.ts`** - Fixed prompt overwriting
2. ✅ **`supabase/migrations/20250110000004_fix_rv51_prompt_defaults.sql`** - Database cleanup
3. ✅ **Documentation updated** - This section added

**Expected Results:**
- ✅ **RV5.1 generation works** (scheduler fix already applied)
- ✅ **User prompts preserved** (prompt overwriting fix)
- ✅ **Generated images match user prompts** (instead of random images)
- ✅ **Success rate: 95%+** (up from 0% due to empty prompts)

---

**Status**: PRD updated January 2026. 95% complete, production ready. This document serves as the strategic foundation for all workspace development decisions and success metrics.

**Document Purpose**: This is the definitive Product Requirements Document (PRD) that defines the business goals, user requirements, and success criteria for the workspace feature. It serves as the strategic foundation for all development decisions.
