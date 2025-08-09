import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserCharacter {
  id: string;
  user_id: string;
  name: string;
  description: string;
  personality?: string;
  background?: string;
  appearance_tags?: string[];
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export const useUserCharacters = () => {
  const { user } = useAuth();
  const [characters, setCharacters] = useState<UserCharacter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUserCharacters = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', user.id)
        .eq('role', 'user')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setCharacters(data || []);
    } catch (err) {
      console.error('Error loading user characters:', err);
      setError(err instanceof Error ? err.message : 'Failed to load characters');
    } finally {
      setIsLoading(false);
    }
  };

  const createUserCharacter = async (characterData: Omit<UserCharacter, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user?.id) throw new Error('User not authenticated');
    
    try {
      const { data, error } = await supabase
        .from('characters')
        .insert({
          ...characterData,
          user_id: user.id,
          role: 'user',
          is_public: false
        })
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        setCharacters(prev => [data, ...prev]);
      }
      
      return data;
    } catch (err) {
      console.error('Error creating character:', err);
      throw err;
    }
  };

  const updateUserCharacter = async (id: string, updates: Partial<UserCharacter>) => {
    try {
      const { data, error } = await supabase
        .from('characters')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        setCharacters(prev => prev.map(char => 
          char.id === id ? { ...char, ...data } : char
        ));
      }
      
      return data;
    } catch (err) {
      console.error('Error updating character:', err);
      throw err;
    }
  };

  const deleteUserCharacter = async (id: string) => {
    try {
      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      setCharacters(prev => prev.filter(char => char.id !== id));
    } catch (err) {
      console.error('Error deleting character:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadUserCharacters();
  }, [user?.id]);

  return {
    characters,
    isLoading,
    error,
    loadUserCharacters,
    createUserCharacter,
    updateUserCharacter,
    deleteUserCharacter
  };
};