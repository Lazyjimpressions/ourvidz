# Roleplay Scene I2I & Multi-Reference System

**Document Version:** 2.0
**Last Updated:** February 6, 2026
**Status:** Active
**Author:** AI Assistant

---

## Purpose

This document describes the image-to-image (I2I) and multi-reference scene generation system used in roleplay chat. The system maintains visual consistency across scenes and supports combining multiple character references.

---

## Scene Generation Modes

### Scene Style Options

| Style | References Used | Description |
|-------|----------------|-------------|
| `character_only` | AI character reference | Scene shows only the AI character |
| `pov` | AI character reference | First-person view, user implied but not shown |
| `both_characters` | AI + User references | Both characters visible in scene |

### Reference Image Requirements

| Scene Style | AI Character | User Persona | Previous Scene |
|-------------|--------------|--------------|----------------|
| `character_only` | Required | Not used | Optional (I2I) |
| `pov` | Required | Not used | Optional (I2I) |
| `both_characters` | Required | Required | Optional (I2I) |

---

## Multi-Reference Scene Generation

### How It Works

Multi-reference generation uses Seedream v4.5/edit with Figure notation to combine multiple character images into a single scene.

### Request Structure

```typescript
// fal-image edge function request
{
  model_key: "seedream-v4.5-edit",
  prompt: "Figure 1 and Figure 2 in a romantic scene...",
  reference_images: [
    "https://storage.url/ai-character-reference.jpg",  // Figure 1
    "https://storage.url/user-persona-reference.jpg"   // Figure 2
  ],
  strength: 0.45,
  scene_continuity_enabled: true,
  previous_scene_url: "https://storage.url/previous-scene.jpg"
}
```

### Figure Notation

When using multi-reference, the prompt must use Figure notation:

| Notation | Refers To |
|----------|-----------|
| `Figure 1` | First image in `reference_images` array (AI character) |
| `Figure 2` | Second image in `reference_images` array (User persona) |

**Example Prompt:**
```
Figure 1 and Figure 2 embrace in a dimly lit room. Figure 1 wears a red dress while Figure 2 stands behind her.
```

---

## Scene Continuity (I2I Iteration)

### Purpose

Maintains visual consistency across scenes by using the previous scene as a reference for the next generation.

### Flow

1. **First Scene (T2I):** Text-to-image using only character `reference_image_url`
2. **Subsequent Scenes (I2I):** Image-to-image using previous scene + character reference

### useSceneContinuity Hook

```typescript
const {
  previousScene,        // { sceneId, imageUrl, timestamp, isPending }
  setLastScene,         // (conversationId, sceneId, imageUrl) => void
  refreshSceneFromDB,   // (conversationId) => Promise<void>
  settings,             // { enabled, defaultStrength }
  updateSettings        // (settings) => void
} = useSceneContinuity(conversationId);
```

### Storage Layers

| Layer | Purpose | Key/Location |
|-------|---------|--------------|
| localStorage | Fast lookup | `scene-continuity-scenes` |
| Database | Fallback | `character_scenes.image_url` |
| Realtime | Live updates | Supabase subscription |

### I2I Strength Control

| Strength | Effect |
|----------|--------|
| 0.2 | Minimal change, preserves most of previous scene |
| 0.45 | Balanced (default), moderate changes |
| 0.7 | Significant changes, may lose some consistency |
| 0.8 | Maximum variation, minimal reference influence |

---

## Model Selection

### I2I Models Available

The `useI2IModels` hook provides available models for I2I/style transfer:

```typescript
const { models, isLoading, error } = useI2IModels();
```

### Model Routing

| Model Key | Provider | Best For |
|-----------|----------|----------|
| `seedream-v4.5-edit` | fal.ai | Multi-reference, high quality |
| `rv5.1-i2i` | Replicate | Single reference, fast |
| `sdxl-i2i` | Local | Privacy, no API cost |

### Model Override for Modifications

When regenerating scenes, users can override the default model:

```typescript
// In QuickModificationSheet
const regenerateScene = async (preset: string, modelOverride?: string) => {
  await generateScene({
    ...currentParams,
    i2i_model_override: modelOverride,
    strength: intensityValue
  });
};
```

---

## Validation Requirements

### Before Multi-Reference Generation

```typescript
// Validate both characters have reference images
const canUseMultiReference =
  aiCharacter.reference_image_url &&
  userPersona.reference_image_url;

if (!canUseMultiReference && sceneStyle === 'both_characters') {
  // Fall back to character_only style
  sceneStyle = 'character_only';
  toast({
    title: 'Missing reference image',
    description: 'Using single character mode'
  });
}
```

### Reference Image Quality

For best results, reference images should be:

- Clear, well-lit photos/renders
- Face and upper body visible
- Consistent style (photo vs anime vs realistic)
- Minimum 512x512 resolution

---

## Edge Function Integration

### fal-image Request Flow

1. Frontend sends request with `reference_images` array
2. Edge function validates images are accessible
3. fal.ai Seedream processes with Figure notation
4. Result stored in `workspace_assets` table
5. Frontend polls or subscribes for completion

### Error Handling

| Error | Cause | Recovery |
|-------|-------|----------|
| 422 Validation Error | Invalid reference URLs | Check URL accessibility |
| Missing reference | I2I model without images | Fall back to T2I |
| Timeout | Large image processing | Retry with lower resolution |

---

## Related Components

| Component | Purpose |
|-----------|---------|
| `QuickModificationSheet` | Preset-based I2I modifications |
| `IntensitySelector` | Strength slider for I2I |
| `ScenePromptEditModal` | Full prompt editing for regeneration |
| `ConsistencySettings` | I2I method selection |

---

## Related Hooks

| Hook | Purpose |
|------|---------|
| `useSceneContinuity` | Previous scene tracking |
| `useI2IModels` | Available I2I model list |
| `useRoleplaySettings` | Scene style and strength settings |

---

## Related Docs

- [UX_CHAT.md](./UX_CHAT.md) - Scene continuity in chat
- [UX_SCENE.md](./UX_SCENE.md) - Scene creation
- [UX_CHARACTER.md](./UX_CHARACTER.md) - Reference image management
- [../01-WORKSPACE/SEEDREAM_I2I.md](../01-WORKSPACE/SEEDREAM_I2I.md) - Workspace I2I documentation
- [../../09-REFERENCE/FAL_AI_SEEDREAM_DEFINITIVE.md](../../09-REFERENCE/FAL_AI_SEEDREAM_DEFINITIVE.md) - Seedream API reference
