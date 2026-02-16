

# Plan: Delete Orphaned Scene Images on Conversation Deletion

## Problem

When a conversation is deleted, scene images persist as orphans in both the `user_library` table and the `user-library` storage bucket. There are **3 separate delete code paths**, and none fully clean up all related data:

| Delete Path | Deletes Conversation | Deletes Messages | Cleans `user_library` Records | Cleans Storage Files |
|---|---|---|---|---|
| `useConversations.ts` (character page) | Yes | Auto (CASCADE) | No | No |
| `PlaygroundContext.tsx` (playground) | Yes | Auto (CASCADE) | No | No |
| `useUserConversations.ts` (dashboard) | Yes | Manually (redundant) | No | Partially (thumbnails only) |

**DB cascades already handle**: `messages` and `character_scenes` rows are auto-deleted via `ON DELETE CASCADE` foreign keys. No manual deletion of those is needed.

**What is NOT cleaned up**: `user_library` rows where `roleplay_metadata->>'conversation_id'` matches the deleted conversation, and their corresponding files in the `user-library` storage bucket.

## Solution

### 1. Create a shared utility: `src/lib/deleteConversation.ts`

A single function that all 3 delete paths call:

```
deleteConversationFull(conversationId, userId)
```

Steps executed in order:
1. Query `user_library` for all records where `roleplay_metadata->>'conversation_id' = conversationId` -- gets storage paths
2. Delete those storage files from the `user-library` bucket (batch `supabase.storage.from('user-library').remove(paths)`)
3. Also clean up scene-thumbnail folder: `{userId}/scene-thumbnails/{conversationId}/`
4. Delete the `user_library` rows for this conversation
5. Delete the `conversations` row (CASCADE auto-removes `messages` and `character_scenes`)
6. Clear any localStorage keys referencing this conversation

### 2. Replace all 3 delete paths

| File | Change |
|---|---|
| `src/lib/deleteConversation.ts` | New file with shared cleanup logic |
| `src/hooks/useConversations.ts` | Replace inline delete with call to shared utility |
| `src/contexts/PlaygroundContext.tsx` | Replace inline delete with call to shared utility |
| `src/hooks/useUserConversations.ts` | Replace existing `deleteConversation` with call to shared utility (remove redundant manual message deletion) |

### 3. One-time cleanup of existing orphans

After the fix is in place, run a one-time query to identify and delete existing orphaned `user_library` scene images whose conversations no longer exist. This will be a SQL script to run manually:

```sql
-- Find orphaned scene images in user_library
DELETE FROM user_library
WHERE content_category = 'scene'
  AND roleplay_metadata->>'conversation_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM conversations 
    WHERE id = (roleplay_metadata->>'conversation_id')::uuid
  );
```

Storage file cleanup for existing orphans would need a separate edge function or manual process since we need the storage paths before deleting the rows.

## Technical Details

**Shared utility pseudocode:**

```typescript
export async function deleteConversationFull(
  conversationId: string, 
  userId: string
): Promise<void> {
  // 1. Get all library scene images for this conversation
  const { data: sceneAssets } = await supabase
    .from('user_library')
    .select('id, storage_path')
    .eq('user_id', userId)
    .eq('content_category', 'scene')
    .contains('roleplay_metadata', { conversation_id: conversationId });

  // 2. Delete storage files (scenes + thumbnails)
  const storagePaths = (sceneAssets || [])
    .map(a => a.storage_path)
    .filter(Boolean);

  // Also list and include scene-thumbnails folder
  const thumbFolder = `${userId}/scene-thumbnails/${conversationId}`;
  const { data: thumbFiles } = await supabase.storage
    .from('user-library')
    .list(thumbFolder);
  if (thumbFiles?.length) {
    storagePaths.push(...thumbFiles.map(f => `${thumbFolder}/${f.name}`));
  }

  if (storagePaths.length > 0) {
    await supabase.storage.from('user-library').remove(storagePaths);
  }

  // 3. Delete user_library records
  if (sceneAssets?.length) {
    await supabase
      .from('user_library')
      .delete()
      .in('id', sceneAssets.map(a => a.id));
  }

  // 4. Delete conversation (CASCADE handles messages + character_scenes)
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', userId);
  if (error) throw error;

  // 5. Clear localStorage
  Object.keys(localStorage).forEach(key => {
    if (key.includes(conversationId)) localStorage.removeItem(key);
  });
}
```

**No database migration needed** -- existing CASCADE rules already cover `messages` and `character_scenes`. The fix is purely in application code to also clean up `user_library` and storage.
