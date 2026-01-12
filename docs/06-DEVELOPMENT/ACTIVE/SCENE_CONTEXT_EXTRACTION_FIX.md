# Scene Context Extraction Fix

**Date:** 2026-01-10
**Status:** Critical Bug Fix - Scene Narrative Ignoring Context
**Priority:** CRITICAL

---

## Problem Analysis

### Issue
Scene narrative generation is completely ignoring conversation context and generating unrelated scenes.

**Example:**
- **Actual Scene**: Steamy locker room shower, Mary wet, water streaming, tiled walls
- **Generated Prompt**: Rooftop, city lights, moonlight, black dress

### Root Causes

1. **Weak Scene Context Extraction**
   - `analyzeSceneContent()` uses basic keyword matching
   - Missing keywords: "shower", "locker room", "steamy", "tiled", "water", "misty"
   - Defaults to generic "intimate indoor setting" when keywords not found
   - Doesn't extract the actual scene description from dialogue

2. **AI Model Ignoring Context**
   - Model generates scenes unrelated to provided context
   - Context is provided but not emphasized strongly enough
   - Model may be using character description or other data that overrides scene context

3. **Missing Direct Scene Description Extraction**
   - Dialogue contains perfect scene description: "As the warm water streams down her body, Mary stands under the misty shower..."
   - System should extract this directly instead of relying on keyword matching

---

## Solution Implemented

### 1. Enhanced Scene Context Extraction ✅

**Changes:**
- Expanded `SCENE_DETECTION_PATTERNS.environmental` with:
  - Location keywords: `shower`, `locker room`, `locker`, `changing room`, `gym`, `spa`, `sauna`, `pool`, `jacuzzi`, `bath`, `tub`
  - Descriptive keywords: `steamy`, `misty`, `tiled`, `wet`, `water`, `streaming`, `dripping`
- Enhanced environment detection to prioritize specific locations
- Added descriptive word enhancement (e.g., "steamy shower" instead of just "shower")
- Added movement keywords: `kneels`, `balances`
- Added visual keywords: `wet`, `dripping`, `clinging`
- Added emotional keywords: `sultry`, `forbidden`
- Added positioning keywords: `under the`, `stands under`

### 2. Direct Scene Description Extraction ✅

**New Function:** `extractDirectSceneDescription()`
- Extracts sentences that describe the scene visually
- Looks for patterns like "As [character] [action], [description]"
- Filters out dialogue (quotes, "said", "replied", etc.)
- Filters out first-person dialogue ("Hello", "I'm", etc.)
- Scores sentences by number of scene indicators
- Returns the most descriptive sentence as primary context

### 3. Stronger Context Emphasis in Prompt ✅

**Changes:**
- Moved scene context to top of prompt (before storyline context)
- Added explicit warning: "⚠️ CRITICAL: YOU MUST USE THE SCENE CONTEXT PROVIDED BELOW"
- Added "REQUIRED SCENE CONTEXT (YOU MUST USE THIS)" section
- Added direct scene description as primary reference if found
- Enhanced final instruction with explicit location requirement
- Added prohibition: "DO NOT invent new locations like rooftops, cityscapes, or other settings not mentioned in the context"

### 4. Enhanced Logging ✅

**Changes:**
- Added detailed logging of extracted scene context
- Logs actions, visual elements, positioning separately
- Logs extracted direct scene description
- Helps debug what context is being extracted

---

## Expected Results

**Before:**
- Context: "intimate indoor setting" (generic fallback)
- Generated: "rooftop, city lights, black dress" (completely wrong)

**After:**
- Context: "steamy locker room, shower, water streaming, tiled walls, misty"
- Direct Description: "As the warm water streams down her body, Mary stands under the misty shower, her auburn hair dripping and clinging to her back. The steamy locker room adds an intimate touch to the scene..."
- Generated: "Mary stands under the misty shower in a steamy locker room, water streaming down her body, her auburn hair dripping and clinging to her back. She leans against the tiled wall, the warm water creating an intimate atmosphere."

---

## Testing

### Test Case: Steamy Shower Scene

**Input Dialogue:**
```
Mary: [Smirking] Hello there, Jon. I wasn't expecting anyone else to be here right now. 
It's a bit cozy with just the two of us, don't you think? As the warm water streams 
down her body, Mary stands under the misty shower, her auburn hair dripping and 
clinging to her back. The steamy locker room adds an intimate touch to the scene, 
causing a sense of forbidden pleasure to fill the air. She leans against the tiled 
wall, seeking support as she balances herself on one leg while the other kneels 
slightly into the puddle of water on the floor.
```

**Expected Extraction:**
- Setting: "steamy locker room" or "steamy shower"
- Direct Description: "As the warm water streams down her body, Mary stands under the misty shower, her auburn hair dripping and clinging to her back. The steamy locker room adds an intimate touch to the scene..."
- Actions: "stands", "leans", "balances", "kneels"
- Visual Elements: "water", "dripping", "clinging", "wet"
- Positioning: "against", "under the", "stands under"

**Expected Generated Prompt:**
- Must include: "shower", "locker room", "steamy", "water", "tiled wall"
- Must NOT include: "rooftop", "city lights", "moonlight", "black dress"

---

## Files Modified

1. `supabase/functions/roleplay-chat/index.ts`
   - Enhanced `SCENE_DETECTION_PATTERNS`
   - Enhanced `analyzeSceneContent()` function
   - Added `extractDirectSceneDescription()` function
   - Restructured prompt to emphasize context
   - Enhanced logging

---

## Next Steps

1. **Deploy Edge Function** - Deploy updated `roleplay-chat` function
2. **Test with Steamy Shower Scene** - Verify context extraction and generation
3. **Monitor Logs** - Check console logs to see what context is being extracted
4. **Iterate if Needed** - If model still ignores context, may need to:
   - Add even stronger constraints
   - Use different model
   - Add post-generation validation

---

## Related Documentation

- [SCENE_NARRATIVE_TEMPLATE_AUDIT.md](./SCENE_NARRATIVE_TEMPLATE_AUDIT.md) - Original audit
- [SCENE_NARRATIVE_PHASE1_IMPLEMENTATION.md](./SCENE_NARRATIVE_PHASE1_IMPLEMENTATION.md) - Phase 1 improvements

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-10 | Critical fix for context extraction and prompt emphasis | Claude |
