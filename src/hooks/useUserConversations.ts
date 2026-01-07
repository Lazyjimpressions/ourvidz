import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          user_id,
          character_id,
          title,
          conversation_type,
          status,
          last_scene_image,
          created_at,
          updated_at,
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

      // Process the data
      let processedData = (data || []).map(conv => ({
        id: conv.id,
        user_id: conv.user_id,
        character_id: conv.character_id,
        title: conv.title,
        conversation_type: conv.conversation_type,
        status: conv.status,
        last_scene_image: conv.last_scene_image,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        message_count: conv.messages?.[0]?.count || 0,
        character: conv.character as ConversationCharacter | null
      }));

      // Filter out empty conversations if requested
      if (excludeEmpty) {
        processedData = processedData.filter(conv => conv.message_count > 0);
      }

      setConversations(processedData);
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
      const { error } = await supabase
        .from('conversations')
        .update({ last_scene_image: imageUrl })
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

  return {
    conversations,
    isLoading,
    error,
    loadConversations,
    updateLastSceneImage
  };
};
