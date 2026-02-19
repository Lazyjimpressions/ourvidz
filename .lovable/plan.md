

# Redesign: Always-I2I Scene Generation with Multi-Reference Composition

## Problem Summary

The current scene generation logic has three structural problems:

1. **T2I fallback paths still exist** -- When no template preview image is available for a first scene, or when the prompt override has no current scene image, the system falls to `generationMode = 't2i'`. Per requirements, roleplay should **never** use T2I since there is always a scene image, character image, and user image available.

2. **Character degradation on continuation scenes** -- For `character_only` and `pov` continuation scenes, the code sends a single `image_url` (the previous scene) to the I2I model. The character reference image is NOT included in the input array. Over multiple turns, the character's appearance drifts because each iteration only references the last output, not the original character reference.

3. **Prompt structure is over-engineered and noisy** -- The scene prompt goes through multiple transformation stages (narrative LLM call, action extraction, template replacement, critical constraints injection, sanitization) producing verbose, instruction-heavy prompts. The final prompt should focus on what the image should depict -- grounded in the most recent conversation action -- not lengthy rules about what NOT to do.

## Architecture: Always-I2I with Figure Arrays

### Core Principle

Every scene generation call sends an `image_urls` array (never a single `image_url`). This ensures the I2I model always has:
- **Figure 1**: Scene environment (previous scene image OR template preview OR character avatar as last resort)
- **Figure 2**: AI character reference (original `reference_image_url` or `image_url`)
- **Figure 3**: User character reference (for `both_characters` style only)

The character reference images are ALWAYS included as anchors, preventing drift.

```text
Current flow (broken):
  First scene + no template preview --> T2I (no references)
  Continuation (character_only)     --> single image_url = previous scene (character drifts)
  Continuation (both_characters)    --> image_urls = [scene, char, user] (correct)

Proposed flow (always I2I):
  First scene (any style)           --> image_urls = [scene_env, char_ref, ?user_ref]
  Continuation (any style)          --> image_urls = [prev_scene, char_ref, ?user_ref]
  Modification                      --> image_urls = [current_scene, char_ref, ?user_ref]
```

### Figure 1 Resolution (Scene Environment)

Priority chain for the scene environment anchor:

1. `currentSceneImageUrl` (modification mode -- editing an existing scene)
2. `verifiedPreviousSceneImageUrl` (continuation -- previous scene in conversation)
3. `templatePreviewImageUrl` (first scene from a scene template)
4. `character.reference_image_url` or `character.image_url` (absolute fallback -- uses character portrait as scene base)

Since characters always have at least an `image_url` (avatar), Figure 1 is never null. T2I is never needed.

## Changes

### File: `supabase/functions/roleplay-chat/index.ts`

#### 1. Eliminate T2I generation mode entirely

Replace the generation mode decision tree (lines ~2512-2557) with a simplified always-I2I version:

- Remove `generationMode = 't2i'` branches
- Always set `generationMode = 'i2i'` and `useI2IIteration = true`
- Resolve `effectiveReferenceImageUrl` using the priority chain above
- Remove the `canUseI2I` guard and the "falling back to T2I" warning

#### 2. Always build `image_urls` array (never single `image_url`)

Replace the fal.ai request body construction (lines ~3769-3860) to always build an `image_urls` array:

- For `character_only` / `pov`: `[sceneEnvImage, characterRefImage]` (2 images)
- For `both_characters`: `[sceneEnvImage, characterRefImage, userRefImage]` (3 images)
- Remove the single `image_url` + `strength` fallback path entirely
- Always use the I2I model (v4.5/edit or user-selected I2I model)

#### 3. Simplify prompt construction

The enhanced scene prompt (lines ~3264-3361) is already structured with Figure notation, which is correct. The main change is:

- Remove verbose "RULES" / "COMPOSITION RULES" blocks -- the model understands Figure notation natively
- Make ACTION/POSE the primary content: populate it from `sceneContext.actions` (extracted from the most recent AI response), NOT from the narrative LLM output
- Keep character identity brief: just name + top 3-5 appearance tags
- Total prompt target: under 500 chars for Seedream edit models

#### 4. Simplify narrative LLM usage

The narrative LLM call (lines ~2996-3049) currently generates a full scene description that gets embedded into Figure 1's SCENE field. This is redundant when we already have:
- `sceneContext.actions` extracted from the AI response
- `sceneContext.setting` and `sceneContext.mood` from the scene analyzer

Change: Skip the narrative LLM call entirely. Build the SCENE field directly from `sceneContext` data. The actions extracted from the AI response are the most accurate representation of what should change in the scene.

#### 5. Remove all SDXL fallback paths

Remove the ~6 SDXL `queue-job` fallback invocations scattered throughout the function (lines 3414-3446, 3457-3483, 3494-3524, 3912-3949, 3955-3990). These are dead code for roleplay since we always use fal.ai I2I models.

#### 6. Remove model resolution for T2I task

The model selection logic (lines ~3057-3103) currently branches between `generation` (T2I) and `style_transfer` (I2I) tasks. Since roleplay always uses I2I, simplify to always query for `style_transfer` task.

### Prompt Template (Simplified)

The new prompt structure for all scenes:

```
In the setting from Figure 1, show the character from Figure 2.

SCENE (Figure 1): [setting from sceneContext or template]

CHARACTER (Figure 2): [name], [top appearance tags]

ACTION: [most recent actions from AI response]
```

For `both_characters`:
```
In the setting from Figure 1, show two people together.

SCENE (Figure 1): [setting]

CHARACTER 1 (Figure 2): [AI character name], [appearance]

CHARACTER 2 (Figure 3): [User character name], [appearance]

ACTION: [most recent actions]
```

For `pov`:
```
In the setting from Figure 1, show the character from Figure 2, from a first-person POV.

SCENE (Figure 1): [setting]

CHARACTER (Figure 2): [name], [appearance], looking at viewer

ACTION: [most recent actions]
```

No additional rules, constraints, or composition instructions. The Figure notation and reference images handle consistency; the prompt handles content.

## What This Fixes

| Issue | Before | After |
|-------|--------|-------|
| T2I fallback | 3+ code paths fall to T2I | T2I eliminated; always I2I |
| Character drift | Continuation uses single previous scene image | Every call includes original character reference as Figure 2 |
| Prompt bloat | 800+ char prompts with rules/constraints | Under 500 chars, action-focused |
| SDXL fallback | 6 dead-code SDXL paths | Removed |
| Narrative LLM latency | Extra LLM call for scene description | Skipped; uses extracted actions directly |

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/roleplay-chat/index.ts` | Eliminate T2I, always build image_urls array, simplify prompts, remove SDXL fallbacks |

## No Database Changes

No schema or migration changes needed. The `generation_mode` column in `character_scenes` will simply always be `'i2i'` going forward.

