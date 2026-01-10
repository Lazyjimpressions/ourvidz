# Character Image Library Auto-Save Fix

## Problem

Character images generated via `fal-image` and `replicate-image` were not appearing in the Library's "Characters" tab. Images were visible in the workspace page but not auto-saved to the user library.

## Root Cause

The auto-save logic for character portraits was only implemented in `job-callback`, which is triggered via HTTP POST from workers/webhooks. However:

1. **`fal-image`** completes synchronously and updates job status directly in the database - it never calls `job-callback`
2. **`replicate-webhook`** handles Replicate webhooks but only had logic for `roleplay_scene` destination, not `character_portrait`

## Solution

Added auto-save logic directly to both edge functions:

### 1. `fal-image` Edge Function

**Location**: `supabase/functions/fal-image/index.ts`

Added auto-save logic after character record update (lines ~1074-1170):

- Copies image from `workspace-temp` to `user-library` bucket
- Creates `user_library` record with roleplay metadata:
  - `roleplay_metadata.type = 'character_portrait'`
  - `tags = ['character', 'portrait']`
  - `content_category = 'character'`
- Updates character record with stable `user-library/{path}` URL
- Handles thumbnail copy if available

### 2. `replicate-webhook` Edge Function

**Location**: `supabase/functions/replicate-webhook/index.ts`

Added character portrait handling before `roleplay_scene` handling (lines ~329-386):

- Same auto-save logic as `fal-image`
- Copies image to `user-library`
- Creates library record with roleplay metadata
- Updates character record

## Code Changes

### fal-image/index.ts

```typescript
// Auto-save character portrait to library (since fal-image completes synchronously and doesn't trigger job-callback)
if (!storagePath.startsWith('http')) {
  // Only auto-save if we have a storage path (not external URL)
  try {
    const characterId = body.metadata.character_id;
    const sourceKey = storagePath; // Already normalized (no workspace-temp/ prefix)
    const destKey = `${user.id}/${jobData.id}_${characterId}.${resultType === 'video' ? 'mp4' : 'png'}`;

    // Copy file to user-library
    // Create library record with roleplay metadata
    // Update character with stable storage path
  } catch (error) {
    console.error('Error auto-saving character portrait:', error);
    // Don't fail the request if auto-save fails - character is already updated
  }
}
```

### replicate-webhook/index.ts

```typescript
// ✅ FIX: Handle character portrait destination - auto-save to library
if (job.metadata?.destination === 'character_portrait' && job.metadata?.character_id) {
  const characterId = job.metadata.character_id;
  
  if (workspaceAsset) {
    // Auto-save to user library with roleplay metadata
    // Copy file to user-library
    // Create library record
    // Update character record
  }
}
```

## Library Filtering

The Library's "Characters" tab filters assets by:

```typescript
if (activeTab === 'characters') {
  return allAssets.filter(asset => 
    asset.metadata?.roleplay_metadata?.type === 'character_portrait' ||
    asset.metadata?.tags?.includes('character') ||
    asset.metadata?.content_category === 'character'
  );
}
```

The auto-save logic sets all three criteria, ensuring character portraits appear in the tab.

## Testing

To verify the fix:

1. **Create a new character** with image generation
2. **Check workspace page** - image should appear
3. **Check Library → Characters tab** - image should now appear here too
4. **Verify both public and private characters** - both should auto-save

## Edge Functions Affected

- ✅ `fal-image` - Fixed (synchronous completion)
- ✅ `replicate-webhook` - Fixed (webhook handler)
- ✅ `job-callback` - Already had logic (for worker callbacks)

## Related Files

- `supabase/functions/fal-image/index.ts` - Added auto-save logic
- `supabase/functions/replicate-webhook/index.ts` - Added character portrait handling
- `supabase/functions/job-callback/index.ts` - Already had auto-save logic (unchanged)
- `src/components/library/UpdatedOptimizedLibrary.tsx` - Library filtering (unchanged)

## Notes

- Auto-save only occurs for character portraits (`destination === 'character_portrait'`)
- Images are copied from `workspace-temp` to `user-library` bucket
- Character record is updated with stable `user-library/{path}` URL
- Library record includes roleplay metadata for proper filtering
- Errors in auto-save don't fail the generation request (character is already updated)

