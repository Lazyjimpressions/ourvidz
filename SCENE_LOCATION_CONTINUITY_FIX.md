# Scene Location Continuity Fix

**Date:** 2026-01-11  
**Issue:** Subsequent I2I scenes not maintaining location continuity (office scene → city streets)

## Root Cause

For I2I scenes, the scene narrative generation was extracting location from conversation history instead of using the previous scene's location. This caused:
- Office scene → City streets scene (wrong location)
- Previous scene context was not being used
- Location extraction from conversation picked up irrelevant locations

## Fix Implemented

### 1. Added Previous Scene Context Fetching
**File:** `supabase/functions/roleplay-chat/index.ts` (lines 2373-2405)

**Changes:**
- Added `previousSceneId` parameter to `generateSceneNarrativeWithOpenRouter()`
- Fetch previous scene's `generation_metadata.scene_context` from database
- Extract `setting` from previous scene context or prompt
- Prioritize previous scene's location over conversation history for I2I

### 2. Enhanced Prompt Construction
**File:** `supabase/functions/roleplay-chat/index.ts` (lines 2406-2415)

**Changes:**
- For I2I scenes, add "PREVIOUS SCENE CONTEXT" section to prompt
- Explicitly state: "The scene MUST remain in the SAME LOCATION: [previous location]"
- Emphasize: "Only describe what changes, not the location or environment"

### 3. Location Priority Logic
**File:** `supabase/functions/roleplay-chat/index.ts` (lines 2400-2405)

**Changes:**
- For I2I: Use previous scene's location (highest priority)
- For T2I: Use conversation history location (fallback to current scene context)

## Expected Results

After deploying:

1. **Location Continuity**: I2I scenes will maintain the same location as previous scene
2. **No Location Drift**: Office scenes will stay in office, spa scenes will stay in spa
3. **Better Context**: Previous scene's setting and mood are included in narrative generation
4. **Focused Changes**: Narrative will focus on what changes, not location/environment

## Testing Plan

1. Generate a scene in an office setting
2. Generate a subsequent scene (I2I)
3. Verify the narrative mentions the office location
4. Verify the generated image stays in the office
5. Check logs for "I2I: Retrieved previous scene context" message
