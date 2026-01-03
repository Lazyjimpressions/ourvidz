# Replicate API Integration

**Last Updated:** January 3, 2026
**Status:** ✅ PRODUCTION - Database-driven model configuration with I2I and T2I support

## Overview

The Replicate API integration provides cloud-based image generation through any Replicate-hosted model. Models are configured via the `api_models` database table, enabling zero-code model additions through the admin dashboard.

### Key Capabilities
- **Database-Driven Models**: Add/configure models via admin UI without code changes
- **I2I + T2I Support**: Automatic detection and optimized handling
- **CLIP Token Validation**: Warns when prompts exceed 77-token limit
- **Dynamic Negative Prompts**: Content-mode and generation-mode aware
- **Webhook-Based Completion**: Async job handling via `replicate-webhook`

---

## Architecture

### Request Flow

```
Frontend → replicate-image Edge Function → Replicate API → replicate-webhook → workspace_assets
```

1. **Frontend** submits request with `apiModelId` or uses default
2. **Edge Function** resolves model config from `api_models` table
3. **Replicate API** runs prediction with webhook URL
4. **Webhook Handler** downloads result, uploads to storage, updates job

### Database Schema

#### api_providers Table
```sql
-- Replicate provider entry
INSERT INTO api_providers (
  name, display_name, base_url,
  auth_scheme, auth_header_name, secret_name, is_active
) VALUES (
  'replicate', 'Replicate', 'https://api.replicate.com/v1',
  'bearer', 'Authorization', 'REPLICATE_API_TOKEN', true
);
```

#### api_models Table
```sql
-- Example: RV5.1 model configuration
INSERT INTO api_models (
  provider_id, model_key, display_name, version,
  modality, task, model_family, is_active, is_default, priority,
  input_defaults, capabilities
) VALUES (
  (SELECT id FROM api_providers WHERE name = 'replicate'),
  'lucataco/realistic-vision-v5.1',
  'Realistic Vision 5.1',
  'a45f82a1382bed5c7aeb861dac7c7d191b0fdf74d8d57c4a0e6ed7d4d0bf7d24', -- Version hash
  'image', 'generation', 'rv51', true, true, 1,
  '{"width": 1024, "height": 1024, "num_inference_steps": 25, "guidance_scale": 7.5}',
  '{"allowed_input_keys": ["prompt", "negative_prompt", "width", "height", "num_inference_steps", "guidance_scale", "scheduler", "seed", "num_outputs"], "allowed_schedulers": ["K_EULER_ANCESTRAL", "DPMSolverMultistep", "DDIM"]}'
);
```

**Critical Fields:**
- `version`: Must be the Replicate version hash (32-64 hex chars), NOT the model slug
- `model_key`: Human-readable model identifier (e.g., `lucataco/realistic-vision-v5.1`)
- `capabilities.allowed_input_keys`: Whitelist to prevent 422 errors
- `input_defaults`: Default parameters applied to every request

---

## Edge Function: replicate-image

**File:** `supabase/functions/replicate-image/index.ts`

### Model Resolution

```typescript
// Priority order for model selection:
// 1. Explicit apiModelId provided in request
// 2. Default Replicate image model (is_default = true)
// 3. First active Replicate image model by priority

if (body.apiModelId) {
  // Use specific model by ID
  apiModel = await getModelById(body.apiModelId);
} else {
  // Get default Replicate image model
  apiModel = await getDefaultReplicateModel();
}
```

### CLIP Token Validation

```typescript
// CLIP hard limit: 77 tokens - everything after is truncated
const estimatedTokens = Math.ceil(promptLength / 4.2); // ~4.2 chars per token
const MAX_CLIP_TOKENS = 77;

if (estimatedTokens > MAX_CLIP_TOKENS) {
  console.warn(`⚠️ Prompt exceeds ${MAX_CLIP_TOKENS} token limit - will be truncated`);
}
```

### I2I Detection

```typescript
// Automatic I2I detection based on reference image presence
const hasReferenceImage = !!(
  body.input?.image ||
  body.metadata?.referenceImage ||
  body.metadata?.reference_image_url ||
  body.reference_image_url
);

// Generation mode determines negative prompt selection
const generationMode = hasReferenceImage ? 'i2i' : 'txt2img';
```

### Negative Prompt Composition

```sql
-- Database query for negative prompts
SELECT negative_prompt FROM negative_prompts
WHERE model_type = 'sdxl'  -- Normalized from model_family
  AND content_mode = 'nsfw'  -- From UI toggle
  AND generation_mode = 'txt2img'  -- Detected from request
  AND is_active = true
ORDER BY priority DESC;
```

Final negative prompt: `${baseNegativePrompt}, ${userProvidedNegative}`

### Safety Checker

```typescript
// NSFW content disables safety checker
if (contentMode === 'nsfw') {
  modelInput.disable_safety_checker = true;
}
```

---

## Edge Function: replicate-webhook

**File:** `supabase/functions/replicate-webhook/index.ts`

### Webhook Flow

1. Receive Replicate webhook POST with prediction result
2. Verify HMAC-SHA256 signature (if `REPLICATE_WEBHOOK_SECRET` configured)
3. Extract image URL from output (filters grid/composite images)
4. Download and upload to `workspace-temp` storage bucket
5. Create `workspace_assets` record
6. Update job status to `completed`

### Image Filtering

```typescript
// Skip composite/grid images from multi-output predictions
const isCompositeImage = (url: string) => {
  return url.includes('output.png') ||
         url.includes('grid') ||
         url.includes('combined');
};
```

---

## Frontend Integration

### Job Submission

```typescript
// Submit to replicate-image edge function
const response = await supabase.functions.invoke('replicate-image', {
  body: {
    prompt: enhancedPrompt,
    apiModelId: selectedModel.id,  // UUID from api_models
    job_type: 'sdxl_image_high',   // For job tracking
    quality: 'high',               // 'high' or 'fast'
    metadata: {
      contentType: 'nsfw',         // Content mode toggle
      original_prompt: userPrompt,
      // I2I fields if applicable:
      reference_image_url: referenceUrl,
      consistency_method: 'i2i_reference',
      reference_strength: 0.5
    },
    input: {
      // Model-specific overrides
      steps: 25,
      guidance_scale: 7.5,
      scheduler: 'K_EULER_ANCESTRAL'
    }
  }
});
```

### Model Selection (Admin Dashboard)

Models are managed via `ApiModelsTab.tsx`:
- **Modality**: `image` for image generation
- **Task**: `generation` for T2I/I2I
- **Provider**: Must be `replicate`
- **Version**: Replicate version hash (required)

---

## Model Configuration

### Required Capabilities JSONB

```json
{
  "allowed_input_keys": [
    "prompt", "negative_prompt", "width", "height",
    "num_inference_steps", "guidance_scale", "scheduler",
    "seed", "num_outputs", "image", "strength"
  ],
  "allowed_schedulers": [
    "K_EULER_ANCESTRAL", "DPMSolverMultistep", "DDIM",
    "K_EULER", "HeunDiscrete", "KarrasDPM", "PNDM"
  ],
  "scheduler_aliases": {
    "EulerA": "K_EULER_ANCESTRAL",
    "MultistepDPM": "DPMSolverMultistep"
  },
  "input_key_mappings": {
    "steps": "num_inference_steps",
    "i2i_image_key": "image",
    "i2i_strength_key": "strength"
  }
}
```

### Input Defaults JSONB

```json
{
  "width": 1024,
  "height": 1024,
  "num_inference_steps": 25,
  "guidance_scale": 7.5,
  "scheduler": "K_EULER_ANCESTRAL"
}
```

---

## Pricing

| Model | Approximate Cost |
|-------|-----------------|
| RV5.1 | ~$0.05/image |
| SDXL | ~$0.04/image |
| FLUX | ~$0.025/image |

Actual costs vary by resolution and inference steps. Track via `usage_logs` table.

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Model version required` | Missing `version` in api_models | Add Replicate version hash |
| `Invalid version format` | Version is slug, not hash | Use 32-64 char hex hash |
| `No Replicate models configured` | No active models in api_models | Add model via admin |
| `422 Unprocessable Entity` | Unsupported input parameter | Update `allowed_input_keys` |

### Fallback Strategy

```typescript
// If specific apiModelId not found, try:
// 1. Default Replicate image model (is_default = true)
// 2. First active Replicate image model by priority
// 3. Return 500 error if no models configured
```

---

## Environment Secrets

| Secret | Description |
|--------|-------------|
| `REPLICATE_API_TOKEN` | Replicate API authentication |
| `REPLICATE_WEBHOOK_SECRET` | Webhook signature verification (optional) |

Secrets are referenced via `api_providers.secret_name` field.

---

## Testing

### Verify Model Configuration

```sql
-- Check active Replicate image models
SELECT display_name, model_key, version, is_default, priority
FROM api_models
WHERE modality = 'image'
  AND is_active = true
  AND provider_id = (SELECT id FROM api_providers WHERE name = 'replicate')
ORDER BY priority ASC;
```

### Monitor Job Status

```sql
-- Check recent Replicate jobs
SELECT id, job_type, status, model_type, created_at
FROM jobs
WHERE metadata->>'provider_name' = 'replicate'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Related Documentation

- [REPLICATE_IMAGE_EDGE_FUNCTION.md](../04-WORKERS/REPLICATE_IMAGE_EDGE_FUNCTION.md) - Detailed edge function docs
- [I2I_SYSTEM.md](../03-SYSTEMS/I2I_SYSTEM.md) - Image-to-image workflow
- Admin Dashboard: API Providers Tab, API Models Tab
