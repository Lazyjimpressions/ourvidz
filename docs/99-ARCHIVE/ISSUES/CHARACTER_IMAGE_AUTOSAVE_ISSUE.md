# Character Image Auto-Save Issue Analysis

## Problem Identified

Recent character image generations are not saving to the library's character tab. Investigation reveals:

### Root Causes

1. **Missing `character_id` during character creation**
   - When generating an image during character creation, `character_id` doesn't exist yet
   - The `AddCharacterModal` only sends `characterName` in metadata, not `character_id`
   - Auto-save logic requires `character_id` to work

2. **Job stuck in "processing" status**
   - Job `69e0cd17-5b4e-4b8a-a8b2-1333caa61c85` is stuck in "processing" status
   - Workspace asset exists (image was generated and stored)
   - Job status was never updated to "completed"
   - This prevents auto-save from running

3. **Character created after job**
   - Character "Mandy" was created at 17:20:07
   - Job was created at 17:19:42
   - Character exists now, but job never completed, so auto-save never ran

## Fixes Applied

### 1. Enhanced `fal-image` Auto-Save Logic

**File**: `supabase/functions/fal-image/index.ts`

Added character lookup by name when `character_id` is missing:

```typescript
// If character_id is missing (character creation flow), try to find character by name
if (!characterId && (body.metadata.character_name || body.metadata.characterName)) {
  const characterName = body.metadata.character_name || body.metadata.characterName;
  console.log('🔍 Character ID missing, searching by name:', characterName);
  const { data: characterData } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', characterName)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (characterData?.id) {
    characterId = characterData.id;
    console.log('✅ Found character by name:', characterId);
  } else {
    console.warn('⚠️ Character not found by name, skipping auto-save (character may not be created yet)');
  }
}
```

**Limitation**: This only works if the character exists when the job completes. If character is created after job completion, auto-save is skipped.

### 2. Character Creation Hook Enhancement

**File**: `src/hooks/useUserCharacters.ts`

Added logic to check for pending jobs when character is created (for future improvements):

```typescript
// If character was created with an image_url, try to auto-save any pending jobs to library
if (data.image_url && (data.image_url.includes('workspace-temp/') || data.image_url.includes('user-library/'))) {
  // Find recent jobs with matching character name that might need auto-save
  // (Currently just logs - full implementation would trigger auto-save)
}
```

## Remaining Issues

### Issue 1: Jobs Stuck in "processing" Status

**Symptom**: Jobs remain in "processing" status even though workspace assets exist.

**Possible Causes**:
- fal.ai returned `IN_QUEUE` or `IN_PROGRESS` status, function returned early
- Job update to "completed" failed silently
- Function timed out before completion

**Solution Needed**: 
- Add retry logic for stuck jobs
- Add database trigger to auto-complete jobs when workspace assets are created
- Or add a cleanup function to mark jobs as completed if workspace asset exists

### Issue 2: Character Created After Job Completion

**Symptom**: Character is created after image generation completes, so auto-save can't find character by name.

**Current Behavior**: Auto-save is skipped with warning.

**Solution Needed**:
- Add database trigger on character creation to find matching jobs and trigger auto-save
- Or add a cleanup function that runs periodically to save pending character portraits
- Or modify character creation to pass `character_id` back to update the job metadata

## Recommended Next Steps

1. **Immediate Fix**: Manually complete stuck jobs and trigger auto-save
2. **Short-term**: Add database trigger to auto-save when character is created
3. **Long-term**: Refactor to pass `character_id` during image generation (create character first, then generate image)

## Testing

To test the fix:
1. Create a new character with image generation
2. Verify image appears in workspace
3. Verify image appears in Library → Characters tab
4. Check job status is "completed"
5. Check `user_library` table has record with `roleplay_metadata.type = 'character_portrait'`

