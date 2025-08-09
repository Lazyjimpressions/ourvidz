import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ConversationInfo {
  id: string;
  user_id: string;
  title: string;
  conversation_type: string;
  status: string;
  character_id?: string | null;
  user_character_id?: string | null;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message?: string;
}

export const useConversations = (characterId?: string) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('conversations')
        .select(`
          *,
          messages(count)
        `)
        .eq('user_id', user.id);

      if (characterId) {
        query = query.eq('character_id', characterId);
      }

      const { data, error } = await query
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Process the data to include message count
      const processedData = data?.map(conv => ({
        ...conv,
        message_count: conv.messages?.[0]?.count || 0
      })) || [];
      
      setConversations(processedData);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    } catch (err) {
      console.error('Error deleting conversation:', err);
      throw err;
    }
  };

  const updateConversationStatus = async (conversationId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ status })
        .eq('id', conversationId)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, status } : conv
      ));
    } catch (err) {
      console.error('Error updating conversation status:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadConversations();
  }, [user?.id, characterId]);

  return {
    conversations,
    isLoading,
    error,
    loadConversations,
    deleteConversation,
    updateConversationStatus
  };
};