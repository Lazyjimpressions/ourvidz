
# Fix Scene Prompt: Narrative Truncation and ACTION Duplication

## Problem Summary

Two bugs produce the truncated/duplicated prompt sent to fal.ai:

1. **LLM narrative truncation**: The `generateSceneNarrativeWithOpenRouter` function produces a scene description that gets cut off mid-word (e.g., "...My") because the prompt template's `token_limit` or the OpenRouter call's `max_tokens` is too low.

2. **ACTION/POSE duplication**: In the multi-reference branch (line 3358 and 3364), `scenePrompt` is used for both `SCENE SETTING` and `ACTION/POSE`. The action should instead come from `sceneContext.actions` (the extracted character actions from the roleplay response).

## Fixes

### Fix 1: Use scene context actions for ACTION/POSE (not duplicate scenePrompt)

**File:** `supabase/functions/roleplay-chat/index.ts`

In the multi-reference prompt template (lines 3356-3371), replace `${scenePrompt}` on the ACTION/POSE line with the extracted action from `sceneContext.actions`. Apply the same fix for the non-multi-reference and POV branches (lines 3375-3403) which also duplicate `scenePrompt` in the ACTION field.

```
ACTION/POSE: ${sceneContext.actions?.[0] || 'Characters interacting naturally'}
```

This applies to all three template branches:
- `both_characters` with multi-reference (line 3364)
- `both_characters` without multi-reference (line 3381)
- `pov` (line 3397)
- `character_only` (line 3413)

### Fix 2: Investigate and increase narrative token limit

**Database:** Check the `prompt_templates` table for the `scene_narrative_generation` template's `token_limit`. If it's too low (e.g., under 200), increase it to allow complete narratives. This is a database update, not a code change.

### Deployment

Deploy `roleplay-chat` after code edits.
