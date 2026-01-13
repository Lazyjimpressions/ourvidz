import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext';

/**
 * Character info included with conversation for display
 */
export interface ConversationCharacter {
  id: string;
  name: string;
  image_url: string | null;
  description?: string | null;
}

/**
 * User conversation with character and scene thumbnail
 * Used for "Continue Conversations" dashboard section
 */
export interface UserConversation {
  id: string;
  user_id: string;
  character_id: string;
  title: string;
  conversation_type: string;
  status: string;
  last_scene_image: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
  character: ConversationCharacter | null;
}

/**
 * Hook for fetching user's conversations across all characters
 * Designed for "Continue Conversations" dashboard section
 *
 * @param limit - Maximum number of conversations to fetch (default: 10)
 * @param excludeEmpty - Whether to exclude conversations with no messages (default: true)
 */
export const useUserConversations = (limit: number = 10, excludeEmpty: boolean = true) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<UserConversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Fetch conversations
      // Note: last_scene_image column exists in DB but may not be in generated types
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          user_id,
          character_id,
          title,
          conversation_type,
          status,
          created_at,
          updated_at,
          last_scene_image,
          messages(count),
          character:characters!character_id(
            id,
            name,
            image_url,
            description
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Cast data to include last_scene_image which exists in DB but not in generated types
      const conversationsWithSceneImage = data as Array<typeof data[number] & { last_scene_image?: string | null }> | null;
      const conversationIds = (conversationsWithSceneImage || []).map(c => c.id);

      // Step 2: Fetch latest scene images from multiple sources:
      // 1. user_library table (primary - scenes are persisted here)
      // 2. character_scenes table (fallback)
      // 3. workspace_assets (temporary fallback)
      const sceneImageMap: Record<string, string> = {};

      if (conversationIds.length > 0) {
        // First, check user_library for persisted scene images
        // Scenes are stored with roleplay_metadata containing conversation_id
        // We need to query all user's scene images and filter by conversation_id in metadata
        const { data: libraryScenes } = await supabase
          .from('user_library')
          .select('storage_path, roleplay_metadata, created_at')
          .eq('user_id', user.id)
          .eq('asset_type', 'image')
          .eq('content_category', 'scene')
          .order('created_at', { ascending: false })
          .limit(100); // Reasonable limit for user's scene images

        // Filter library scenes by conversation_id in roleplay_metadata
        if (libraryScenes) {
          for (const libraryScene of libraryScenes) {
            const metadata = libraryScene.roleplay_metadata as any;
            const convId = metadata?.conversation_id;
            if (convId && conversationIds.includes(convId) && !sceneImageMap[convId] && libraryScene.storage_path) {
              // Prepend bucket name for consistency
              sceneImageMap[convId] = libraryScene.storage_path.startsWith('user-library/') 
                ? libraryScene.storage_path 
                : `user-library/${libraryScene.storage_path}`;
            }
          }
        }

        // Fallback: Get scene images from character_scenes for conversations not found in library
        const missingConversationIds = conversationIds.filter(id => !sceneImageMap[id]);
        if (missingConversationIds.length > 0) {
          const { data: sceneData } = await supabase
            .from('character_scenes')
            .select('conversation_id, job_id, image_url, created_at')
            .in('conversation_id', missingConversationIds)
            .order('created_at', { ascending: false });

        if (sceneData && sceneData.length > 0) {
          // Collect job_ids that need workspace_assets lookup (only if image_url is missing)
          const jobIds = sceneData
            .filter(s => s.job_id && !s.image_url)
            .map(s => s.job_id as string);

          // Fetch workspace_assets for these jobs
          let workspaceAssetMap: Record<string, string> = {};
          if (jobIds.length > 0) {
            const { data: assetData } = await supabase
              .from('workspace_assets')
              .select('job_id, temp_storage_path')
              .in('job_id', jobIds);

            if (assetData) {
              for (const asset of assetData) {
                if (asset.job_id && asset.temp_storage_path) {
                  workspaceAssetMap[asset.job_id] = asset.temp_storage_path;
                }
              }
            }
          }

          // Build map of conversation_id -> most recent scene image
          // Process in order (most recent first) so we get the latest scene per conversation
          for (const scene of sceneData) {
            if (scene.conversation_id && !sceneImageMap[scene.conversation_id]) {
              // Prefer image_url from character_scenes, fallback to workspace_assets
              const imageUrl = scene.image_url ||
                (scene.job_id ? workspaceAssetMap[scene.job_id] : null);
              if (imageUrl) {
                sceneImageMap[scene.conversation_id] = imageUrl;
              }
            }
          }
        }
        }
      }

      // Step 3: Process data with scene image fallback
      let processedData = (conversationsWithSceneImage || []).map(conv => {
        // Use last_scene_image if available, otherwise fallback to character_scenes
        const effectiveSceneImage = conv.last_scene_image || sceneImageMap[conv.id] || null;

        return {
          id: conv.id,
          user_id: conv.user_id,
          character_id: conv.character_id,
          title: conv.title,
          conversation_type: conv.conversation_type,
          status: conv.status,
          last_scene_image: effectiveSceneImage,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          message_count: conv.messages?.[0]?.count || 0,
          character: conv.character as ConversationCharacter | null
        };
      });

      // Filter out empty conversations if requested
      if (excludeEmpty) {
        processedData = processedData.filter(conv => conv.message_count > 0);
      }

      // Step 4: Sign scene image URLs (they're storage paths, not full URLs)
      const signedData = await Promise.all(
        processedData.map(async conv => {
          if (!conv.last_scene_image) return conv;

          // Check if already a full URL (https://) or needs signing
          if (conv.last_scene_image.startsWith('http')) {
            return conv;
          }

          // Determine bucket based on path pattern
          // user-library paths: {userId}/scene-thumbnails/...
          // workspace-temp paths: everything else
          const isUserLibrary = conv.last_scene_image.includes('/scene-thumbnails/');
          const bucket = isUserLibrary ? 'user-library' : 'workspace-temp';
          // Use longer TTL for user-library (24 hours) vs workspace-temp (1 hour)
          const ttl = isUserLibrary ? 86400 : 3600;

          try {
            const { data: signedData, error: signError } = await supabase.storage
              .from(bucket)
              .createSignedUrl(conv.last_scene_image, ttl);
            
            if (signError) {
              // If file doesn't exist (400 error), clear the scene image reference
              if ((signError as any).statusCode === 400 || signError.message?.includes('not found')) {
                console.warn(`⚠️ Scene image not found for conversation ${conv.id}, clearing reference`);
                // Optionally update the conversation to clear last_scene_image
                // For now, just return without the image
                return { ...conv, last_scene_image: null };
              }
              throw signError;
            }
            
            if (signedData?.signedUrl) {
              return { ...conv, last_scene_image: signedData.signedUrl };
            }
          } catch (err: any) {
            // Handle 400 errors gracefully (file doesn't exist)
            if (err?.statusCode === 400 || err?.message?.includes('not found')) {
              console.warn(`⚠️ Scene image not found for conversation ${conv.id}, clearing reference`);
              return { ...conv, last_scene_image: null };
            }
            console.error(`Failed to sign URL for conversation ${conv.id} from ${bucket}:`, err);
          }

          return conv;
        })
      );

      setConversations(signedData);
    } catch (err) {
      console.error('Error loading user conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update the last scene image for a conversation
   * Called when a new scene is generated during chat
   */
  const updateLastSceneImage = async (conversationId: string, imageUrl: string) => {
    try {
      // last_scene_image exists in DB but may not be in generated types
      const { error } = await supabase
        .from('conversations')
        .update({ last_scene_image: imageUrl } as any)
        .eq('id', conversationId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Optimistically update local state
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, last_scene_image: imageUrl }
          : conv
      ));
    } catch (err) {
      console.error('Error updating last scene image:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadConversations();
  }, [user?.id, limit, excludeEmpty]);

  /**
   * Delete a conversation entirely (removes from database)
   * This deletes the conversation record, all associated messages, and stored thumbnails
   */
  const deleteConversation = async (conversationId: string) => {
    if (!user?.id) return;

    try {
      // Delete messages first (foreign key constraint)
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      // Delete the conversation
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));

      // Clear localStorage cache for this conversation
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('conversation_') && localStorage.getItem(key) === conversationId) {
          localStorage.removeItem(key);
        }
      });

      // Clean up persisted scene thumbnails from user-library storage
      const thumbnailFolder = `${user.id}/scene-thumbnails/${conversationId}`;
      const { data: files } = await supabase.storage
        .from('user-library')
        .list(thumbnailFolder);

      if (files && files.length > 0) {
        const filePaths = files.map(f => `${thumbnailFolder}/${f.name}`);
        await supabase.storage
          .from('user-library')
          .remove(filePaths);
        console.log('🗑️ Cleaned up scene thumbnails:', filePaths.length, 'files');
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
      throw err;
    }
  };

  /**
   * Dismiss/hide a conversation from the dashboard (archives it)
   * The conversation still exists but won't show in the Continue section
   */
  const dismissConversation = async (conversationId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ status: 'archived' })
        .eq('id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Remove from local state (since we only show active conversations)
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    } catch (err) {
      console.error('Error dismissing conversation:', err);
      throw err;
    }
  };

  return {
    conversations,
    isLoading,
    error,
    loadConversations,
    updateLastSceneImage,
    deleteConversation,
    dismissConversation
  };
};
