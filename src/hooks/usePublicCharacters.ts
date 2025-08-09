import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PublicCharacter {
  id: string;
  name: string;
  description: string;
  traits?: string;
  appearance_tags?: string[];
  image_url?: string;
  reference_image_url?: string;
  persona?: string;
  voice_tone?: string;
  mood?: string;
  creator_id?: string;
  user_id?: string;
  likes_count: number;
  interaction_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  gender?: string;
  content_rating?: string;
  role?: string;
}

export const usePublicCharacters = () => {
  const [characters, setCharacters] = useState<PublicCharacter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPublicCharacters = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('is_public', true)
        .order('likes_count', { ascending: false });

      if (error) {
        throw error;
      }

      setCharacters(data || []);
    } catch (err) {
      console.error('Error loading public characters:', err);
      setError(err instanceof Error ? err.message : 'Failed to load characters');
    } finally {
      setIsLoading(false);
    }
  };

  const likeCharacter = async (characterId: string) => {
    try {
      // Find the character to update
      const character = characters.find(c => c.id === characterId);
      if (!character) return;

      // Optimistically update the UI
      setCharacters(prev => 
        prev.map(c => 
          c.id === characterId 
            ? { ...c, likes_count: c.likes_count + 1 }
            : c
        )
      );

      // Update the database
      const { error } = await supabase
        .from('characters')
        .update({ 
          likes_count: character.likes_count + 1 
        })
        .eq('id', characterId);

      if (error) {
        // Revert optimistic update on error
        setCharacters(prev => 
          prev.map(c => 
            c.id === characterId 
              ? { ...c, likes_count: c.likes_count - 1 }
              : c
          )
        );
        throw error;
      }
    } catch (err) {
      console.error('Error liking character:', err);
    }
  };

  const incrementInteraction = async (characterId: string) => {
    try {
      // Find the character to update
      const character = characters.find(c => c.id === characterId);
      if (!character) return;

      // Optimistically update the UI
      setCharacters(prev => 
        prev.map(c => 
          c.id === characterId 
            ? { ...c, interaction_count: c.interaction_count + 1 }
            : c
        )
      );

      // Update the database
      const { error } = await supabase
        .from('characters')
        .update({ 
          interaction_count: character.interaction_count + 1 
        })
        .eq('id', characterId);

      if (error) {
        // Revert optimistic update on error
        setCharacters(prev => 
          prev.map(c => 
            c.id === characterId 
              ? { ...c, interaction_count: c.interaction_count - 1 }
              : c
          )
        );
        throw error;
      }
    } catch (err) {
      console.error('Error incrementing interaction:', err);
    }
  };

  useEffect(() => {
    loadPublicCharacters();

    // Set up real-time subscription for character updates
    const channel = supabase
      .channel('public-characters')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'characters',
          filter: 'is_public=eq.true'
        },
        () => {
          // Reload characters when there are changes
          loadPublicCharacters();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    characters,
    isLoading,
    error,
    loadPublicCharacters,
    likeCharacter,
    incrementInteraction
  };
};