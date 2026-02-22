

# Canon Position Prompt Design

## Core Principle

One system prompt template in `prompt_templates` handles ALL canon position generation. Individual pose definitions live in the template's `metadata` JSONB column, making everything adjustable from the database without code changes.

## Why One Template Works

The [PRESERVE]/[CHANGE] structure is identical for every pose -- only the [CHANGE] block differs. The system prompt provides the wrapper; the metadata provides per-pose fragments.

## Database: prompt_templates Row

| Field | Value |
|-------|-------|
| template_name | Canon Position - Seedream v4.5 Edit |
| use_case | canon_position |
| content_mode | nsfw |
| target_model | fal-ai/bytedance/seedream/v4.5/edit |
| enhancer_model | qwen |
| job_type | image |
| is_active | true |
| description | Generates canonical character position references using I2I with Seedream v4.5 Edit. Pose-specific fragments in metadata. |

### system_prompt

The system prompt instructs the LLM enhancer to output a Seedream-optimized image prompt. It receives the character identity tags and the target pose as context:

```
You generate image prompts for Seedream v4.5 Edit (I2I) to create canonical character position references.

INPUT: You will receive the character's appearance tags and a target pose description.

RULES:
1. Output ONLY the image prompt. No commentary, no dialogue.
2. Always start with [PRESERVE] block to lock character identity
3. Follow with [CHANGE] block for the specific pose/angle
4. Keep prompts concise (under 80 words)
5. Use plain background/neutral environment unless pose requires context (e.g., seated needs a chair)
6. Do NOT add style tags, quality tags, or artistic direction -- the reference image handles style
7. Do NOT add negative prompts -- this model does not support them
8. Focus on body positioning, camera angle, and framing

OUTPUT FORMAT:
[PRESERVE] same character identity, face, hair, body type, clothing [CHANGE] {pose_description}
```

### metadata (JSONB)

Contains the pose preset map. Each key is the pose ID used by the frontend; each value has the prompt fragment, display label, auto-tags, and suggested reference strength.

```json
{
  "pose_presets": {
    "front_neutral": {
      "label": "Front",
      "prompt_fragment": "full body, standing, front view, neutral pose, arms relaxed at sides, looking at camera, plain background",
      "tags": ["front", "full-body", "standing"],
      "reference_strength": 0.8
    },
    "side_left": {
      "label": "Left Side",
      "prompt_fragment": "full body, standing, left side profile view, arms at sides, plain background",
      "tags": ["side", "full-body", "standing"],
      "reference_strength": 0.8
    },
    "side_right": {
      "label": "Right Side",
      "prompt_fragment": "full body, standing, right side profile view, arms at sides, plain background",
      "tags": ["side", "full-body", "standing"],
      "reference_strength": 0.8
    },
    "rear": {
      "label": "Rear",
      "prompt_fragment": "full body, standing, rear view, back facing camera, looking away, plain background",
      "tags": ["rear", "full-body", "standing"],
      "reference_strength": 0.8
    },
    "three_quarter": {
      "label": "3/4 View",
      "prompt_fragment": "full body, standing, three-quarter angle, slight turn, plain background",
      "tags": ["3/4", "full-body", "standing"],
      "reference_strength": 0.8
    },
    "bust": {
      "label": "Bust",
      "prompt_fragment": "upper body portrait, head and shoulders, front view, centered face, plain background",
      "tags": ["front", "half-body"],
      "reference_strength": 0.85
    }
  }
}
```

This means you can add, remove, or edit any pose from the database -- no code deployment needed.

## Negative Prompts: Confirmed Not Applicable

Seedream v4.5 (both T2I and Edit) has NO `negative_prompt` in its `input_schema`. The `negative_prompts` table is only used by SDXL models via `queue-job` and `replicate-image`. This is correct behavior -- no changes needed.

## How Generation Works

When a user clicks a pose preset button:

1. Frontend sends to `character-portrait` edge function with a new field: `canonPoseKey: "front_neutral"`
2. Edge function fetches the `canon_position` template from `prompt_templates`
3. Extracts the pose preset's `prompt_fragment` from `metadata.pose_presets[canonPoseKey]`
4. Builds the prompt using the template's [PRESERVE]/[CHANGE] structure:
   - [PRESERVE] block uses character's `appearance_tags` and `clothing_tags`
   - [CHANGE] block uses the `prompt_fragment`
5. Calls Seedream v4.5 Edit with the character's Style Lock as reference image
6. Auto-saves result to `character_canon` with the preset's auto-tags

No LLM enhancer is needed for the base poses (the fragments are pre-written). The `enhancer_model` field is set for future use with creative/custom poses where the user describes a pose in free text and needs it formatted.

## UI: Fixed Position Boxes at Top of Positions Tab

The top of the Positions page shows a fixed row of 6 boxes (one per base pose preset). These are NOT part of the scrollable grid below -- they are persistent slots that show:

- **Empty state**: Dashed border with the pose label (e.g., "Front", "Left Side"). Click to generate.
- **Filled state**: Thumbnail of the generated position with a subtle regenerate button overlay.
- **Generating state**: Spinner with progress indication.

Below the fixed boxes, the existing filterable grid shows all character canon images (base poses + user-uploaded + creative poses).

```text
+--------------------------------------------------+
| [Front] [Left] [Right] [Rear] [3/4] [Bust]      |  <- Fixed position slots
|  empty   empty  empty   empty  empty  empty       |
+--------------------------------------------------+
| Filter: [All] [Pose] [Outfit] [Style] [Position] |  <- Existing filter bar
+--------------------------------------------------+
| [img] [img] [img] [+ Upload]                     |  <- Scrollable grid
| [img] [img]                                       |
+--------------------------------------------------+
```

## Edge Function Changes: character-portrait

Add a new code path when `canonPoseKey` is present in the request body:

1. Fetch the `canon_position` template from `prompt_templates` WHERE `use_case = 'canon_position'` AND `target_model` matches
2. Look up `metadata.pose_presets[canonPoseKey]` for the prompt fragment
3. Build prompt: `[PRESERVE] same character identity, face: {appearance_tags joined}, clothing: {clothing_tags joined} [CHANGE] {prompt_fragment}`
4. Override `reference_strength` with the preset's value
5. After successful generation, auto-insert into `character_canon` with preset tags

## Files Changed

| File | Change |
|------|--------|
| **SQL migration** | INSERT into `prompt_templates` with `use_case = 'canon_position'`, system_prompt, and metadata containing pose_presets |
| `supabase/functions/character-portrait/index.ts` | Add `canonPoseKey` handling: fetch template, build [PRESERVE]/[CHANGE] prompt, auto-save to `character_canon` |
| `src/components/character-studio-v3/PositionsGrid.tsx` | Add fixed position slots row at top using preset data fetched from template metadata; wire generate callbacks |
| `src/hooks/useCharacterStudio.ts` | Add `fetchCanonPresets()` to load pose presets from the template metadata; add `generateCanonPosition(poseKey)` |
| `src/pages/CharacterStudioV3.tsx` | Wire preset generation callbacks |

## What This Does NOT Change

- Portraits tab generation flow (still uses hardcoded prompt building)
- Scene generation
- The existing `PosePresets.tsx` component (stays as-is for portrait quick-poses)
- No negative prompt logic anywhere

