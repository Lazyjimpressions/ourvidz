import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Character {
  id: string;
  name: string;
  description: string;
  traits?: string;
  appearance_tags?: string[];
  image_url?: string;
  persona?: string;
  voice_tone?: string;
  mood?: string;
  creator_id?: string;
  likes_count: number;
  interaction_count: number;
  reference_image_url?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export const useCharacterData = (characterId?: string) => {
  const [character, setCharacter] = useState<Character | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCharacter = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', id)
        .eq('is_public', true) // Only load public characters for now
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setCharacter(data);
      }
    } catch (err) {
      console.error('Error loading character:', err);
      setError(err instanceof Error ? err.message : 'Failed to load character');
    } finally {
      setIsLoading(false);
    }
  };

  const likeCharacter = async (id: string) => {
    try {
      const { error } = await supabase
        .from('characters')
        .update({ 
          likes_count: character ? character.likes_count + 1 : 1 
        })
        .eq('id', id);

      if (error) throw error;
      
      if (character) {
        setCharacter({
          ...character,
          likes_count: character.likes_count + 1
        });
      }
    } catch (err) {
      console.error('Error liking character:', err);
    }
  };

  useEffect(() => {
    if (characterId) {
      loadCharacter(characterId);
    }
  }, [characterId]);

  return {
    character,
    isLoading,
    error,
    loadCharacter,
    likeCharacter
  };
};