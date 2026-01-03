# fal.ai API Integration

**Last Updated:** January 3, 2026
**Status:** 🔬 RESEARCH - Integration planned, NSFW capabilities pending testing

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

```sql
INSERT INTO api_providers (
  name, display_name, base_url,
  auth_scheme, auth_header_name, secret_name, is_active
) VALUES (
  'fal', 'fal.ai', 'https://queue.fal.run',
  'api_key_header', 'Authorization', 'FAL_KEY', true
);
```

### api_models Entries

```sql
-- Seedream v4 Text-to-Image
INSERT INTO api_models (
  provider_id, model_key, display_name, version,
  modality, task, model_family, is_active, priority,
  input_defaults, capabilities
) VALUES (
  (SELECT id FROM api_providers WHERE name = 'fal'),
  'fal-ai/bytedance/seedream/v4/text-to-image',
  'Seedream v4',
  NULL,  -- fal uses model paths, not version hashes
  'image', 'generation', 'seedream', true, 10,
  '{"image_size": {"width": 1024, "height": 1024}, "num_inference_steps": 30, "guidance_scale": 7.5}',
  '{"nsfw_status": "to_be_tested", "safety_checker_param": "safety_checker"}'
);

-- Seedream v4 Edit (I2I)
INSERT INTO api_models (
  provider_id, model_key, display_name,
  modality, task, model_family, is_active, priority,
  input_defaults, capabilities
) VALUES (
  (SELECT id FROM api_providers WHERE name = 'fal'),
  'fal-ai/bytedance/seedream/v4/edit',
  'Seedream v4 Edit',
  'image', 'style_transfer', 'seedream', true, 11,
  '{"image_size": {"width": 1024, "height": 1024}, "strength": 0.5}',
  '{"nsfw_status": "to_be_tested", "supports_i2i": true}'
);

-- WAN Image (for NSFW testing)
INSERT INTO api_models (
  provider_id, model_key, display_name,
  modality, task, model_family, is_active, priority,
  input_defaults, capabilities
) VALUES (
  (SELECT id FROM api_providers WHERE name = 'fal'),
  'fal-ai/wan/v2.1/image',
  'WAN 2.1 Image',
  'image', 'generation', 'wan', true, 12,
  '{"image_size": {"width": 1024, "height": 1024}}',
  '{"nsfw_status": "expected_good", "permissive_policy": true}'
);
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

### CLIP Token Considerations

- Seedream uses CLIP-like tokenization
- Optimal prompt length: 50-150 tokens
- Front-load important terms
- Avoid excessive detail that gets truncated

### Resolution Constraints

- Minimum: 1024x1024
- Maximum: 4096x4096
- Both dimensions must be divisible by 8

---

## Integration Architecture

### Edge Function Pattern

```typescript
// supabase/functions/fal-image/index.ts
import * as fal from "@fal-ai/serverless-client";

serve(async (req) => {
  const { prompt, modelKey, options } = await req.json();

  // Get model config from database
  const model = await getApiModel(modelKey);

  // Configure fal client
  fal.config({ credentials: Deno.env.get('FAL_KEY') });

  // Submit to fal
  const result = await fal.subscribe(model.model_key, {
    input: {
      prompt,
      safety_checker: options.contentType === 'nsfw' ? false : true,
      ...model.input_defaults,
      ...options
    }
  });

  return new Response(JSON.stringify(result));
});
```

### Webhook Alternative

fal.ai supports webhooks for long-running predictions:

```typescript
const result = await fal.subscribe(modelKey, {
  input: inputData,
  webhookUrl: "https://your-project.supabase.co/functions/v1/fal-webhook"
});
```

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
