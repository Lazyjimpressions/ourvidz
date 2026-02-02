# Roleplay Scene Generation Workflow

**Last Updated:** January 31, 2026
**Status:** Authoritative Reference
**Scope:** Scene image generation during roleplay chat

---

## Overview

This document defines the definitive workflow for generating scene images during roleplay conversations. It covers model selection, reference image handling, prompt construction, and multi-character scenes.

---

## Decision Tree

```
User starts roleplay with scene
    │
    ├─ scene_style = 'character_only'
    │   ├─ First scene + has character.reference_image_url?
    │   │   └─ v4.5/edit with [scene_preview_image, character_reference]
    │   ├─ First scene + no character reference?
    │   │   └─ v4/t2i (pure text-to-image from scene_prompt)
    │   └─ Subsequent scene?
    │       └─ v4.5/edit with [previous_scene_image]
    │
    ├─ scene_style = 'pov'
    │   ├─ First scene + has character reference?
    │   │   └─ v4.5/edit with [scene_preview_image, character_reference]
    │   ├─ First scene + no character reference?
    │   │   └─ v4/t2i with POV prompt modifiers
    │   └─ Subsequent scene?
    │       └─ v4.5/edit with [previous_scene_image]
    │
    └─ scene_style = 'both_characters'
        ├─ Has character + user references? (REQUIRED)
        │   └─ v4.5/edit with [scene_image, character_ref, user_ref]
        ├─ Missing user reference?
        │   └─ DISABLED in UI - cannot select both_characters
        └─ Subsequent scene?
            └─ v4.5/edit with [previous_scene, character_ref, user_ref]
```

---

## Model Selection Matrix

| Scene Style | First Scene | Subsequent | References Used | Model |
|-------------|-------------|------------|-----------------|-------|
| character_only (with ref) | v4.5/edit | v4.5/edit | scene + character | I2I |
| character_only (no ref) | v4/t2i | v4.5/edit | scene only | T2I then I2I |
| pov (with ref) | v4.5/edit | v4.5/edit | scene + character | I2I |
| pov (no ref) | v4/t2i | v4.5/edit | scene only | T2I then I2I |
| both_characters | v4.5/edit | v4.5/edit | scene + char + user | I2I (multi-ref) |

---

## Reference Image Priority

### Image URLs Array Order (Figure Notation)

```typescript
// For both_characters scenes:
image_urls = [
  scene_preview_image_url || previous_scene_image_url,  // Figure 1: Setting
  character.reference_image_url,                         // Figure 2: AI Character
  user_character.reference_image_url                     // Figure 3: User
]

// For character_only or pov scenes:
image_urls = [
  scene_preview_image_url || previous_scene_image_url,  // Figure 1: Setting
  character.reference_image_url                          // Figure 2: Character
]
```

### Priority Rules

1. **Scene Environment (Figure 1):**
   - Use `previous_scene_image_url` for continuity (subsequent scenes)
   - Fall back to `scene.preview_image_url` (first scene)
   - **Scene templates MUST have preview_image_url**

2. **AI Character (Figure 2):**
   - Use `character.reference_image_url`
   - If null, fall back to T2I (no character reference)

3. **User Character (Figure 3):**
   - Use `user_character.reference_image_url`
   - **Required for both_characters** - UI disables option if null

---

## Prompt Templates

### Database Templates (prompt_templates table)

| Template Name | Use Case | Token Limit | Target Model |
|---------------|----------|-------------|--------------|
| Scene Narrative - NSFW | scene_narrative_generation | 1000 | null (universal) |
| Scene Narrative - SFW | scene_narrative_generation | 1000 | null (universal) |
| Scene Iteration - Seedream v4.5 Edit (NSFW) | scene_iteration | 512 | fal-ai/.../v4.5/edit |
| Scene Iteration - Seedream v4.5 Edit (SFW) | scene_iteration | 512 | fal-ai/.../v4.5/edit |
| Scene Multi-Reference - NSFW | scene_multi_reference | 2000 | fal-ai/.../v4.5/edit |
| Scene Multi-Reference - SFW | scene_multi_reference | 2000 | fal-ai/.../v4.5/edit |

### Template Selection Logic

```typescript
const selectSceneTemplate = async (
  supabase: any,
  useCase: string,
  contentTier: 'nsfw' | 'sfw',
  modelKey?: string
): Promise<PromptTemplate> => {
  // 1. Try model-specific template
  if (modelKey) {
    const { data: specific } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('use_case', useCase)
      .eq('content_mode', contentTier)
      .eq('target_model', modelKey)
      .eq('is_active', true)
      .single();

    if (specific) return specific;
  }

  // 2. Fall back to universal template
  const { data: universal } = await supabase
    .from('prompt_templates')
    .select('*')
    .eq('use_case', useCase)
    .eq('content_mode', contentTier)
    .is('target_model', null)
    .eq('is_active', true)
    .single();

  return universal;
};
```

---

## Prompt Construction

### Character Only / POV (Two References)

```typescript
const buildCharacterScenePrompt = (
  sceneDescription: string,
  characterVisual: string,
  action: string,
  sceneStyle: 'character_only' | 'pov'
): string => {
  const povModifier = sceneStyle === 'pov'
    ? 'from a first-person perspective, looking at the character'
    : '';

  return `
In the setting from Figure 1, show the character from Figure 2 ${povModifier}.

SCENE (Figure 1):
${sceneDescription}

CHARACTER (from Figure 2):
${characterVisual}

ACTION:
${action}

RULES:
- Maintain the exact environment from Figure 1
- Preserve the character's appearance from Figure 2
- Photorealistic, cinematic lighting, shallow depth of field
`.trim();
};
```

### Both Characters (Three References)

```typescript
const buildBothCharactersPrompt = (
  sceneDescription: string,
  characterVisual: string,
  userCharacterVisual: string,
  action: string
): string => {
  return `
In the setting from Figure 1, show two people together.

SCENE SETTING (from Figure 1):
${sceneDescription}

CHARACTER 1 - AI CHARACTER (appearance from Figure 2):
${characterVisual}

CHARACTER 2 - USER (appearance from Figure 3):
${userCharacterVisual}

ACTION/POSE:
${action}

COMPOSITION RULES:
- Maintain the exact environment, lighting, and atmosphere from Figure 1
- Preserve Character 1's facial features, hair, and body type from Figure 2
- Preserve Character 2's facial features, hair, and body type from Figure 3
- Characters should be interacting naturally within the scene
- Photorealistic, cinematic lighting, shallow depth of field
`.trim();
};
```

### Scene Continuation (I2I)

```typescript
const buildContinuationPrompt = (
  previousDescription: string,
  newAction: string,
  characterCount: number
): string => {
  const charRules = characterCount > 1
    ? `- Maintain Character 1's appearance from Figure 2
- Maintain Character 2's appearance from Figure 3`
    : `- Maintain the character's appearance from Figure 2`;

  return `
Continue the scene from Figure 1, maintaining consistency.

PREVIOUS SCENE (Figure 1):
${previousDescription}

NEW ACTION/CHANGE:
${newAction}

CONTINUITY RULES:
- Keep the same setting and lighting from Figure 1
${charRules}
- Only change the pose/action as described
- Preserve scene continuity and character identity
`.trim();
};
```

---

## Prompt Validation

### Character Limit Enforcement

```typescript
const validatePromptForModel = (
  prompt: string,
  capabilities: any
): { isValid: boolean; optimizedPrompt: string; warning?: string } => {
  const charLimit = capabilities?.char_limit || 10000;

  if (prompt.length <= charLimit) {
    return { isValid: true, optimizedPrompt: prompt };
  }

  console.warn(`Prompt exceeds ${charLimit} chars (${prompt.length}). Optimizing...`);

  // Optimization strategy:
  // 1. Keep Figure references intact
  // 2. Compress verbose descriptors
  // 3. Remove redundant phrases
  // 4. Truncate at sentence boundary as last resort

  const optimized = optimizePromptForLimit(prompt, charLimit);

  return {
    isValid: true,
    optimizedPrompt: optimized,
    warning: `Prompt optimized from ${prompt.length} to ${optimized.length} chars`
  };
};

const optimizePromptForLimit = (prompt: string, limit: number): string => {
  // Preserve Figure notation lines
  const figureLines = prompt.match(/Figure \d[^.]*\./g) || [];

  // If just Figure notation fits, use minimal prompt
  const figureContent = figureLines.join(' ');
  if (figureContent.length > limit * 0.8) {
    // Figure notation alone is too long - critical error
    console.error('Figure notation exceeds character limit');
    return prompt.substring(0, limit);
  }

  // Find last complete sentence that fits
  let truncated = prompt.substring(0, limit);
  const lastPeriod = truncated.lastIndexOf('.');
  if (lastPeriod > limit * 0.7) {
    truncated = truncated.substring(0, lastPeriod + 1);
  }

  return truncated;
};
```

---

## Model Selection Implementation

### Dynamic Selection from api_models

```typescript
const selectSceneModel = async (
  supabase: any,
  imageUrls: string[],
  sceneStyle: string
): Promise<ApiModel> => {
  const requiresMultiRef = sceneStyle === 'both_characters' && imageUrls.length >= 3;
  const requiresI2I = imageUrls.length > 0;

  let query = supabase
    .from('api_models')
    .select('*')
    .eq('modality', 'image')
    .eq('is_active', true);

  if (requiresI2I) {
    query = query.eq('capabilities->supports_i2i', true);
  }

  if (requiresMultiRef) {
    query = query.gte('capabilities->max_images', imageUrls.length);
  }

  const { data: models } = await query.order('priority', { ascending: false });

  if (!models || models.length === 0) {
    throw new Error('No suitable image model found');
  }

  return models[0];
};
```

---

## Scene Style UI Requirements

### QuickSettingsDrawer Validation

```typescript
// In QuickSettingsDrawer.tsx
const canUseBothCharacters = useMemo(() => {
  // Requires both AI character and user character to have reference images
  return (
    character?.reference_image_url &&
    userCharacter?.reference_image_url
  );
}, [character, userCharacter]);

// Disable option if requirements not met
<RadioGroupItem
  value="both_characters"
  disabled={!canUseBothCharacters}
/>
{!canUseBothCharacters && (
  <p className="text-xs text-muted-foreground">
    Requires user character with reference image
  </p>
)}
```

---

## Edge Function Integration

### Request Body Structure

```typescript
interface SceneGenerationRequest {
  // ... existing fields
  scene_style: 'character_only' | 'pov' | 'both_characters';
  user_character_reference_url?: string;  // NEW: for both_characters
}
```

### Image URLs Array Builder

```typescript
// In roleplay-chat/index.ts
const buildImageUrlsArray = (
  sceneStyle: string,
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

## Database Schema Reference

### scenes Table (Templates)

| Column | Required for Multi-Ref |
|--------|------------------------|
| preview_image_url | **YES** - serves as Figure 1 |
| scene_prompt | YES - scene description |
| content_rating | YES - determines template |

### characters Table

| Column | Required for Multi-Ref |
|--------|------------------------|
| reference_image_url | YES - serves as Figure 2/3 |
| appearance_tags | Recommended - visual descriptors |

### character_scenes Table (Artifacts)

| Column | Purpose |
|--------|---------|
| previous_scene_image_url | I2I continuity |
| generation_mode | 't2i' or 'i2i' |
| generation_metadata | Stores Figure URLs used |

---

## Verification Checklist

1. **Model Selection:**
   - [ ] v4.5/edit selected when references exist
   - [ ] v4/t2i selected for no-reference scenes
   - [ ] Model has `max_images >= 3` for both_characters

2. **Reference Images:**
   - [ ] Scene template has preview_image_url
   - [ ] Character has reference_image_url
   - [ ] User character has reference_image_url (for both_characters)

3. **Prompt Construction:**
   - [ ] Figure notation correct (1, 2, 3 order)
   - [ ] Prompt under char_limit
   - [ ] Content tier correct (nsfw/sfw)

4. **UI Validation:**
   - [ ] both_characters disabled if user lacks reference
   - [ ] Toast notification explains requirement

---

## Related Documentation

- [FAL_AI_SEEDREAM_DEFINITIVE.md](./FAL_AI_SEEDREAM_DEFINITIVE.md) - API reference
- [../01-PAGES/07-ROLEPLAY/UX_SCENE.md](../01-PAGES/07-ROLEPLAY/UX_SCENE.md) - Scene UX spec
- [Seedream_model_guide.md](./Seedream_model_guide.md) - Model overview
