# Animation Sanitization Fix

**Date:** 2026-01-11  
**Issue:** Characters appearing animated in generated images due to motion/action words in prompts

## Root Cause

The prompt contained phrases that trigger animation:
- "Her eyes sparkle with mischief" → "sparkle" suggests movement
- "inviting a playful dance of words and glances" → "dance" is a motion word
- "click rhythmically" → "rhythmically" suggests continuous motion
- "strides confidently" → "strides" suggests walking animation
- "catching the light" → "catching" suggests movement

## Fix Implemented

### 1. Added Animation Pattern Sanitization
**Files:**
- `supabase/functions/roleplay-chat/index.ts` (lines 2028-2042)
- `supabase/functions/fal-image/index.ts` (lines 42-56)

**New Rules:**

| Pattern | Replacement | Reason |
|---------|-------------|--------|
| `playful dance of` | `playful exchange of` | "dance" triggers animation |
| `dance of words` | `exchange of words` | Motion word |
| `dance of glances` | `exchange of glances` | Motion word |
| `eyes sparkle` | `eyes gleam` | "sparkle" suggests movement |
| `sparkle with` | `gleam with` | Motion word |
| `sparkling` | `gleaming` | Motion word |
| `click rhythmically` | `click` | "rhythmically" suggests continuous motion |
| `strides confidently` | `walks confidently` | "strides" more dynamic than "walks" |
| `strides` | `walks` | Motion word |
| `catching the light` | `reflecting the light` | "catching" suggests movement |
| `catching light` | `reflecting light` | Motion word |
| `inviting a` | `suggesting a` | "inviting" can suggest motion |
| `inviting` | `suggesting` | Motion word |

## Expected Results

After deploying:

1. **No Animation**: Characters will appear static, not animated
2. **Better Prompts**: Motion words replaced with static alternatives
3. **Consistent Quality**: Images will be more consistent and professional

## Testing Plan

1. Generate a scene with phrases like "eyes sparkle", "playful dance", "strides"
2. Verify the sanitized prompt replaces these with static alternatives
3. Check the generated image - character should be static, not animated
4. Review logs for sanitization changes

## Additional Notes

- These rules apply to ALL prompts sent to fal.ai
- Rules are applied before CLIP optimization
- Order matters: animation patterns applied after suggestive patterns
