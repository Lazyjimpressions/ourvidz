# Scene Narrative Fix - Unwanted Elements

**Date:** 2026-01-11  
**Issue:** Scene narrative includes unwanted elements like "A scene showing Maggie at car" and "animated expression"

## Root Cause

1. **"A scene showing..." prefix**: The AI model is generating narrative that starts with "A scene showing..." which is redundant since we already have "Generate a scene showing..." in the prompt construction.

2. **"at car" location**: The storyline extraction is picking up "at car" from conversation history, which then gets included in the narrative.

3. **"animated expression"**: This comes from the sanitization function that replaces "heart racing" with "animated expression", but it shouldn't appear in scene narratives.

## Fixes Implemented

### 1. Narrative Cleanup (Code Changes)
**File:** `supabase/functions/roleplay-chat/index.ts` (lines 2434-2460)

- **Remove "A scene showing..." prefix**: Added regex patterns to remove common scene prefixes
- **Remove "animated expression"**: Replaced with "expressive" to avoid unwanted animation
- **Enhanced cleanup**: Applies to both I2I and T2I scenes

### 2. Template Instruction Update (Code Changes)
**File:** `supabase/functions/roleplay-chat/index.ts` (line 2394)

- **Updated instruction**: Added explicit instruction to NOT include "A scene showing..." or "Generate a scene..." prefix
- **Focus on current location**: Emphasizes using the current location from storyline context
- **Direct description**: Instructs to start directly with the scene description

## Expected Results

After these fixes:

1. **No redundant prefixes**: Scene narratives won't start with "A scene showing..." or similar
2. **No unwanted locations**: Better filtering of conversation context to avoid irrelevant locations
3. **No "animated expression"**: Replaced with "expressive" to avoid animation artifacts
4. **Cleaner prompts**: More focused scene descriptions that work better with I2I

## Testing Plan

1. Generate a scene in an office setting
2. Verify the narrative doesn't include "A scene showing..." prefix
3. Verify no unwanted locations (like "at car") appear
4. Verify no "animated expression" appears
5. Check that the final prompt sent to fal.ai is clean and focused
