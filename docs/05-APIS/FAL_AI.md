# fal.ai API Integration

**Last Updated:** January 3, 2026
**Status:** ✅ IMPLEMENTED - Edge function created, NSFW capabilities pending testing

## Overview

fal.ai is a model hosting and routing platform (not a single model provider) that offers 600+ production-ready AI models with unified API access. It provides fast inference, autoscaling, and pay-per-use pricing.

### Platform vs Model Distinction

**fal.ai Platform:**
- Does NOT globally ban NSFW at platform level
- Allows users to choose models
- Supports LoRAs and fine-tuning
- Does not auto-moderate all outputs

**Individual Models:**
- Each model has its own training data and safety filters
- NSFW success depends on model choice, not fal.ai itself
- Some models (Flux, Bria) have internal moderation
- Others (WAN, community SD) are more permissive

---

## Terms of Service Summary

fal.ai's ToS does NOT contain a blanket ban on NSFW or adult content.

### Prohibited Content

- Illegal content
- Non-consensual sexual content
- Sexual content involving minors
- Exploitation, abuse, or human trafficking
- Content violating intellectual property or privacy
- Circumventing safeguards or abusing platform limits

### Allowed (Model-Dependent)

- Consensual adult sexual content (at platform level)
- Model-specific behavior varies

This is different from OpenAI, Google, and Stability-hosted official APIs which prohibit NSFW.

---

## Model NSFW Viability Matrix

### Image Models

| Model | NSFW Viability | Notes |
|-------|----------------|-------|
| WAN (image/i2v) | ✅ Good | Best for explicit on fal |
| Z-Image Turbo | ⚠️ Mixed | Inconsistent results |
| Seedream v4/v4.5 | ⚠️ Suggestive only | Internal moderation |
| Flux/Kontext/Bria | ❌ No | Enterprise-safe, restrictive |
| Recraft | ❌ No | Commercial focus |
| Community SDXL ports | ⚠️ Inconsistent | Depends on specific model |

### Video Models

| Model | NSFW Viability | Notes |
|-------|----------------|-------|
| WAN I2V | ⚠️ Mild/implied | Not explicit |
| Kling/Veo/Sora | ❌ No | Very restrictive |
| PixVerse/Lucy | ❌ No | Commercial restrictions |
| AnimateDiff (API) | ⚠️ Very limited | |

**Important:** fal.ai video models are NOT suitable for explicit adult video. Use local WAN 2.1/2.6 for that purpose.

---

## Recommended Models for OurVidz

### NSFW Testing Required

The following recommendations are based on initial research. Real-world testing is required to confirm NSFW capabilities.

| Use Case | Model | Status |
|----------|-------|--------|
| Images (SFW) | Seedream v4 | ✅ Confirmed |
| Images (Suggestive) | Seedream v4 | ⚠️ To be tested |
| Images (NSFW) | WAN via fal | ⚠️ To be tested |
| Editing/Enhancement | Seedream v4.5 Edit | ✅ Confirmed |
| Video (SFW) | WAN I2V | ⚠️ Limited |

### Testing Protocol

```markdown
## NSFW Test Checklist

- [ ] Seedream v4 with safety_checker: false
- [ ] WAN image model with explicit prompts
- [ ] WAN I2V with suggestive content
- [ ] Document success/failure rates
- [ ] Note any account warnings/restrictions
```

---

## API Configuration

### Environment Setup

```bash
# Set fal.ai API key
export FAL_KEY=your_fal_api_key
```

### SDK Installation

```bash
# JavaScript/TypeScript
npm install @fal-ai/client

# Python
pip install fal-client
```

### Basic Request (JavaScript)

```typescript
import * as fal from "@fal-ai/serverless-client";

fal.config({
  credentials: process.env.FAL_KEY
});

const result = await fal.subscribe("fal-ai/bytedance/seedream/v4/text-to-image", {
  input: {
    prompt: "A professional portrait photo",
    image_size: { width: 1024, height: 1024 },
    num_inference_steps: 30,
    guidance_scale: 7.5,
    safety_checker: false  // Disable for NSFW testing
  }
});
```

### Basic Request (Python)

```python
import fal_client

result = fal_client.subscribe(
    "fal-ai/bytedance/seedream/v4/text-to-image",
    arguments={
        "prompt": "A professional portrait photo",
        "image_size": {"width": 1024, "height": 1024},
        "num_inference_steps": 30,
        "guidance_scale": 7.5,
        "safety_checker": False
    }
)
```

---

## Model Endpoints

### Seedream v4 Text-to-Image

**Endpoint:** `fal-ai/bytedance/seedream/v4/text-to-image`

```typescript
const input = {
  prompt: string,                    // Required
  negative_prompt?: string,
  image_size: { width: number, height: number },  // 1024-4096
  num_inference_steps?: number,      // Default: 30
  guidance_scale?: number,           // Default: 7.5
  num_images?: number,               // Default: 1
  safety_checker?: boolean,          // Default: true - set false for NSFW
  seed?: number
};
```

### Seedream v4 Edit (I2I)

**Endpoint:** `fal-ai/bytedance/seedream/v4/edit`

```typescript
const input = {
  prompt: string,                    // Required
  image_url: string,                 // Reference image
  negative_prompt?: string,
  image_size: { width: number, height: number },
  num_inference_steps?: number,
  guidance_scale?: number,
  strength?: number,                 // 0.0-1.0, denoise strength
  safety_checker?: boolean
};
```

### Seedream v4.5 Edit

**Endpoint:** `fal-ai/bytedance/seedream/v4.5/edit`

- Unified generation and editing architecture
- Photorealistic output in 2-3 seconds
- Up to 10 image inputs supported

### WAN Image

**Endpoint:** `fal-ai/wan/v2.1/image`

- More permissive content policy
- Best option for NSFW testing on fal

---

## Database Configuration

### api_providers Entry

**Status:** ✅ Configured

```sql
-- Provider ID: 4ddf0d58-c5e6-436a-b1bd-d44a2c20d6e3
INSERT INTO api_providers (
  name, display_name, base_url,
  auth_scheme, auth_header_name, secret_name, is_active
) VALUES (
  'fal', 'fal.ai', 'https://queue.fal.run',
  'api_key_header', 'Authorization', 'FAL_KEY', true
);
```

### api_models Entries

**Status:** ✅ Configured (4 models)

| Model | model_key | Modality | char_limit |
|-------|-----------|----------|------------|
| Seedream v4 | `fal-ai/bytedance/seedream/v4/text-to-image` | image | 10,000 |
| Seedream v4 Edit | `fal-ai/bytedance/seedream/v4/edit` | image | 10,000 |
| Seedream v4.5 Edit | `fal-ai/bytedance/seedream/v4.5/edit` | image | 10,000 |
| WAN 2.1 I2V | `fal-ai/wan/v2.1/image-to-video` | video | 1,500 |

**Query configured models:**
```sql
SELECT model_key, display_name, modality,
       capabilities->>'char_limit' as char_limit,
       capabilities->>'nsfw_status' as nsfw_status
FROM api_models
WHERE model_key LIKE 'fal-ai/%'
ORDER BY modality, model_key;
```

---

## Pricing

| Model | Unit | Cost | Output per $1 |
|-------|------|------|---------------|
| Seedream v4 | image | $0.03 | 33 images |
| Flux Kontext Pro | image | $0.04 | 25 images |
| FLUX.dev | image | $0.025 | 40 images |

### Comparison with Other Providers

| Provider | Model | Cost/Image |
|----------|-------|-----------|
| fal.ai | Seedream v4 | $0.03 |
| fal.ai | FLUX.dev | $0.025 |
| Replicate | RV5.1 | ~$0.05 |
| Replicate | SDXL | ~$0.04 |

fal.ai is cost-competitive, especially for Seedream models.

---

## Prompting Best Practices

### Seedream Prompt Structure

```
[Subject] in [Setting], [Style], [Technical Quality]
```

Example:
```
A woman in elegant evening dress, standing in art gallery,
cinematic lighting, professional photography, 8k resolution
```

### Character Limits (NOT Token Limits)

**IMPORTANT:** fal.ai uses CHARACTER limits, NOT tokenizer-enforced caps like CLIP (77 tokens).

| Model | Character Limit | Notes |
|-------|-----------------|-------|
| Seedream v4/v4.5 | 8,000-12,000 chars | Best for RP scene extraction |
| Z-Image Turbo | 4,000-6,000 chars | Not currently configured |
| FLUX/Kontext | 2,000-4,000 chars | Not currently configured |
| Wan Image | 6,000-8,000 chars | Permissive for NSFW |
| WAN I2V (Video) | 1,000-2,000 chars max | Video prompts are shorter |

This is fundamentally different from Replicate/local SDXL which uses CLIP tokenization (77 token hard limit ≈ 320 chars).

**Best Practices:**
- Front-load important terms (quality matters more at start)
- Seedream handles detailed prompts well (8K+ chars)
- Video models need concise prompts (under 2K chars)

### Resolution Constraints

- Minimum: 1024x1024
- Maximum: 4096x4096
- Both dimensions must be divisible by 8

---

## Integration Architecture

### Edge Function

**File:** `supabase/functions/fal-image/index.ts`

The fal-image edge function handles both image and video generation via fal.ai.

**Key Features:**
- Database-driven model configuration via `api_models` table
- Automatic provider validation (must be 'fal')
- Character limit validation per model type
- I2I support with reference image URL signing
- NSFW support via `enable_safety_checker: false`
- Job tracking with status updates
- Automatic workspace_assets creation on completion

**Request Format:**

```typescript
// POST /functions/v1/fal-image
{
  prompt: string,
  apiModelId?: string,           // UUID from api_models table
  job_type?: string,             // 'fal_image' or 'fal_video'
  quality?: string,              // 'high' or 'fast'
  metadata?: {
    contentType?: 'sfw' | 'nsfw',
    aspectRatio?: '1:1' | '16:9' | '9:16',
    referenceImage?: string      // For I2I
  },
  input?: {
    image_size?: { width: number, height: number },
    num_inference_steps?: number,
    guidance_scale?: number,
    negative_prompt?: string,
    seed?: number,
    strength?: number,           // For I2I
    // Video-specific:
    num_frames?: number,
    resolution?: string,
    fps?: number
  }
}
```

**Response Format:**

```typescript
// Immediate result (fast models)
{
  jobId: string,
  status: 'completed',
  resultUrl: string,
  resultType: 'image' | 'video'
}

// Queued result (async models)
{
  jobId: string,
  requestId: string,  // fal.ai request_id for polling
  status: 'queued',
  message: 'Request queued with fal.ai'
}
```

### API Call Pattern

Uses REST API directly (not SDK) for Deno compatibility:

```typescript
// Synchronous endpoint - returns results directly
const response = await fetch(`https://fal.run/${model.model_key}`, {
  method: 'POST',
  headers: {
    'Authorization': `Key ${falApiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(modelInput)
});

// Note: queue.fal.run is for async/polling, fal.run is for sync
```

### Webhook Support (Future)

fal.ai supports webhooks for long-running predictions. Not currently implemented - uses polling via `fal.subscribe()` pattern instead.

---

## Use Case Recommendations

### Current Recommendations (Pending Testing)

| Use Case | Provider | Model |
|----------|----------|-------|
| SFW Images | fal.ai | Seedream v4 |
| Suggestive Content | fal.ai | Seedream v4 (test) |
| Explicit NSFW | Local WAN | Preferred |
| Explicit NSFW (cloud) | Replicate | Self-hosted models |
| Image Editing | fal.ai | Seedream v4.5 Edit |
| Video Teasers | fal.ai | WAN I2V (mild only) |
| Explicit Video | Local | WAN 2.1/2.6 |

### Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Account suspension | Test incrementally, monitor for warnings |
| Model filter changes | Track model behavior over time |
| ToS enforcement | Document all testing, stay within legal bounds |

---

## Testing Log

### Template

```markdown
## Test: [Model Name] - [Date]

**Endpoint:** fal-ai/...
**safety_checker:** false
**Content Type:** [SFW/Suggestive/NSFW]

### Prompt
[Exact prompt used]

### Result
- ✅ Success / ❌ Blocked / ⚠️ Partial

### Notes
[Observations about output quality, any warnings]
```

---

## Related Documentation

- [REPLICATE_API.md](./REPLICATE_API.md) - Alternative cloud provider
- [I2I_SYSTEM.md](../03-SYSTEMS/I2I_SYSTEM.md) - Image-to-image workflow
- [SDXL_WORKER.md](../04-WORKERS/SDXL_WORKER.md) - Local SDXL for explicit content
- Admin Dashboard: API Providers Tab, API Models Tab

---

## External References

- [fal.ai Pricing](https://fal.ai/pricing)
- [fal.ai Model Explorer](https://fal.ai/explore/models)
- [Seedream v4.5 Developer Guide](https://fal.ai/learn/devs/seedream-v4-5-developer-guide)
- [fal.ai Terms of Service](https://fal.ai/terms)
