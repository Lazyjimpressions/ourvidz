# Image-to-Image (I2I) System

**Last Updated:** January 3, 2026
**Status:** ✅ PRODUCTION - Local SDXL + Replicate API fallback

## Overview

The I2I system enables users to modify existing images while preserving subject/pose/composition. It supports both local SDXL worker and Replicate API models.

### Core Use Cases
1. **Subject Modification**: Change specific elements while preserving person/pose
2. **Composition Modification**: Modify backgrounds, lighting, etc.
3. **Exact Copying**: Create high-fidelity copies (manual selection required)
4. **Character Consistency**: Maintain character appearance across variations

---

## Provider Architecture

### Image Generation Providers

| Provider | Type | Use Case |
|----------|------|----------|
| Local SDXL (RunPod) | Primary | Fast, private, cost-effective |
| Replicate API | Fallback/Alternative | Cloud-based, multiple models |
| fal.ai Seedream v4.5 Edit | Primary I2I | High-quality image editing |

**Note:** OpenRouter is for chat/roleplay only - it does NOT support image generation.

### Provider Routing

```
User Request → Queue-Job Edge Function
                    ↓
    ┌───────────────┴───────────────┐
    ↓                               ↓
Local SDXL Worker              Replicate API
(via Redis queue)              (direct API call)
    ↓                               ↓
sdxl_queue → RunPod           replicate-image → Replicate
    ↓                               ↓
  Result                        Webhook → Result
```

---

## Current Implementation

### Local SDXL Worker

**Edge Function:** `supabase/functions/queue-job/index.ts`

```typescript
// Queue I2I job to local SDXL worker
const jobPayload = {
  job_type: 'sdxl_image_high',
  prompt: enhancedPrompt,
  reference_image_url: signedImageUrl,
  exact_copy_mode: false,  // true for COPY mode
  skip_enhancement: false,
  denoise_strength: 0.5,   // Default for MODIFY mode
  guidance_scale: 7.5,
  steps: 25
};
```

**Worker Processing:**
- Model: SDXL Lustify (NSFW-optimized)
- Enhancement: Qwen 2.5-7B Base for prompt enhancement
- Performance: 3-8 seconds per image

### Replicate API

**Edge Function:** `supabase/functions/replicate-image/index.ts`

```typescript
// I2I via Replicate
const replicatePayload = {
  prompt: body.prompt,
  apiModelId: selectedModel.id,
  metadata: {
    reference_image_url: referenceUrl,
    consistency_method: 'i2i_reference',
    reference_strength: 0.5,
    contentType: 'nsfw'
  },
  input: {
    image: referenceImageUrl,
    strength: 0.5,
    guidance_scale: 7.5
  }
};
```

---

## Mode Implementation

### Modify Mode (Default)

```typescript
const modifyDefaults = {
  referenceStrength: 0.5,        // Balanced modification
  enhancementEnabled: true,
  styleControlsEnabled: true,
  guidanceScale: 7.5,
  steps: 25
};
```

- User must provide a modification prompt
- Enhancement applies cinematic/quality terms
- Style controls (lighting, mood) active

### Copy Mode (Manual Toggle)

```typescript
const copyDefaults = {
  referenceStrength: 0.95,       // Minimal modification
  enhancementEnabled: false,
  styleControlsEnabled: false,
  guidanceScale: 1.0,            // Exact copy mode
  steps: 15
};
```

- User must explicitly toggle COPY mode
- No prompt enhancement applied
- Worker clamps denoise_strength to ≤0.05

---

## Frontend Components

### SimplePromptInput

**File:** `src/components/workspace/SimplePromptInput.tsx`

- Reference image upload and display
- Mode switching (MODIFY ↔ COPY)
- Reference strength slider
- Style control toggles

### Mode Toggle Behavior

```typescript
// Upload behavior
onUpload → setMode('modify')  // Always default to MODIFY
         → setReferenceStrength(0.5)

// Toggle behavior
MODIFY → COPY:
  → setReferenceStrength(0.95)
  → setEnhancementEnabled(false)

COPY → MODIFY:
  → setReferenceStrength(0.5)
  → setEnhancementEnabled(true)
```

---

## Parameter Flow

### Frontend → Edge Function

```typescript
// MODIFY mode
{
  exact_copy_mode: false,
  skip_enhancement: false,
  reference_strength: 0.5  // Worker converts to denoise_strength
}

// COPY mode
{
  exact_copy_mode: true,
  skip_enhancement: true,
  reference_strength: 0.95  // Worker clamps to ≤0.05 denoise
}
```

### Reference Strength Conversion

```typescript
// For MODIFY mode: invert for denoise
const denoiseStrength = 1 - referenceStrength;

// For COPY mode: clamp to minimal modification
const denoiseStrength = Math.min(1 - referenceStrength, 0.05);
```

---

## Fallback Strategy

### Priority Order

```typescript
const i2iFallbackOrder = [
  'local-sdxl',    // Primary: Local SDXL worker (fastest, private)
  'replicate',     // Secondary: Replicate API models
  'fal-ai'         // Future: fal.ai for SFW/editing
];
```

### Health Check Logic

```typescript
// Check local worker health before routing
const localHealth = await checkWorkerHealth('wanWorker');  // Shared GPU

if (localHealth.isHealthy) {
  return queueToLocalWorker(jobPayload);
} else {
  // Fallback to Replicate
  const model = await getDefaultReplicateModel();
  return callReplicateAPI(jobPayload, model);
}
```

---

## Negative Prompt Handling

### Generation Mode Detection

```typescript
// Automatic detection based on reference image
const hasReferenceImage = !!(body.reference_image_url || body.input?.image);
const generationMode = hasReferenceImage ? 'i2i' : 'txt2img';
```

### Database Query

```sql
-- I2I-specific negative prompts (minimal to avoid interference)
SELECT negative_prompt FROM negative_prompts
WHERE model_type = 'sdxl'
  AND content_mode = 'nsfw'
  AND generation_mode = 'i2i'  -- Separate from txt2img
  AND is_active = true
ORDER BY priority DESC;
```

### I2I Optimization

| Mode | Negative Prompt Terms |
|------|----------------------|
| txt2img | 7-12 terms (quality control) |
| i2i | 3 terms only (minimal interference) |

Rationale: Excessive negative prompts interfere with I2I modification fidelity.

---

## Error Handling

### Worker Failures

```typescript
if (workerError) {
  // Log and fallback
  console.error('❌ SDXL worker failed:', workerError);

  if (fallbackEnabled) {
    return await callReplicateAPI(payload);
  }

  throw new Error('I2I generation failed');
}
```

### API Failures

```typescript
if (replicateError) {
  // Cannot fallback further - return error
  return {
    error: 'Image generation failed',
    details: replicateError.message,
    fallback_attempted: true
  };
}
```

---

## Performance

### Generation Times

| Provider | Mode | Time |
|----------|------|------|
| Local SDXL | MODIFY | 3-8s |
| Local SDXL | COPY | 2-4s |
| Replicate | MODIFY | 5-15s |

### Quality Settings

| Quality | Steps | Guidance | Use Case |
|---------|-------|----------|----------|
| Fast | 15 | 7.0 | Quick previews |
| High | 25 | 7.5 | Final output |

---

## Future Enhancements

### Planned: fal.ai Integration

```typescript
// fal.ai for SFW/suggestive content and editing
const falConfig = {
  provider: 'fal',
  model: 'fal-ai/bytedance/seedream/v4/edit',
  capabilities: ['i2i', 'editing', 'enhancement'],
  nsfw_support: 'to_be_tested'  // Pending real-world testing
};
```

### Advanced Features

1. **Multi-Reference**: Support multiple reference images
2. **Style Transfer**: Apply artistic styles to references
3. **Batch I2I**: Process multiple images with same modification
4. **Character Consistency**: Advanced character preservation

---

## Related Documentation

- [REPLICATE_API.md](../05-APIS/REPLICATE_API.md) - Replicate integration details
- [FAL_AI.md](../05-APIS/FAL_AI.md) - fal.ai platform integration
- [PROMPTING_SYSTEM.md](./PROMPTING_SYSTEM.md) - Prompt templates
- [SDXL_WORKER.md](../04-WORKERS/SDXL_WORKER.md) - Local worker details
