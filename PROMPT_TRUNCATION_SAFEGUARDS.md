# Prompt Truncation Safeguards

**Date:** 2026-01-11  
**Purpose:** Document safeguards to prevent prompts from being cut off inappropriately

## Current Truncation Points

### 1. CLIP Token Optimization
**Location:** `supabase/functions/roleplay-chat/index.ts` (lines 3831-4078)

**Purpose:** CLIP tokenizer has a hard limit of 77 tokens. Everything after is truncated by the model itself.

**Current Limits:**
- **Target:** 65 tokens (247 characters)
- **Max:** 77 tokens (hard limit)
- **Chars per token:** ~3.8 (based on real-world testing)

**Strategy:**
- Prioritize actions and interactions
- Truncate descriptive/setting text first
- Preserve character name and essential tags
- Remove character name references from scenario (saves tokens)

**Safeguards Added:**
1. **Empty/Too Short Check**: If optimized prompt is < 10 chars, use fallback
2. **Heavy Truncation Warning**: Warn if > 50% reduction
3. **Fallback Prompt**: Uses character name + essential tags if optimization fails

### 2. Scene Narrative Cleanup
**Location:** `supabase/functions/roleplay-chat/index.ts` (lines 2434-2475)

**Purpose:** Clean up AI-generated scene narratives to remove unwanted elements.

**Safeguards Added:**
1. **Empty/Too Short Check**: If narrative is < 20 chars after cleanup, use fallback
2. **Heavy Modification Warning**: Warn if > 30% reduction
3. **Fallback Narrative**: Uses basic scene description if cleanup fails

## Sanitization Function

**Location:** 
- `supabase/functions/roleplay-chat/index.ts` (lines 1995-2052)
- `supabase/functions/fal-image/index.ts` (lines 14-66)

**Function:** `sanitizePromptForFalAI(prompt: string): string`

**Purpose:** Remove/replace problematic terms that trigger fal.ai content policy violations.

**Rules:** See `SANITIZATION_RULES.md` for complete documentation.

**Note:** Sanitization does NOT truncate prompts - it only replaces/removes specific patterns.

## Best Practices

1. **Monitor Logs**: Check for truncation warnings in edge function logs
2. **Test Edge Cases**: Test with very long prompts to ensure fallbacks work
3. **Review Fallbacks**: Ensure fallback prompts are meaningful and not generic
4. **Track Reductions**: Monitor reduction percentages to identify problematic patterns

## Future Improvements

1. **Configurable Limits**: Make token limits configurable per model
2. **Better Fallbacks**: Use conversation context for better fallback prompts
3. **Truncation Analytics**: Track which prompts are truncated most often
4. **Smart Prioritization**: Learn which parts of prompts are most important
