import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

export interface UserCharacter {
  id: string;
  user_id: string;
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
  role: string;
  content_rating: string;
  gender?: string;
  created_at: string;
  updated_at: string;
}

export const useUserCharacters = () => {
  const { user } = useAuth();
  const [characters, setCharacters] = useState<UserCharacter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: isAdmin } = useQuery({
    queryKey: ['user-admin-role', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();
      return !!data;
    },
    enabled: !!user,
  });

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

  const createUserCharacter = async (characterData: Pick<UserCharacter, 'name' | 'description' | 'traits' | 'appearance_tags' | 'persona' | 'image_url' | 'gender'>) => {
    if (!user?.id) throw new Error('User not authenticated');
    
    try {
      const { data, error } = await supabase
        .from('characters')
        .insert({
          ...characterData,
          user_id: user.id,
          role: 'user',
          is_public: false,
          likes_count: 0,
          interaction_count: 0,
          content_rating: 'sfw'
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
      let query = supabase
        .from('characters')
        .update(updates)
        .eq('id', id);
      
      // Only add user_id filter if not admin
      if (!isAdmin) {
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query.select().single();

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