# Image-to-Image (I2I) System

**Last Updated:** February 21, 2026
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

### MobileQuickBar (Primary)

**File:** `src/components/workspace/MobileQuickBar.tsx`

- Dual reference slots (ref1/ref2) with drag-and-drop
- Mode switching (MODIFY ↔ COPY)
- Reference strength slider
- Video reference support

**Note:** `SimplePromptInput.tsx` was deleted in Feb 2026 cleanup. MobileQuickBar is now the primary reference UI.

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

## Scene Generation I2I (Feb 2026)

### Figure Notation

The `roleplay-chat` edge function uses "Figure notation" for multi-reference I2I:

| Figure | Purpose | Source |
|--------|---------|--------|
| Figure 1 | Scene environment/setting | Template preview or previous scene |
| Figure 2 | AI character reference | Character portrait |
| Figure 3 | User character reference | User persona avatar (for `both_characters` style) |

### Fallback Logic

When no scene environment is available (no template preview, no previous scene):

```typescript
// Skip Figure 1 when no scene environment to avoid duplicate character refs
if (!templatePreviewImageUrl && !previousSceneImageUrl) {
  effectiveReferenceImageUrl = undefined;
  console.log('🎬 No scene environment - skipping Figure 1');
}
```

**Rationale:** If Figure 1 is the character portrait and Figure 2 is also the character portrait, the model receives duplicate identical images, causing poor composition and wasted reference slots.

### De-duplication

Before sending `image_urls` array to fal.ai, the system de-duplicates by storage path:

```typescript
const seenPaths = new Map<string, number>();
for (let i = 0; i < imageUrlsArray.length; i++) {
  const pathMatch = imageUrlsArray[i].match(
    /\/storage\/v1\/object\/(?:sign|public)\/(.+?)(?:\?|$)/
  );
  const key = pathMatch ? pathMatch[1] : imageUrlsArray[i];
  if (seenPaths.has(key)) {
    imageUrlsArray.splice(i, 1);  // Remove duplicate
    i--;
  } else {
    seenPaths.set(key, i);
  }
}
```

**Handles cases where:**
- Previous scene is the same as character portrait
- User character reference equals AI character reference
- Template preview is the character's avatar

### URL Re-signing

Reference images in long conversations may have expired signed URLs. The `ensureFreshSignedUrl()` function:

1. Checks JWT expiration with 5-minute buffer
2. Re-signs expired URLs with 1-hour TTL
3. Extracts bucket/path from URL structure
4. Falls back to original URL on error

**Location:** `supabase/functions/roleplay-chat/index.ts` lines 120-171

---

## Dual Reference Slot System (Feb 2026)

### Overview

The workspace now supports two reference image slots (ref1/ref2) for multi-reference I2I workflows, particularly for models like Flux-2 Flash Edit that accept `image_urls` arrays.

### MobileQuickBar Implementation

**File:** `src/components/workspace/MobileQuickBar.tsx`

```typescript
// Dual slot state management
const [ref1, setRef1] = useState<ReferenceImage | null>(null);
const [ref2, setRef2] = useState<ReferenceImage | null>(null);

// Drag-and-drop reordering
const handleDragEnd = (result: DropResult) => {
  if (result.source.index === 0 && result.destination?.index === 1) {
    // Swap ref1 ↔ ref2
    setRef1(ref2);
    setRef2(ref1);
  }
};
```

### Auto-Fill Behavior

When adding references:
1. First image → fills ref1
2. Second image → fills ref2
3. Additional images → replaces ref2 (ref1 preserved)

### Video Reference Support

Reference slots support both images and videos for I2V workflows:

```typescript
interface ReferenceImage {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;  // For video preview
}
```

### Multi-Reference Model Detection

Models requiring multiple references are detected via `i2i_multi` task:

```typescript
// Check if model supports multi-reference
const supportsMultiRef = model.tasks?.includes('i2i_multi');
if (supportsMultiRef && ref2) {
  payload.image_urls = [ref1.url, ref2.url];
} else {
  payload.image_url = ref1.url;
}
```

---

## Model-Driven Image Field Selection (Feb 2026)

### Overview

Rather than hardcoding image field names per model, the system now dynamically determines the correct field name by examining the model's `input_schema` from the `api_models` table.

### Detection Logic

**File:** `supabase/functions/character-portrait/index.ts`

```typescript
// Priority order for detecting image field name
function getImageFieldName(model: ApiModel): string {
  const schema = model.input_schema;

  // 1. Check for image_urls array (multi-reference models)
  if (schema?.properties?.image_urls) {
    return 'image_urls';
  }

  // 2. Check for singular image_url
  if (schema?.properties?.image_url) {
    return 'image_url';
  }

  // 3. Fallback to generic 'image'
  return 'image';
}
```

### Capability Flag Override

The `requires_image_urls_array` capability flag provides explicit override:

```typescript
// capabilities JSONB in api_models table
{
  "requires_image_urls_array": true  // Forces image_urls[] even if schema ambiguous
}

// Usage in edge function
if (model.capabilities?.requires_image_urls_array) {
  payload.image_urls = [signedUrl];
} else {
  payload[getImageFieldName(model)] = signedUrl;
}
```

### Models Using Array Format

| Model | Field | Reason |
|-------|-------|--------|
| Flux-2 Flash Edit | `image_urls[]` | Multi-reference editing |
| Seedream v4 Edit | `image_urls[]` | Dual image support |
| Seedream v4.5 Edit | `image_urls[]` | Dual image support |

---

## I2V Identity Handling (Feb 2026)

### Overview

Image-to-Video (I2V) generation has different identity handling than Image-to-Image (I2I). Character identity prompts are NOT injected for video generation to avoid conflicts with the video model's own understanding.

### Rationale

Video models (WAN 2.1 I2V) derive visual identity from the source image itself. Injecting character prompts like "woman with blonde hair" can:
1. Conflict with what the model sees in the image
2. Cause unwanted style shifts during video
3. Reduce motion quality

### Implementation

**File:** `supabase/functions/roleplay-chat/index.ts`

```typescript
// Check if generating video vs image
const isVideoGeneration = model.tasks?.includes('i2v') ||
                          model.modality === 'video';

// Build character description
let characterPrompt = '';
if (!isVideoGeneration) {
  // I2I: Include identity for style consistency
  characterPrompt = buildCharacterIdentity(character);
}

// For I2V, prompt focuses on action/motion only
const finalPrompt = isVideoGeneration
  ? actionDescription  // "walking through garden"
  : `${characterPrompt}, ${actionDescription}`;  // "blonde woman walking..."
```

### Task Detection

The `i2v` task in `api_models.tasks` array triggers video mode:

```sql
-- Models with I2V capability
SELECT model_key, tasks FROM api_models
WHERE 'i2v' = ANY(tasks);

-- Returns: fal-ai/wan/v2.1/i2v, etc.
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

- [MULTI_REF_SYSTEM_DESIGN_BRIEF.md](../09-REFERENCE/MULTI_REF_SYSTEM_DESIGN_BRIEF.md) - Multi-reference system design (Seedream 10 images, LTX temporal anchoring)
- [REPLICATE_API.md](../05-APIS/REPLICATE_API.md) - Replicate integration details
- [FAL_AI.md](../05-APIS/FAL_AI.md) - fal.ai platform integration
- [PROMPTING_SYSTEM.md](./PROMPTING_SYSTEM.md) - Prompt templates
- [SDXL_WORKER.md](../04-WORKERS/SDXL_WORKER.md) - Local worker details
