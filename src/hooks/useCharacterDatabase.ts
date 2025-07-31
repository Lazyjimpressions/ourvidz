import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Character, RoleplayTemplate } from '@/components/playground/RoleplaySetup';

interface SavedCharacter {
  id: string;
  user_id: string;
  name: string;
  description: string;
  traits: string;
  appearance_tags: string[];
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export const useCharacterDatabase = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveCharacterToDatabase = useCallback(async (character: Character): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('characters')
        .insert({
          user_id: user.id,
          name: character.name,
          description: `${character.personality}\n\nBackground: ${character.background}`,
          traits: `Speaking Style: ${character.speakingStyle}\nGoals: ${character.goals}\nQuirks: ${character.quirks}\nRelationships: ${character.relationships}`,
          appearance_tags: character.visualDescription ? [character.visualDescription] : [],
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save character');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCharacterFromDatabase = useCallback(async (characterId: string): Promise<Character | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

      if (error) throw error;

      // Parse the database character back into our Character format
      const [personality, background] = data.description.split('\n\nBackground: ');
      const traits = data.traits || '';
      const traitsObj = parseTraits(traits);

      return {
        id: data.id,
        name: data.name,
        role: 'ai' as const,
        personality: personality || '',
        background: background || '',
        speakingStyle: traitsObj.speakingStyle || '',
        visualDescription: data.appearance_tags?.[0] || '',
        relationships: traitsObj.relationships || '',
        goals: traitsObj.goals || '',
        quirks: traitsObj.quirks || '',
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load character');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getUserCharacters = useCallback(async (): Promise<SavedCharacter[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load characters');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteCharacter = useCallback(async (characterId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', characterId);

      if (error) throw error;
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete character');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    saveCharacterToDatabase,
    loadCharacterFromDatabase,
    getUserCharacters,
    deleteCharacter,
    isLoading,
    error,
  };
};

// Helper function to parse traits string back into individual fields
function parseTraits(traits: string) {
  const lines = traits.split('\n');
  const result: Record<string, string> = {};
  
  lines.forEach(line => {
    if (line.startsWith('Speaking Style: ')) {
      result.speakingStyle = line.replace('Speaking Style: ', '');
    } else if (line.startsWith('Goals: ')) {
      result.goals = line.replace('Goals: ', '');
    } else if (line.startsWith('Quirks: ')) {
      result.quirks = line.replace('Quirks: ', '');
    } else if (line.startsWith('Relationships: ')) {
      result.relationships = line.replace('Relationships: ', '');
    }
  });
  
  return result;
}