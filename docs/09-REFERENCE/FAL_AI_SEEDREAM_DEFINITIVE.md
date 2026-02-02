# fal.ai Seedream Definitive Reference

**Last Updated:** January 31, 2026
**Status:** Authoritative Reference
**Scope:** Seedream v4 and v4.5 models via fal.ai API

---

## Overview

This is the definitive reference for using ByteDance Seedream models via the fal.ai API. Seedream is a unified image foundation model exposed through different endpoints for different tasks.

**Key Principle:** These are **not separate models to chain together** - you choose the endpoint based on what you want to do. Each request uses one endpoint.

---

## Available Endpoints

| Endpoint | Task | Reference Images | Max Input Images |
|----------|------|------------------|------------------|
| `fal-ai/bytedance/seedream/v4/text-to-image` | T2I | None | 0 |
| `fal-ai/bytedance/seedream/v4.5/text-to-image` | T2I | None | 0 |
| `fal-ai/bytedance/seedream/v4/edit` | I2I | Required | 1-10 |
| `fal-ai/bytedance/seedream/v4.5/edit` | I2I | Required | **1-10** |

---

## Model Capabilities (from api_models table)

### v4/text-to-image

```json
{
  "char_limit": 10000,
  "uses_clip_tokenizer": false,
  "max_resolution": 4096,
  "min_resolution": 1024,
  "safety_checker_param": "enable_safety_checker"
}
```

### v4.5/edit (Multi-Reference)

```json
{
  "char_limit": 10000,
  "max_images": 10,
  "uses_clip_tokenizer": false,
  "uses_strength_param": false,
  "supports_i2i": true,
  "safety_checker_param": "enable_safety_checker"
}
```

---

## Character/Token Limits

| Model | char_limit | CLIP Tokenizer | Notes |
|-------|------------|----------------|-------|
| Seedream v4/t2i | 10,000 | No | Full prompts OK |
| Seedream v4/edit | 10,000 | No | No strength param |
| Seedream v4.5/edit | 10,000 | No | Multi-reference, no strength |
| WAN 2.1 I2V | 1,500 | No | Optimize prompts! |

**CRITICAL:** Always validate prompt length against `capabilities.char_limit` before sending to fal.ai. Never silently truncate prompts.

---

## API Input Schemas

### Text-to-Image (v4 and v4.5)

```typescript
interface SeedreamT2IInput {
  prompt: string;                    // Required - max 10,000 chars
  image_size?: ImageSize;            // Optional - default 2048x2048
  num_images?: number;               // 1-6, default 1
  max_images?: number;               // 1-6, enables multi-generation
  seed?: number;                     // For reproducibility
  enable_safety_checker?: boolean;   // Default true, set false for NSFW
  sync_mode?: boolean;               // Default false
}

type ImageSize =
  | { width: number; height: number }  // 1920-4096px
  | 'square_hd' | 'portrait_4_3' | 'landscape_16_9' | 'auto_4K';
```

### Edit / Image-to-Image (v4 and v4.5)

```typescript
interface SeedreamEditInput {
  prompt: string;                    // Required - includes spatial instructions
  image_urls: string[];              // Required - ARRAY of 1-10 URLs
  image_size?: ImageSize;            // Optional - output dimensions
  num_images?: number;               // 1-6, default 1
  max_images?: number;               // 1-6, default 1
  seed?: number;                     // For reproducibility
  enable_safety_checker?: boolean;   // Default true, set false for NSFW
  sync_mode?: boolean;               // Default false
}

// CRITICAL: image_urls is an ARRAY, not a string!
// CRITICAL: NO strength parameter - v4.5/edit doesn't use it
```

---

## Multi-Reference Composition (v4.5/edit)

### How It Works

Seedream v4.5/edit supports **up to 10 input images** with multi-source composition. The model uses **natural language spatial instructions** to composite elements:

> "Reference up to 10 images per edit, enabling complex workflows like product swaps, text overlay copying, and element positioning across multiple source files."

### Figure Notation

Images are referenced by their position in the `image_urls` array using "Figure X" notation:

```typescript
image_urls: [
  "https://...scene-background.jpg",     // Figure 1
  "https://...character-portrait.jpg",   // Figure 2
  "https://...user-avatar.jpg"           // Figure 3
]

prompt: `
In the setting from Figure 1, show the woman from Figure 2
and the man from Figure 3 in an intimate embrace.

COMPOSITION RULES:
- Maintain the environment, lighting, and atmosphere from Figure 1
- Preserve the woman's appearance from Figure 2
- Preserve the man's appearance from Figure 3
- Characters should be interacting naturally within the scene
`
```

### Best Practices for Multi-Reference

1. **Order matters:** Figure numbers correspond to array index + 1
2. **Be explicit:** State which Figure provides what (setting, character, etc.)
3. **Maintain consistency:** Use phrases like "maintain from Figure X"
4. **Describe relationships:** Specify spatial relationships between elements
5. **Character identity:** Include visual descriptors alongside Figure references

---

## Use Cases

### 1. Pure Text-to-Image (No References)

**Endpoint:** `v4/text-to-image` or `v4.5/text-to-image`

```typescript
{
  prompt: "A romantic bedroom at night, soft candlelight, silk sheets...",
  image_size: { width: 1024, height: 1024 },
  enable_safety_checker: false
}
```

### 2. Single-Reference I2I (Scene Continuation)

**Endpoint:** `v4.5/edit`

```typescript
{
  prompt: "Continue the scene with more intimate lighting...",
  image_urls: ["https://...previous-scene.jpg"],
  enable_safety_checker: false
}
```

### 3. Two-Reference (Scene + Character)

**Endpoint:** `v4.5/edit`

```typescript
{
  prompt: `
    In the setting from Figure 1, show the woman from Figure 2.
    Maintain the environment from Figure 1.
    Preserve the character's appearance from Figure 2.
  `,
  image_urls: [
    "https://...scene-environment.jpg",   // Figure 1
    "https://...character-reference.jpg"  // Figure 2
  ],
  enable_safety_checker: false
}
```

### 4. Three-Reference (Scene + Character + User)

**Endpoint:** `v4.5/edit`

For `both_characters` scene style:

```typescript
{
  prompt: `
    In the romantic bedroom setting from Figure 1, show two people together.

    CHARACTER 1 (appearance from Figure 2):
    The AI character - preserve facial features, hair, body type.

    CHARACTER 2 (appearance from Figure 3):
    The user character - preserve facial features, hair, body type.

    SCENE:
    They are in an intimate embrace, gazing at each other.

    RULES:
    - Maintain environment and lighting from Figure 1
    - Preserve Character 1's exact appearance from Figure 2
    - Preserve Character 2's exact appearance from Figure 3
    - Natural interaction within the scene
  `,
  image_urls: [
    "https://...scene-environment.jpg",   // Figure 1: Setting
    "https://...ai-character.jpg",        // Figure 2: AI Character
    "https://...user-character.jpg"       // Figure 3: User
  ],
  enable_safety_checker: false
}
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

### Response Structure

```typescript
interface FalResponse {
  images?: Array<{ url: string; width: number; height: number }>;
  seed?: number;
  request_id?: string;
}
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 422 Unprocessable Entity | Invalid parameters | Check param names, remove unsupported params |
| 400 Bad Request | Prompt too long | Validate against char_limit before sending |
| 401 Unauthorized | Invalid API key | Check FAL_API_KEY |

### Parameter Validation

```typescript
const validateFalInput = (input: any, capabilities: any): void => {
  const charLimit = capabilities?.char_limit || 10000;

  if (input.prompt.length > charLimit) {
    throw new Error(`Prompt exceeds ${charLimit} char limit`);
  }

  if (input.image_urls && input.image_urls.length > 10) {
    throw new Error('Maximum 10 reference images allowed');
  }

  // v4.5/edit does NOT use strength
  if (input.strength !== undefined) {
    console.warn('Removing unsupported strength parameter for v4.5/edit');
    delete input.strength;
  }
};
```

---

## Integration with OurVidz

### Model Selection Logic

```typescript
const selectSeedreamModel = (
  hasReferences: boolean,
  referenceCount: number
): string => {
  if (!hasReferences || referenceCount === 0) {
    return 'fal-ai/bytedance/seedream/v4/text-to-image';
  }

  // v4.5/edit for any reference-based generation
  return 'fal-ai/bytedance/seedream/v4.5/edit';
};
```

### Building Image URLs Array

```typescript
const buildImageUrlsArray = (
  sceneStyle: 'character_only' | 'pov' | 'both_characters',
  sceneTemplateImage: string | null,
  previousSceneImage: string | null,
  characterReference: string | null,
  userCharacterReference: string | null
): string[] => {
  const imageUrls: string[] = [];

  // Figure 1: Scene/Environment
  const sceneImage = previousSceneImage || sceneTemplateImage;
  if (sceneImage) imageUrls.push(sceneImage);

  // Figure 2: AI Character
  if (characterReference) imageUrls.push(characterReference);

  // Figure 3: User Character (only for both_characters)
  if (sceneStyle === 'both_characters' && userCharacterReference) {
    imageUrls.push(userCharacterReference);
  }

  return imageUrls;
};
```

---

## Database Configuration

### api_models Entry

```sql
SELECT model_key, capabilities, input_defaults
FROM api_models
WHERE model_key LIKE '%seedream%';
```

### Required Capabilities

For multi-reference support, ensure `api_models.capabilities` includes:

```json
{
  "max_images": 10,
  "supports_i2i": true,
  "char_limit": 10000,
  "uses_strength_param": false
}
```

---

## Related Documentation

- [ROLEPLAY_SCENE_GENERATION.md](./ROLEPLAY_SCENE_GENERATION.md) - Scene generation workflow
- [Seedream_model_guide.md](./Seedream_model_guide.md) - Original model guide
- [WAN2.1_i2v_FAL_AI_GUIDE.md](./WAN2.1_i2v_FAL_AI_GUIDE.md) - Video generation guide
