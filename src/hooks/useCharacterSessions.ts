import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CharacterSession {
  character_id: string;
  character_name: string;
  character_image_url?: string;
  total_messages: number;
  last_conversation_id: string;
  last_updated: string;
  conversation_count: number;
}

export const useCharacterSessions = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<CharacterSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCharacterSessions = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get conversations with character data and message counts
      const { data: conversationsData, error: convError } = await supabase
        .from('conversations')
        .select(`
          id,
          character_id,
          updated_at,
          messages(count),
          characters!character_id(
            id,
            name,
            image_url
          )
        `)
        .eq('user_id', user.id)
        .eq('conversation_type', 'character_roleplay')
        .not('character_id', 'is', null)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;

      // Group conversations by character_id
      const sessionMap = new Map<string, CharacterSession>();
      
      conversationsData?.forEach(conv => {
        const characterId = conv.character_id!;
        const character = conv.characters;
        const messageCount = conv.messages?.[0]?.count || 0;
        
        if (sessionMap.has(characterId)) {
          const existing = sessionMap.get(characterId)!;
          existing.total_messages += messageCount;
          existing.conversation_count += 1;
          // Keep the most recent conversation ID and date
          if (new Date(conv.updated_at) > new Date(existing.last_updated)) {
            existing.last_conversation_id = conv.id;
            existing.last_updated = conv.updated_at;
          }
        } else {
          sessionMap.set(characterId, {
            character_id: characterId,
            character_name: character.name,
            character_image_url: character.image_url,
            total_messages: messageCount,
            last_conversation_id: conv.id,
            last_updated: conv.updated_at,
            conversation_count: 1
          });
        }
      });

      // Convert map to array and sort by last updated
      const sessionsArray = Array.from(sessionMap.values()).sort(
        (a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
      );
      
      setSessions(sessionsArray);
    } catch (err) {
      console.error('Error loading character sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load character sessions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCharacterSessions();
  }, [user?.id]);

  return {
    sessions,
    isLoading,
    error,
    loadCharacterSessions
  };
};
