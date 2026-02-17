# fal.ai Flux-2 Definitive Reference

**Last Updated:** February 17, 2026
**Status:** Authoritative Reference
**Scope:** Flux-2 model family via fal.ai API (Flash, Turbo, Edit, LoRA)

---

## Overview

This is the definitive reference for using Black Forest Labs' FLUX.2 models via the fal.ai API. Flux-2 is a family of speed-optimized image generation models with native editing capabilities and LoRA support.

**Key Principle:** Flux-2 offers **tiered speed/cost tradeoffs**. Choose the endpoint based on your priority: speed (Flash), balance (Turbo), precision (Edit), or customization (LoRA).

**Flux-2 vs Seedream:**

- **Flux-2:** Faster generation, lower per-MP cost, LoRA support, HEX color control
- **Seedream:** Higher quality, up to 10 reference images, better for complex multi-reference composition

---

## Available Endpoints

| Endpoint | Task | Price/MP | Speed | Reference Images | Best For |
|----------|------|----------|-------|------------------|----------|
| `fal-ai/flux-2/flash` | T2I | $0.005 | Sub-second | None | Previews, thumbnails |
| `fal-ai/flux-2/flash/edit` | I2I | $0.005 | Sub-second | 1-4 | Rapid iteration |
| `fal-ai/flux-2/turbo` | T2I | $0.008 | ~6 sec | None | Default production |
| `fal-ai/flux-2/turbo/edit` | I2I | $0.008 | ~6 sec | 1-4 | Scene continuity |
| `fal-ai/flux-2/edit` | I2I | $0.012 | Standard | 1-4 | Multi-ref composition |
| `fal-ai/flux-2/lora` | T2I | $0.021 | Standard | None | Custom styles |
| `fal-ai/flux-2/lora/edit` | I2I | $0.021 | Standard | 1-4 | Character consistency |

---

## Model Tier Comparison

### Flash Tier ($0.005/MP)

- **Distilled model:** Sub-second inference
- **Use case:** High-throughput previews, thumbnails, draft iterations
- **Quality:** Good for rapid prototyping, may need refinement for production

### Turbo Tier ($0.008/MP)

- **8-step generation:** ~6 seconds (vs 50 steps standard)
- **Use case:** Default for user-facing outputs, balanced speed/quality
- **Quality:** Comparable to standard FLUX.2 in fraction of time

### Standard Edit ($0.012/MP)

- **Full inference:** Multi-reference editing with advanced control
- **Use case:** "Serious" composition work, multi-reference scenes
- **Quality:** Highest fidelity for editing tasks

### LoRA Tier ($0.021/MP)

- **Custom adapters:** Fine-tuned for specific styles/characters
- **Use case:** Brand consistency, character lock, premium features
- **Quality:** Specialized output matching trained aesthetic

---

## Cost Calculations

### Text-to-Image (T2I) Costs

| Resolution | Megapixels | Flash | Turbo | LoRA |
|------------|------------|-------|-------|------|
| 512x512 | 0.26 MP | $0.001 | $0.002 | $0.005 |
| 1024x1024 | 1.0 MP | $0.005 | $0.008 | $0.021 |
| 1920x1080 | 2.1 MP | $0.010 | $0.017 | $0.044 |
| 2048x2048 | 4.2 MP | $0.021 | $0.034 | $0.088 |

### Image-to-Image (I2I) Costs

**Formula:** `(input_MP + output_MP) × rate`

Input images are resized to **1 MP maximum** before processing.

| Output Resolution | Input + Output | Flash/Edit | Turbo/Edit | Edit | LoRA/Edit |
|-------------------|----------------|------------|------------|------|-----------|
| 1024x1024 (1 MP) | ~2 MP | $0.010 | $0.016 | $0.024 | $0.042 |
| 1920x1080 (2.1 MP) | ~3.1 MP | $0.016 | $0.025 | $0.037 | $0.065 |

### Batch Optimization

Use `num_images: 4` (max) per request to optimize throughput. Cost is per-image regardless of batching, but reduces API overhead.

---

## API Input Schemas

### Common Parameters (All Endpoints)

```typescript
interface FluxBaseInput {
  prompt: string;                    // Required - max ~10,000 chars
  image_size?: ImageSize;            // Default: "landscape_4_3"
  num_images?: number;               // 1-4, default 1
  guidance_scale?: number;           // 0-20, default 2.5
  num_inference_steps?: number;      // 4-50, default 28
  seed?: number;                     // For reproducibility
  output_format?: 'png' | 'jpeg' | 'webp';  // Default: "png"
  enable_safety_checker?: boolean;   // Default: true (set false for NSFW)
  sync_mode?: boolean;               // Default: false
}

type ImageSize =
  | { width: number; height: number }
  | 'square_hd' | 'square' | 'portrait_4_3' | 'portrait_16_9'
  | 'landscape_4_3' | 'landscape_16_9';
```

### Text-to-Image Specific (Flash, Turbo, LoRA)

```typescript
interface FluxT2IInput extends FluxBaseInput {
  enable_prompt_expansion?: boolean;  // Auto-enhance prompts (Turbo only)
}

// LoRA-specific additions
interface FluxLoRAInput extends FluxT2IInput {
  loras: LoRAConfig[];               // Required for LoRA endpoints
}

interface LoRAConfig {
  path: string;                      // LoRA model path/URL
  scale?: number;                    // Weight 0-1, default 1.0
}
```

### Image-to-Image Specific (All /edit Endpoints)

```typescript
interface FluxEditInput extends FluxBaseInput {
  image_urls: string[];              // Required - ARRAY of 1-4 URLs
  acceleration?: 'none' | 'regular' | 'high';  // Default: "regular"
}

// CRITICAL: image_urls is an ARRAY, not a string!
// CRITICAL: Flux edit endpoints support HEX color codes in prompts
```

---

## API Output Schema

```typescript
interface FluxResponse {
  images: ImageFile[];               // Generated images
  prompt: string;                    // Echo of processed prompt
  seed: number;                      // Seed used
  has_nsfw_concepts: boolean[];      // Per-image safety flags
  timings: {
    inference?: number;              // Generation time
    total?: number;                  // Total processing time
  };
}

interface ImageFile {
  url: string;                       // CDN URL to image
  width: number;
  height: number;
  content_type: string;              // "image/png", etc.
  file_size?: number;                // Bytes
}
```

---

## Endpoint Details

### 1. flux-2/flash (Text-to-Image)

**Characteristics:**

- Sub-second generation
- Cheapest per-MP cost ($0.005)
- Enhanced realism with crisp text generation

**Best Practices:**

- Use for thumbnails, preview grids, rapid A/B testing
- Batch 4 images per request for efficiency
- Good for "generate many, curate few" workflows

```typescript
// Example: Generate preview thumbnails
{
  prompt: "Professional headshot, studio lighting, neutral background",
  image_size: "square_hd",
  num_images: 4,
  guidance_scale: 2.5,
  enable_safety_checker: false
}
```

### 2. flux-2/turbo (Text-to-Image)

**Characteristics:**

- ~6 second generation (8-step distilled)
- Balanced speed/cost ($0.008/MP)
- Quality comparable to full FLUX.2

**Best Practices:**

- Default for user-facing production outputs
- `guidance_scale: 2.0-2.5` for photorealistic
- `guidance_scale: 3.5-4.0` for stylized content
- Front-load important details in prompts

```typescript
// Example: Production character portrait
{
  prompt: "Young woman with auburn hair, green eyes, soft smile, cinematic lighting, shallow depth of field",
  image_size: { width: 1024, height: 1024 },
  guidance_scale: 2.0,
  seed: 42,  // For reproducibility
  enable_safety_checker: false
}
```

### 3. flux-2/edit (Standard Image Editing)

**Characteristics:**

- Multi-reference editing with natural language
- HEX color control for precise matching
- Supports up to 4 reference images
- Higher cost ($0.012/MP input+output)

**HEX Color Syntax:**
Include HEX codes directly in prompts for precise color control:

```
"Change the dress to #FF5733 orange while maintaining the lighting"
```

**Best Practices:**

- Use for complex multi-reference composition
- Reference images by position: "the woman from the first image"
- Include color codes for brand consistency

```typescript
// Example: Multi-reference composition
{
  prompt: "Place the person from the first image into the scene from the second image. Match the lighting. Keep the background colors around #2D4F6C.",
  image_urls: [
    "https://...character.jpg",  // Source: Person
    "https://...scene.jpg"       // Source: Environment
  ],
  image_size: { width: 1920, height: 1080 },
  enable_safety_checker: false
}
```

### 4. flux-2/flash/edit (Fast Image Editing)

**Characteristics:**

- Sub-second editing
- Same price as Flash T2I ($0.005/MP)
- Great for rapid iteration cycles

**Best Practices:**

- Use during iterative refinement loops
- "Draft mode" editing before final pass
- Batch multiple edit variations

```typescript
// Example: Quick edit iteration
{
  prompt: "Remove the background, keep only the person",
  image_urls: ["https://...source.jpg"],
  num_images: 2,  // Generate variations
  acceleration: "high",
  enable_safety_checker: false
}
```

### 5. flux-2/turbo/edit (Balanced Image Editing)

**Characteristics:**

- ~6 second editing
- Balanced cost ($0.008/MP)
- Default for scene continuity workflows

**Best Practices:**

- Default I2I choice for OurVidz scenes
- Use for iterative scene progression
- Maintains consistency better than Flash

```typescript
// Example: Scene continuity edit
{
  prompt: "Continue the romantic scene, the couple moves closer together, maintain the soft lighting and bedroom environment",
  image_urls: ["https://...previous-scene.jpg"],
  image_size: { width: 1024, height: 1024 },
  guidance_scale: 2.5,
  enable_safety_checker: false
}
```

### 6. flux-2/lora (LoRA Text-to-Image)

**Characteristics:**

- Custom-trained adapters
- Highest per-MP cost ($0.021)
- Requires trained LoRA models

**LoRA Configuration:**

```typescript
{
  prompt: "Portrait of the character in a modern office setting",
  loras: [
    {
      path: "path/to/character-lora",  // Or Hugging Face URL
      scale: 0.8  // Blend strength
    }
  ],
  image_size: "square_hd",
  enable_safety_checker: false
}
```

**Training Requirements:**

- Text-to-image LoRAs: 15-30 images with captions
- Image editing LoRAs: 10-20 paired examples (`_start`/`_end` suffixes)

### 7. flux-2/lora/edit (LoRA Image Editing)

**Characteristics:**

- LoRA-powered editing
- Highest control for custom domains
- Edit within brand visual language

**Best Practices:**

- Premium "character lock" feature
- Maintains trained aesthetic during edits
- Use for consistent character series

```typescript
// Example: Character-consistent editing
{
  prompt: "Transform the scene to match the trained style while keeping the character's pose",
  image_urls: ["https://...source.jpg"],
  loras: [
    { path: "path/to/style-lora", scale: 1.0 }
  ],
  enable_safety_checker: false
}
```

---

## OurVidz Integration

### Recommended Model Roles

| Use Case | Endpoint | api_models Role |
|----------|----------|-----------------|
| Preview thumbnails | flux-2/flash | Draft mode T2I |
| Draft iteration | flux-2/flash/edit | Draft mode I2I |
| **Default T2I** | flux-2/turbo | Primary production |
| **Default I2I** | flux-2/turbo/edit | Scene continuity |
| Multi-reference | flux-2/edit | Premium editing |
| Character consistency | flux-2/lora/edit | Future premium |

### api_models Capability Flags

```json
{
  "model_key": "fal-ai/flux-2/turbo/edit",
  "display_name": "Flux 2 Turbo Edit",
  "modality": "image",
  "task": "i2i",
  "capabilities": {
    "supports_i2i": true,
    "char_limit": 10000,
    "uses_strength_param": false,
    "requires_image_urls_array": true,
    "max_images": 4,
    "safety_checker_param": "enable_safety_checker"
  },
  "input_defaults": {
    "enable_safety_checker": false,
    "num_inference_steps": 28,
    "guidance_scale": 2.5
  }
}
```

### Draft Mode Toggle

For workspace UI, implement a "Draft Mode" toggle:

- **Draft ON:** Use Flash endpoints (fast, cheap)
- **Draft OFF:** Use Turbo endpoints (balanced)

```typescript
const selectFluxModel = (isDraftMode: boolean, isI2I: boolean): string => {
  if (isDraftMode) {
    return isI2I ? 'fal-ai/flux-2/flash/edit' : 'fal-ai/flux-2/flash';
  }
  return isI2I ? 'fal-ai/flux-2/turbo/edit' : 'fal-ai/flux-2/turbo';
};
```

### Building Image URLs Array

```typescript
const buildFluxImageUrls = (
  previousScene: string | null,
  characterReference: string | null
): string[] => {
  const urls: string[] = [];

  if (previousScene) urls.push(previousScene);
  if (characterReference) urls.push(characterReference);

  return urls;  // Max 4 images for Flux
};
```

---

## Flux vs Seedream Decision Matrix

| Factor | Choose Flux | Choose Seedream |
|--------|-------------|-----------------|
| **Speed priority** | ✅ Flash/Turbo | |
| **Cost priority** | ✅ Cheaper per-MP | |
| **Multi-reference (5+ images)** | | ✅ Up to 10 images |
| **LoRA customization** | ✅ Native support | |
| **HEX color control** | ✅ In prompts | |
| **Complex composition** | | ✅ Better quality |
| **Production quality** | | ✅ Higher fidelity |

### Recommended Split for OurVidz

1. **Flux Turbo** → Default for most generation (speed + cost)
2. **Seedream v4.5/edit** → Multi-reference scenes (5+ images, both_characters)
3. **Flux Flash** → Draft mode, previews, thumbnails
4. **Flux LoRA** → Future premium character consistency feature

---

## Best Practices

### Prompt Engineering

1. **Front-load important details** - Flux processes prompts sequentially
2. **Use specific descriptors** - "auburn hair" not "nice hair"
3. **Include lighting/atmosphere** - "soft golden hour lighting"
4. **HEX colors for precision** - "#FF5733 dress" for exact color

### Guidance Scale Tuning

| Style | Recommended Range |
|-------|-------------------|
| Photorealistic | 1.5 - 2.5 |
| Stylized/Artistic | 3.0 - 4.0 |
| Abstract/Creative | 4.0+ |

### Seed Reproducibility

Use consistent seeds for:

- Character series (same face across images)
- Style variations (same composition, different details)
- A/B testing (isolate one variable)

```typescript
const generateCharacterSeries = async (basePrompt: string, seed: number) => {
  const variations = ['smiling', 'serious', 'laughing'];
  return Promise.all(variations.map((expression, i) =>
    generate({
      prompt: `${basePrompt}, ${expression} expression`,
      seed: seed + i  // Deterministic variation
    })
  ));
};
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 422 Unprocessable Entity | Invalid parameters | Check param names match schema |
| 400 Bad Request | Prompt too long | Validate against char_limit |
| 401 Unauthorized | Invalid API key | Check FAL_API_KEY |
| 413 Payload Too Large | Image URLs too large | Compress input images |

### Parameter Validation

```typescript
const validateFluxInput = (input: any, isEdit: boolean): void => {
  const charLimit = 10000;

  if (input.prompt.length > charLimit) {
    throw new Error(`Prompt exceeds ${charLimit} char limit`);
  }

  if (isEdit) {
    if (!Array.isArray(input.image_urls)) {
      throw new Error('image_urls must be an array');
    }
    if (input.image_urls.length > 4) {
      throw new Error('Maximum 4 reference images for Flux');
    }
  }

  if (input.num_images && (input.num_images < 1 || input.num_images > 4)) {
    throw new Error('num_images must be 1-4');
  }
};
```

---

## API Call Structure

### Endpoint URL

```
POST https://fal.run/{model_key}
```

### Headers

```typescript
{
  'Authorization': `Key ${FAL_API_KEY}`,
  'Content-Type': 'application/json'
}
```

### Full Request Example

```typescript
const response = await fetch('https://fal.run/fal-ai/flux-2/turbo/edit', {
  method: 'POST',
  headers: {
    'Authorization': `Key ${process.env.FAL_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: "Continue the romantic scene with warmer lighting",
    image_urls: ["https://...previous-scene.jpg"],
    image_size: { width: 1024, height: 1024 },
    guidance_scale: 2.5,
    num_inference_steps: 28,
    enable_safety_checker: false
  })
});

const result = await response.json();
// result.images[0].url -> Generated image
```

---

## Database Configuration

### api_models Entries (SQL)

```sql
-- Flux 2 Turbo (T2I) - Default production
INSERT INTO api_models (model_key, display_name, modality, task, provider_id, is_active, is_default, priority, capabilities, input_defaults)
VALUES (
  'fal-ai/flux-2/turbo',
  'Flux 2 Turbo',
  'image',
  't2i',
  (SELECT id FROM api_providers WHERE name = 'fal'),
  true,
  false,
  20,
  '{"char_limit": 10000, "supports_i2i": false, "safety_checker_param": "enable_safety_checker"}',
  '{"enable_safety_checker": false, "guidance_scale": 2.5, "num_inference_steps": 28}'
);

-- Flux 2 Turbo Edit (I2I) - Default scene continuity
INSERT INTO api_models (model_key, display_name, modality, task, provider_id, is_active, is_default, priority, capabilities, input_defaults)
VALUES (
  'fal-ai/flux-2/turbo/edit',
  'Flux 2 Turbo Edit',
  'image',
  'i2i',
  (SELECT id FROM api_providers WHERE name = 'fal'),
  true,
  false,
  21,
  '{"char_limit": 10000, "supports_i2i": true, "max_images": 4, "requires_image_urls_array": true, "uses_strength_param": false, "safety_checker_param": "enable_safety_checker"}',
  '{"enable_safety_checker": false, "guidance_scale": 2.5, "num_inference_steps": 28}'
);

-- Flux 2 Flash (T2I) - Draft mode
INSERT INTO api_models (model_key, display_name, modality, task, provider_id, is_active, is_default, priority, capabilities, input_defaults)
VALUES (
  'fal-ai/flux-2/flash',
  'Flux 2 Flash (Draft)',
  'image',
  't2i',
  (SELECT id FROM api_providers WHERE name = 'fal'),
  true,
  false,
  30,
  '{"char_limit": 10000, "supports_i2i": false, "safety_checker_param": "enable_safety_checker"}',
  '{"enable_safety_checker": false, "guidance_scale": 2.5}'
);

-- Flux 2 Flash Edit (I2I) - Draft mode
INSERT INTO api_models (model_key, display_name, modality, task, provider_id, is_active, is_default, priority, capabilities, input_defaults)
VALUES (
  'fal-ai/flux-2/flash/edit',
  'Flux 2 Flash Edit (Draft)',
  'image',
  'i2i',
  (SELECT id FROM api_providers WHERE name = 'fal'),
  true,
  false,
  31,
  '{"char_limit": 10000, "supports_i2i": true, "max_images": 4, "requires_image_urls_array": true, "uses_strength_param": false, "safety_checker_param": "enable_safety_checker"}',
  '{"enable_safety_checker": false, "guidance_scale": 2.5}'
);
```

---

## Related Documentation

- [FAL_AI_SEEDREAM_DEFINITIVE.md](./FAL_AI_SEEDREAM_DEFINITIVE.md) - Seedream v4/v4.5 reference
- [WAN2.1_i2v_FAL_AI_GUIDE.md](./WAN2.1_i2v_FAL_AI_GUIDE.md) - Video generation guide
- [IMAGE_CREATION_GUIDE.md](./IMAGE_CREATION_GUIDE.md) - General image prompting
- [ROLEPLAY_SCENE_GENERATION.md](./ROLEPLAY_SCENE_GENERATION.md) - Scene generation workflow

---

## Appendix: Other Flux-2 Variants

fal.ai also offers these premium Flux-2 models (not covered in detail):

| Model | Price | Notable Features |
|-------|-------|------------------|
| FLUX.2 [pro] | $0.03 first MP + $0.015/additional | Production-optimized, up to 9 refs |
| FLUX.2 [flex] | $0.05/MP | Up to 10 refs (14 MP input), best typography |
| FLUX.2 [max] | $0.07 first MP + $0.03/additional | State-of-the-art quality |
| FLUX.2 [klein] | $0.009-0.014/MP | 4B params, lightweight |

These may be relevant for future premium tier features.
