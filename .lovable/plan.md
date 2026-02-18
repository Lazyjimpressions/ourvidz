

# Image Analysis Edge Function (`describe-image`) -- Updated Plan

## Overview

Create a `describe-image` edge function with three output modes (caption, detailed, structured) and **fully dynamic model resolution** from the `api_models` table -- no hardcoded model keys. The structured mode maps directly to the `characters` table fields (`appearance_tags`, `physical_traits`, `personality_traits`, `traits`, `voice_tone`, etc.) so results can be merged into the Character Studio without transformation.

## Database Changes

### 1. Add `vision` to the task check constraint (if one exists)

No check constraint was found on the `task` column, so no migration is needed for that. Only a data insert is required.

### 2. Insert vision model row

```sql
INSERT INTO api_models (
  provider_id, model_key, display_name,
  modality, task, model_family,
  is_active, is_default, default_for_tasks, priority,
  input_defaults, capabilities
) VALUES (
  (SELECT id FROM api_providers WHERE name = 'openrouter'),
  'google/gemini-2.5-flash-preview-05-20:free',
  'Gemini 2.5 Flash (Vision)',
  'chat', 'vision', 'gemini',
  true, true, ARRAY['vision'], 10,
  '{"max_tokens": 1000, "temperature": 0.3}'::jsonb,
  '{"supports_vision": true, "supports_image_url": true, "input_schema": {"image_url": {"type": "string"}, "mode": {"type": "string", "enum": ["caption","detailed","structured"]}}}'::jsonb
);
```

This makes the model resolvable via `.contains('default_for_tasks', ['vision'])`, consistent with all other edge functions.

## Dynamic Model Resolution (no hardcoding)

The function resolves the vision model using the **exact same pattern** as `enhance-prompt` and `character-suggestions`:

```text
Priority: model_id param > model_key param > DB default (.contains('default_for_tasks', ['vision'])) > error
```

No hardcoded model key anywhere in the function. If no model is found in the database, the function returns an error rather than silently falling back to a stale key.

## Edge Function: `supabase/functions/describe-image/index.ts`

### Request

```typescript
interface DescribeImageRequest {
  image_url: string;                              // Public URL or signed URL
  mode: 'caption' | 'detailed' | 'structured';
  context?: string;                               // Hint: "character portrait", "landscape"
  original_prompt?: string;                        // For fidelity scoring
  content_rating?: 'sfw' | 'nsfw';
  model_id?: string;                              // Override: UUID from api_models
  model_key?: string;                             // Override: model_key string
}
```

### Response by Mode

**Mode (a) -- Caption:**
```json
{
  "success": true,
  "mode": "caption",
  "caption": "A woman with long auburn hair stands in a sunlit garden wearing a white dress.",
  "model_used": "google/gemini-2.5-flash-preview-05-20:free",
  "model_display_name": "Gemini 2.5 Flash (Vision)",
  "processing_time_ms": 1230
}
```

**Mode (b) -- Detailed:**
```json
{
  "success": true,
  "mode": "detailed",
  "description": "The image depicts a young woman with striking auburn hair cascading past her shoulders...",
  "model_used": "...",
  "model_display_name": "...",
  "processing_time_ms": 1500
}
```

**Mode (c) -- Structured (character-trait-compatible):**

The structured output maps directly to `characters` table columns so the frontend can merge without transformation:

```json
{
  "success": true,
  "mode": "structured",
  "analysis": {
    "appearance_tags": ["auburn hair", "green eyes", "fair skin", "white dress", "slender build"],
    "physical_traits": {
      "hair_color": "auburn",
      "hair_style": "long, wavy",
      "eye_color": "green",
      "body_type": "slender",
      "skin_tone": "fair",
      "height": "average",
      "distinctive_features": "freckles across nose and cheeks"
    },
    "personality_traits": {
      "demeanor": "serene",
      "energy": "calm",
      "expression": "gentle smile"
    },
    "traits": "serene, gentle, contemplative",
    "voice_tone": "soft and warm",
    "description": "A slender young woman with long wavy auburn hair and green eyes...",
    "gender": "female",
    "style_preset": "photorealistic",
    "composition": {
      "setting": "outdoor garden",
      "lighting": "natural sunlight, golden hour",
      "camera_angle": "medium shot",
      "mood": "serene, warm"
    },
    "scores": {
      "overall_quality": 8,
      "technical_quality": 7,
      "composition": 8,
      "prompt_fidelity": 9,
      "detail_level": 7
    },
    "prompt_alignment_notes": "Strong match to prompt..."
  },
  "model_used": "...",
  "model_display_name": "...",
  "processing_time_ms": 2100
}
```

The `scores` and `prompt_alignment_notes` fields are only populated when `original_prompt` is provided. The character fields (`appearance_tags`, `physical_traits`, `personality_traits`, `traits`, `voice_tone`, `gender`, `description`) are always populated in structured mode.

### Implementation Logic

```text
1. Parse + validate request (image_url required, mode defaults to 'structured')
2. Resolve vision model dynamically:
   a. If model_id provided -> query by id
   b. Else if model_key provided -> query by model_key
   c. Else -> query .contains('default_for_tasks', ['vision'])
   d. If nothing found -> return 400 error "No vision model configured"
3. Read OpenRouter API key from provider's secret_name (via api_providers join)
4. Build mode-specific system prompt with JSON schema guidance
5. Send multimodal request to OpenRouter:
   messages: [
     { role: 'system', content: systemPrompt },
     { role: 'user', content: [
       { type: 'text', text: userPrompt },
       { type: 'image_url', image_url: { url: imageUrl } }
     ]}
   ]
6. Parse response (JSON for structured, text for caption/detailed)
7. Return formatted response with model attribution
```

### Model Resolution Function (reusable pattern)

```typescript
async function resolveVisionModel(
  modelId?: string,
  modelKey?: string
): Promise<{ model_key: string; display_name: string; input_defaults: Record<string, unknown> }> {
  let query = supabase
    .from('api_models')
    .select('model_key, display_name, input_defaults, api_providers!inner(name, secret_name)')
    .eq('is_active', true);

  if (modelId) {
    query = query.eq('id', modelId);
  } else if (modelKey) {
    query = query.eq('model_key', modelKey);
  } else {
    query = query.contains('default_for_tasks', ['vision']);
  }

  const { data, error } = await query.order('priority', { ascending: false }).limit(1).single();

  if (error || !data) {
    throw new Error('No vision model configured. Add a model with default_for_tasks containing "vision".');
  }

  return data;
}
```

## Config Update

Add to `supabase/config.toml`:

```toml
[functions.describe-image]
verify_jwt = false
```

## Frontend Type Update

In `src/hooks/useApiModels.ts`, add `'vision'` to the `task` union type in the `ApiModel` interface:

```typescript
task: 'generation' | 'style_transfer' | 'upscale' | 'roleplay' | 'reasoning' | 'enhancement' | 'embedding' | 'vision';
```

## Character Trait Field Mapping

The structured output schema is designed to map 1:1 to the `characters` table columns:

| Structured Output Field | Characters Table Column | Type |
|------------------------|------------------------|------|
| `appearance_tags` | `appearance_tags` | `text[]` |
| `physical_traits` | `physical_traits` | `jsonb` |
| `personality_traits` | `personality_traits` | `jsonb` |
| `traits` | `traits` | `text` |
| `voice_tone` | `voice_tone` | `varchar` |
| `description` | `description` | `text` |
| `gender` | `gender` | `text` |
| `style_preset` | `style_preset` | `text` |

This means the frontend can do a direct spread-merge of the analysis object into the character form state, e.g.:
```typescript
const { analysis } = await describeImage({ image_url, mode: 'structured' });
setCharacter(prev => ({ ...prev, ...analysis }));
```

## No New Secrets Required

Uses `OpenRouter_Roleplay_API_KEY` (already configured) since the model is on OpenRouter.

## Files Changed

| File | Change |
|------|--------|
| Database (data insert) | New `api_models` row for Gemini 2.5 Flash with `default_for_tasks: ['vision']` |
| `supabase/functions/describe-image/index.ts` | New edge function with dynamic model resolution |
| `supabase/config.toml` | Add `[functions.describe-image]` |
| `src/hooks/useApiModels.ts` | Add `'vision'` to task type union |

## Integration Points (built later, not in this PR)

1. **Character Studio**: "Extract from Image" button on reference image upload calls `describe-image` with `mode: 'structured'`, merges result into character form.
2. **Quality Scoring Pipeline**: Post-generation hook calls `describe-image` with `mode: 'structured'` + `original_prompt`, stores `scores` in `jobs.metadata.quality_scores`.

