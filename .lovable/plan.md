

# Remove CLIP Optimization and Seedream Branching -- All Scenes Are I2I

## Corrected Understanding

1. **All scenes are I2I.** Every scene and character has a reference image. There is no T2I path in normal operation. The user selects their I2I model in the UI before launching the scene.
2. **CLIP optimization is wrong.** CLIP's 77-token limit applies to SDXL/Stable Diffusion models that use a CLIP text encoder. The I2I models used in roleplay (Seedream v4/v4.5 edit via fal.ai) do NOT use CLIP tokenization -- they accept full text prompts up to 10,000 characters. The CLIP truncation code was written for an SDXL path that is no longer the primary flow.
3. **Prompt length should be governed by `prompt_templates.token_limit`**, which is already set per use case and model in the database (e.g., 2000 for scene iteration, 1000 for narrative generation). This limit controls how long the LLM-generated narrative can be. The image model then receives that narrative in full -- no post-hoc truncation.
4. **The Seedream vs non-Seedream branching is unnecessary.** Since the user picks the I2I model, the edge function should build one unified prompt structure. The `[PRESERVE]/[CHANGE]` vs `[SCENE CHANGE]/[CONTINUITY]` split creates two divergent paths for what should be one flow.

## What the Docs Say (Confirmed)

Per `ROLEPLAY_SCENE_GENERATION.md`:
- First scene: I2I with `[scene_preview_image, character_reference]` (and optionally user_reference)
- Subsequent scenes: I2I with `[previous_scene_image, character_reference]` (and optionally user_reference)
- Prompt validated against `capabilities.char_limit` (default 10,000) -- NOT CLIP tokens
- Figure notation (Figure 1/2/3) is the standard prompt structure for all I2I scenes

The CLIP optimization contradicts this entirely. It was a leftover from the SDXL/Replicate era.

## Changes

### File: `supabase/functions/roleplay-chat/index.ts`

**1. Remove `isSeedreamEdit` detection and all if/else branching (lines 3286-3396)**

Replace the entire dual-path prompt construction with a single unified path that:
- Uses Figure notation for all I2I scenes (matching the docs)
- For `both_characters` with multi-reference: Figure 1 (scene), Figure 2 (character), Figure 3 (user)
- For `character_only`/`pov`: Figure 1 (scene), Figure 2 (character)
- Includes the full `scenePrompt` without any truncation
- Uses `characterVisualDescription` as fallback when `appearance_tags` is empty

**2. Remove CLIP optimization block (lines 3452-3476)**

Replace:
```
if (isSeedreamEdit) {
  // Seedream path with 10k char limit
} else {
  // CLIP optimization to 247 chars
}
```
With:
```
// Use the prompt as-is. Length is governed by the prompt_template token_limit
// which controls LLM narrative generation. The image model accepts full text.
// Only truncate if exceeding model's char_limit from capabilities (default 10,000).
const charLimit = imageModelConfig?.capabilities?.char_limit || 10000;
if (enhancedScenePrompt.length > charLimit) {
  optimizedPrompt = enhancedScenePrompt.substring(0, charLimit);
  console.log('Prompt truncated to model char_limit:', charLimit);
} else {
  optimizedPrompt = enhancedScenePrompt;
}
```

**3. Delete dead CLIP helper functions (lines ~4758-5000+)**

Remove these functions entirely:
- `optimizePromptForCLIP` (~200 lines)
- `estimateCLIPTokens`
- `extractActionPhrases`
- `extractEssentialSetting`
- `extractVisualTagsOnly`

These are ~370 lines of dead code that only applied to the SDXL/CLIP path.

**4. Fix empty character identity fallback (line 3313)**

Change:
```typescript
const briefCharacterIdentity = `${character.name}, ${(character.appearance_tags || []).slice(0, 3).join(', ')}`;
```
To:
```typescript
const briefCharacterIdentity = `${character.name}, ${(character.appearance_tags || []).slice(0, 3).join(', ') || characterVisualDescription}`;
```

Same fix for the `userCharacter` identity lines (3326, 3364).

**5. Remove T2I else branches (lines 3397-3448)**

The `else if` and `else` blocks after the I2I block handle a "T2I mode" that shouldn't exist in normal operation. These produce prompts like `"Generate a scene showing..."` which is a T2I text prompt, not an I2I Figure-notation prompt. Since all scenes have references and use I2I, these branches should either be removed or converted to the same Figure notation structure as a safety fallback.

## What Stays

- **Sanitization** (`sanitizePromptForFalAI`): This stays -- it handles content policy word replacements, not truncation.
- **Scene Narrative Cleanup** (lines 2434-2475): This stays -- it cleans LLM-generated narratives of unwanted formatting artifacts.
- **`prompt_templates` token limits**: These stay and remain the authoritative control on how long the LLM generates scene narratives.
- **`generation_metadata.original_scene_prompt`**: Already stores the full prompt at line 3198 -- with CLIP removed, this will now actually be the full prompt that reaches the model.

## Files to Change

| File | Change |
|---|---|
| `supabase/functions/roleplay-chat/index.ts` | Remove isSeedreamEdit branching, remove CLIP optimization, delete ~370 lines of dead CLIP helpers, fix empty appearance_tags fallback, unify prompt to Figure notation for all I2I scenes |

## Result

- All scene prompts use one unified Figure-notation structure
- Full prompt text reaches the image model (governed only by `prompt_templates.token_limit` upstream and `capabilities.char_limit` downstream)
- `original_scene_prompt` in metadata preserves the full text for the scene edit modal
- ~370 lines of dead CLIP code removed
- No model-specific branching -- the I2I model selected by the user in the UI is used as-is

