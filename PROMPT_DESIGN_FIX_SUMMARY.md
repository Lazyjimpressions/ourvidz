# Prompt Design Fix Summary - I2I Scene Continuity

**Date:** 2026-01-11  
**Issue:** Clothing inconsistency (blouse → shirt) in I2I scene modifications

## Root Cause

The prompt design has several issues that cause clothing inconsistency:

1. **Redundant "Maintain" Phrases**: For I2I, the reference image already maintains visual elements, but the prompt repeats "maintain the same character identity, clothing state, lighting, and environment" which wastes tokens and may confuse the model.

2. **Character Description vs Scenario Mismatch**: Character description says "white tank top" but scenario says "Maggie's skirt" - conflicting information.

3. **Asterisks for Emphasis**: Uses `*Maintain the same character identity*` which may be ignored or misinterpreted.

4. **Template Design**: Current template emphasizes "maintain" which is redundant for I2I - should focus on WHAT CHANGES.

## Fixes Implemented

### 1. Updated Prompt Construction (Code Changes)
**File:** `supabase/functions/roleplay-chat/index.ts`

- **Line 2723**: For I2I scenes, removed redundant "Both characters should maintain their distinctive appearances" phrase
- **Line 2733**: For I2I scenes, removed redundant "The character should maintain their distinctive appearance" phrase
- **Line 2428-2443**: Added cleanup logic to remove asterisks and redundant "maintain" phrases from generated narrative

### 2. Template Updates (SQL Required)
**Action Required:** Run the following SQL in Supabase SQL Editor:

```sql
-- Update Scene Iteration - NSFW template
UPDATE prompt_templates
SET system_prompt = 'Continue the scene with visual continuity. The reference image shows the current state - preserve character appearance, clothing, lighting, and environment exactly as shown. Describe ONLY the changes that progress the narrative: new positions, actions, expressions, or interactions. Be specific and concise about what changes while keeping everything else identical to the reference image. Do not repeat what is already visible in the reference image. Use explicit but tasteful language appropriate for adult content.'
WHERE template_name = 'Scene Iteration - NSFW';

-- Update Scene Iteration - SFW template
UPDATE prompt_templates
SET system_prompt = 'Continue the scene with visual continuity. The reference image shows the current state - preserve character appearance, clothing, lighting, and environment exactly as shown. Describe ONLY the changes that progress the narrative: new positions, actions, expressions, or interactions. Be specific and concise about what changes while keeping everything else identical to the reference image. Do not repeat what is already visible in the reference image.'
WHERE template_name = 'Scene Iteration - SFW';

-- Verify updates
SELECT template_name, system_prompt 
FROM prompt_templates 
WHERE template_name LIKE 'Scene Iteration%';
```

**Key Changes:**
- Removed requirement for specific phrases like "maintain the same character identity"
- Emphasizes "Describe ONLY the changes"
- Explicitly states "Do not repeat what is already visible"
- Focuses on specificity about what changes

## Expected Results

After these fixes:

1. **Better Clothing Consistency**: Character description and scenario will be more aligned
2. **More Focused Prompts**: I2I prompts will focus on changes, not redundant maintenance
3. **Cleaner Output**: Asterisks and redundant phrases removed from generated narratives
4. **Better Token Usage**: More tokens available for important details (clothing, actions)

## Testing Plan

1. Generate a scene with specific clothing (e.g., blouse)
2. Modify the scene with a new prompt
3. Verify clothing is maintained in the next scene
4. Check that only specified changes occur

## Additional Recommendations

### Future Enhancements:

1. **Clothing State Tracking**: Track clothing in scene metadata and use it in character description for I2I
2. **Character Description Consistency**: For I2I, extract clothing from previous scene or use generic description
3. **CLIP Optimization**: Enhance to prioritize clothing/appearance preservation

See `PROMPT_DESIGN_RECOMMENDATIONS.md` for detailed analysis and future improvements.
