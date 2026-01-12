# Scene Image Character Accuracy Fix

**Date:** 2026-01-10
**Status:** Fixed
**Priority:** HIGH

---

## Problem

Initial scene images were conflating characters with generic descriptions from scene templates. For example, "late night at office" scene showed "busty secretary" instead of the actual character (Maggie) with her specific visual description.

**Example Issue:**
- Scene Template Prompt: "Late-night office setting, dim lighting, busty secretary in professional attire..."
- Character: Maggie (with specific visual description)
- Generated Prompt: "Maggie Late-night office setting, dim lighting, busty secretary..."
- **Result:** Image shows generic "busty secretary" instead of Maggie's actual appearance

---

## Root Cause

When using scene template prompts for the first scene:
1. Template prompts contain generic character descriptions (e.g., "busty secretary", "attractive woman")
2. Code was only prepending character name without replacing generic descriptions
3. Character's actual visual description wasn't being used
4. Enhanced scene prompt was duplicating character info that was already in the template prompt

---

## Solution

### 1. Replace Generic Character Descriptions ✅

**Logic:**
- Detect generic character descriptions in template prompts (e.g., "busty secretary", "attractive woman")
- Replace them with the actual character's visual description from `buildCharacterVisualDescription()`
- If character name already in prompt, just replace generic description
- If character name not in prompt, add character name + visual description

**Patterns Detected:**
- `(busty|curvy|attractive|beautiful|sexy|hot|gorgeous) (secretary|woman|girl|person|character|individual)`
- `(secretary|woman|girl|person|character|individual) (in|with|wearing|dressed)`
- `(professional|business|office) (woman|girl|person|character|individual)`

### 2. Prevent Duplication in Enhanced Prompt ✅

**Logic:**
- Check if `scenePrompt` already includes character name and visual description
- If yes, use prompt directly without adding character info again
- If no, add character name and visual description as before

**Before:**
```typescript
// scenePrompt: "Maggie (her visual description), Late-night office setting..."
// enhancedScenePrompt: "Generate a scene showing Maggie, (her visual description), in the following scenario: Maggie (her visual description), Late-night office setting..."
// ❌ Duplication!
```

**After:**
```typescript
// scenePrompt: "Maggie (her visual description), Late-night office setting..."
// enhancedScenePrompt: "Generate a scene in the following scenario: Maggie (her visual description), Late-night office setting..."
// ✅ No duplication!
```

---

## Implementation

### Template Prompt Processing

```typescript
// Replace generic descriptions
processedPrompt = processedPrompt.replace(pattern, (match) => {
  if (hasCharacterName) {
    return characterVisualDescription; // Just replace generic description
  }
  return `${character.name} (${characterVisualDescription})`; // Add character + description
});
```

### Enhanced Prompt Building

```typescript
// Check if character info already in prompt
const hasCharacterInPrompt = scenePromptLower.includes(character.name.toLowerCase());
const hasVisualDescInPrompt = scenePromptLower.includes(characterVisualDescription.substring(0, 30).toLowerCase());

if (hasCharacterInPrompt && hasVisualDescInPrompt) {
  // Use prompt directly, don't add character info again
  enhancedScenePrompt = `Generate a scene in the following scenario: ${scenePrompt}.`;
} else {
  // Add character info
  enhancedScenePrompt = `Generate a scene showing ${character.name}, ${characterVisualDescription}, in the following scenario: ${scenePrompt}.`;
}
```

---

## Expected Results

### Before
- Template: "Late-night office setting, dim lighting, busty secretary in professional attire..."
- Generated: "Maggie Late-night office setting, dim lighting, busty secretary..."
- **Image:** Generic "busty secretary" (wrong character) ❌

### After
- Template: "Late-night office setting, dim lighting, busty secretary in professional attire..."
- Processed: "Maggie (her actual visual description), Late-night office setting, dim lighting, professional attire..."
- **Image:** Maggie with her actual appearance (correct character) ✅

---

## Testing

### Test Case 1: Generic Description in Template
- Template: "busty secretary in professional attire"
- Character: Maggie (specific visual description)
- **Expected:** "Maggie (her visual description), professional attire"
- **Verify:** Image shows Maggie, not generic secretary

### Test Case 2: Character Name Already in Template
- Template: "Maggie in late-night office setting"
- Character: Maggie (specific visual description)
- **Expected:** "Maggie (her visual description) in late-night office setting"
- **Verify:** Image shows Maggie with correct description

### Test Case 3: No Generic Description
- Template: "Late-night office setting, dim lighting"
- Character: Maggie (specific visual description)
- **Expected:** "Maggie (her visual description), Late-night office setting, dim lighting"
- **Verify:** Image shows Maggie with correct description

---

## Files Modified

1. `supabase/functions/roleplay-chat/index.ts`
   - Enhanced template prompt processing to replace generic descriptions
   - Added duplication check in enhanced prompt building

---

## Related Documentation

- [SCENE_TEMPLATE_PROMPT_FIX.md](./SCENE_TEMPLATE_PROMPT_FIX.md) - Template prompt usage fix
- [SCENE_CONTEXT_EXTRACTION_FIX.md](./SCENE_CONTEXT_EXTRACTION_FIX.md) - Context extraction improvements

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-10 | Fix character accuracy in scene images by replacing generic descriptions | Claude |
