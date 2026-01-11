# Prompt Design Audit - I2I Scene Continuity

**Date:** 2026-01-11  
**Issue:** Scene modifications not maintaining clothing consistency (blouse → shirt)

## Problem Analysis

### User's Example Prompt (from fal.ai input):
```
"Generate a scene showing Maggie (fresh faced young adult young adult female who is always curious and engaging., freckles across nose and cheeks, sun-kissed skin, fresh-faced, playful, white tank top, blond hair with pig tails) and Jon (1boy, handsome man, tall, curly hair, sweat pants, athletic build, college student, casual style, t-shirt) together, two people, couple, facing each other, in the following scenario: *Maintain the same character identity, Maggie, the secretary, and Jon, her colleague, remain in the office, with Maggie still leaning against the desk, her posture slightly adjusted to reflect the subtle change in their dynamic.* The room is bathed in the same warm, evening light from the cityscape outside, *keeping the same lighting and environment* to maintain visual continuity. Maggie's skirt is still neatly adjusted, and her hair is casually tucked behind her ear, a small detail that adds to the intimacy of the moment. Jon stands close to her, his presence filling the space with a palpable tension. As Maggie leans in closer, *subtle change* her arms are now wrapped around Jon's neck, drawing him into a more. Both characters should maintain their distinctive appearances. Composition: two people interacting."
```

### Issues Identified:

1. **Character Description Inconsistency**:
   - Character description says: "white tank top"
   - Scenario says: "Maggie's skirt is still neatly adjusted"
   - **Problem**: Conflicting clothing descriptions confuse the model

2. **Asterisk Usage**:
   - Uses `*Maintain the same character identity*`, `*keeping the same lighting and environment*`, `*subtle change*`
   - **Problem**: Asterisks might be interpreted as markdown or ignored by the model

3. **Redundant "Maintain" Phrases**:
   - Template says: "Maintain the same character identity, clothing state, lighting, and environment"
   - Prompt repeats: "Maintain the same character identity", "keeping the same lighting and environment"
   - **Problem**: For I2I, the image already shows what to maintain - we should focus on what CHANGES

4. **Prompt Length**:
   - Very long prompt with redundant information
   - **Problem**: CLIP token limit (77 tokens) may truncate important details

5. **Incomplete Prompt**:
   - Ends with "drawing him into a more" (cut off)
   - **Problem**: Incomplete instructions

6. **I2I Prompt Design Flaw**:
   - For I2I, the reference image already shows what to maintain
   - The prompt should focus on WHAT CHANGES, not what stays the same
   - **Problem**: Current template emphasizes "maintain" which is redundant for I2I

## Current Template Analysis

**Scene Iteration - NSFW Template:**
```
"Continue the scene with visual continuity. Maintain the same character identity, clothing state, lighting, and environment from the previous scene. Make subtle changes that progress the narrative while preserving visual consistency. Use explicit but tasteful language appropriate for adult content. Always include phrases like \"maintain the same character identity\", \"keep the same lighting and environment\", and \"subtle change\" to ensure continuity."
```

**Problems:**
1. Emphasizes "maintain" which is redundant for I2I (image already shows this)
2. Requires specific phrases that may not be optimal for the model
3. Doesn't emphasize what should CHANGE

## Recommended Fixes

### Fix 1: Update Scene Iteration Template
**Current:** Emphasizes "maintain" everything
**Recommended:** Focus on what CHANGES while preserving visual identity

**New Template:**
```
"Continue the scene with visual continuity. The reference image shows the current state - preserve character appearance, clothing, lighting, and environment. Describe ONLY the changes that progress the narrative: new positions, actions, expressions, or interactions. Be specific about what changes while keeping everything else identical to the reference image. Use explicit but tasteful language appropriate for adult content."
```

### Fix 2: Improve Prompt Construction
**Current:** Character description + full scenario with redundant "maintain" phrases
**Recommended:** 
- Character description should match what's in the reference image
- Scenario should focus on what CHANGES
- Remove asterisks
- Remove redundant "maintain" phrases (I2I already maintains)

### Fix 3: Character Description Consistency
**Problem:** Character description says "white tank top" but scenario says "skirt"
**Fix:** 
- For I2I, character description should describe what's in the reference image
- Or, if clothing changed, explicitly state the new clothing in the scenario

### Fix 4: CLIP Optimization
**Current:** `optimizePromptForCLIP` may be truncating important details
**Recommended:** 
- Prioritize: character appearance → what changes → scenario
- Remove redundant phrases
- Ensure clothing descriptions are consistent

## Implementation Plan

1. **Update Scene Iteration Templates** (NSFW and SFW)
   - Focus on changes, not maintenance
   - Remove requirement for specific phrases
   - Emphasize specificity about what changes

2. **Improve Prompt Construction Logic**
   - For I2I: Character description should match reference image
   - Scenario should focus on changes only
   - Remove asterisks and redundant phrases

3. **Enhance CLIP Optimization**
   - Preserve character appearance (especially clothing)
   - Preserve what changes
   - Remove redundant "maintain" phrases

4. **Add Clothing State Tracking**
   - Track clothing in scene metadata
   - Use tracked clothing in character description for I2I
   - Ensure consistency between character description and scenario
