# Prompt Design Recommendations for I2I Scene Continuity

**Date:** 2026-01-11  
**Issue:** Clothing inconsistency (blouse → shirt) in I2I scene modifications

## Root Cause Analysis

### Current Prompt Structure (from user's example):
```
"Generate a scene showing Maggie (fresh faced young adult young adult female who is always curious and engaging., freckles across nose and cheeks, sun-kissed skin, fresh-faced, playful, white tank top, blond hair with pig tails) and Jon (1boy, handsome man, tall, curly hair, sweat pants, athletic build, college student, casual style, t-shirt) together, two people, couple, facing each other, in the following scenario: *Maintain the same character identity, Maggie, the secretary, and Jon, her colleague, remain in the office, with Maggie still leaning against the desk, her posture slightly adjusted to reflect the subtle change in their dynamic.* The room is bathed in the same warm, evening light from the cityscape outside, *keeping the same lighting and environment* to maintain visual continuity. Maggie's skirt is still neatly adjusted, and her hair is casually tucked behind her ear, a small detail that adds to the intimacy of the moment. Jon stands close to her, his presence filling the space with a palpable tension. As Maggie leans in closer, *subtle change* her arms are now wrapped around Jon's neck, drawing him into a more. Both characters should maintain their distinctive appearances. Composition: two people interacting."
```

### Critical Issues:

1. **Character Description vs Scenario Mismatch**:
   - Character description: "white tank top"
   - Scenario: "Maggie's skirt is still neatly adjusted"
   - **Impact**: Model is confused about what clothing to maintain

2. **Redundant "Maintain" Instructions for I2I**:
   - I2I already maintains visual elements from the reference image
   - Prompt says "Maintain the same character identity", "keeping the same lighting and environment"
   - **Impact**: Wastes tokens on redundant instructions, may confuse model about what to change

3. **Asterisks for Emphasis**:
   - Uses `*Maintain the same character identity*`, `*keeping the same lighting and environment*`, `*subtle change*`
   - **Impact**: Asterisks may be ignored or misinterpreted by the model

4. **Template Design Flaw**:
   - Current template: "Maintain the same character identity, clothing state, lighting, and environment"
   - **Problem**: For I2I, the image already shows what to maintain - we should focus on WHAT CHANGES

5. **Prompt Length & CLIP Token Limit**:
   - Very long prompt with redundant information
   - CLIP tokenizes and truncates after 77 tokens
   - **Impact**: Important details (like clothing) may be truncated

## Recommended Solutions

### Solution 1: Update Scene Iteration Template

**Current Template (Scene Iteration - NSFW):**
```
"Continue the scene with visual continuity. Maintain the same character identity, clothing state, lighting, and environment from the previous scene. Make subtle changes that progress the narrative while preserving visual consistency. Use explicit but tasteful language appropriate for adult content. Always include phrases like \"maintain the same character identity\", \"keep the same lighting and environment\", and \"subtle change\" to ensure continuity."
```

**Recommended Template:**
```
"Continue the scene with visual continuity. The reference image shows the current state - preserve character appearance, clothing, lighting, and environment exactly as shown. Describe ONLY the changes that progress the narrative: new positions, actions, expressions, or interactions. Be specific and concise about what changes while keeping everything else identical to the reference image. Do not repeat what is already visible in the reference image. Use explicit but tasteful language appropriate for adult content."
```

**Key Changes:**
- Removed redundant "maintain" phrases (I2I already maintains)
- Emphasizes "describe ONLY the changes"
- Explicitly states "Do not repeat what is already visible"
- Focuses on specificity about what changes

### Solution 2: Improve Prompt Construction for I2I

**Current Logic (line 2723):**
```typescript
enhancedScenePrompt = `Generate a scene showing ${character.name} (${characterVisualDescription}) and ${userCharacter.name} (${userVisualDescription}) together${styleTokensStr}, in the following scenario: ${scenePrompt}. Both characters should maintain their distinctive appearances. Composition: two people interacting.`;
```

**Recommended Logic for I2I:**
```typescript
if (useI2IIteration) {
  // For I2I: Character description should match reference image, scenario focuses on changes
  enhancedScenePrompt = `Generate a scene showing ${character.name} (${characterVisualDescription}) and ${userCharacter.name} (${userVisualDescription}) together${styleTokensStr}, in the following scenario: ${scenePrompt}. Composition: two people interacting.`;
  // Remove "maintain their distinctive appearances" - I2I already does this
} else {
  // For T2I: Keep current logic
  enhancedScenePrompt = `Generate a scene showing ${character.name} (${characterVisualDescription}) and ${userCharacter.name} (${userVisualDescription}) together${styleTokensStr}, in the following scenario: ${scenePrompt}. Both characters should maintain their distinctive appearances. Composition: two people interacting.`;
}
```

### Solution 3: Character Description Consistency for I2I

**Problem:** Character description may not match what's in the reference image

**Solution:** For I2I, extract clothing/appearance from previous scene or use a generic description that doesn't conflict

**Recommended Approach:**
1. For I2I scenes, if previous scene exists, extract clothing state from previous scene's metadata
2. Use that clothing state in character description
3. Or, use generic description without specific clothing items

### Solution 4: Remove Asterisks and Redundant Phrases

**Current:** Uses asterisks for emphasis, includes redundant "maintain" phrases
**Recommended:** 
- Remove all asterisks
- Remove redundant "maintain" phrases for I2I
- Keep only essential instructions

### Solution 5: Enhance CLIP Optimization

**Current:** `optimizePromptForCLIP` may truncate important details
**Recommended Priority:**
1. Character appearance (especially clothing) - MUST preserve
2. What changes (actions, positions) - MUST preserve
3. Scenario context - preserve if space allows
4. Remove redundant "maintain" phrases first

## Implementation Priority

1. **HIGH**: Update Scene Iteration templates (NSFW and SFW)
2. **HIGH**: Remove redundant "maintain" phrases from I2I prompts
3. **MEDIUM**: Improve character description consistency for I2I
4. **MEDIUM**: Remove asterisks from prompts
5. **LOW**: Enhance CLIP optimization to prioritize clothing/appearance

## Testing Plan

1. Generate a scene with specific clothing (e.g., blouse)
2. Modify the scene with new prompt
3. Verify clothing is maintained in the next scene
4. Check that only specified changes occur
