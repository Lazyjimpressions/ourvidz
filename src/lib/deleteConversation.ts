import { supabase } from '@/integrations/supabase/client';

/**
 * Fully deletes a conversation and all associated data:
 * 1. user_library scene images (DB records + storage files)
 * 2. Scene thumbnail files in storage
 * 3. The conversation row (CASCADE handles messages + character_scenes)
 * 4. Related localStorage keys
 */
export async function deleteConversationFull(
  conversationId: string,
  userId: string
): Promise<void> {
  // 1. Get all library scene images linked to this conversation
  const { data: sceneAssets } = await supabase
    .from('user_library')
    .select('id, storage_path')
    .eq('user_id', userId)
    .eq('content_category', 'scene')
    .contains('roleplay_metadata', { conversation_id: conversationId });

  // 2. Collect storage paths to delete
  const storagePaths: string[] = (sceneAssets || [])
    .map(a => a.storage_path)
    .filter((p): p is string => Boolean(p));

  // Also collect scene-thumbnail folder contents
  const thumbFolder = `${userId}/scene-thumbnails/${conversationId}`;
  try {
    const { data: thumbFiles } = await supabase.storage
      .from('user-library')
      .list(thumbFolder);
    if (thumbFiles?.length) {
      storagePaths.push(...thumbFiles.map(f => `${thumbFolder}/${f.name}`));
    }
  } catch {
    // Thumbnail folder may not exist — that's fine
  }

  // 3. Batch delete storage files
  if (storagePaths.length > 0) {
    await supabase.storage.from('user-library').remove(storagePaths);
    console.log(`🗑️ Deleted ${storagePaths.length} storage files for conversation ${conversationId}`);
  }

  // 4. Delete user_library records
  if (sceneAssets?.length) {
    await supabase
      .from('user_library')
      .delete()
      .in('id', sceneAssets.map(a => a.id));
  }

  // 5. Delete conversation (CASCADE handles messages + character_scenes)
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', userId);

  if (error) throw error;

  // 6. Clear localStorage references
  Object.keys(localStorage).forEach(key => {
    if (key.includes(conversationId)) {
      localStorage.removeItem(key);
    }
  });
}
