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
  voice_examples?: string[];
  forbidden_phrases?: string[];
  scene_behavior_rules?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const useUserCharacters = () => {
  const { user } = useAuth();
  const [characters, setCharacters] = useState<UserCharacter[]>([]);
  const [defaultCharacterId, setDefaultCharacterId] = useState<string | null>(null);
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

  const createUserCharacter = async (characterData: Partial<Omit<UserCharacter, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & Pick<UserCharacter, 'name' | 'description'>) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      // Extract known fields, let the rest pass through
      const {
        name,
        description,
        traits,
        appearance_tags,
        persona,
        image_url,
        gender,
        voice_tone,
        mood,
        content_rating,
        reference_image_url,
        ...rest
      } = characterData;

      const { data, error } = await supabase
        .from('characters')
        .insert({
          name,
          description,
          traits,
          appearance_tags,
          persona,
          image_url,
          gender,
          voice_tone,
          mood,
          reference_image_url,
          content_rating: content_rating || 'nsfw', // Default to NSFW per plan
          user_id: user.id,
          role: 'user',
          is_public: false,
          likes_count: 0,
          interaction_count: 0,
          // Include scene_behavior_rules if present
          ...(rest.scene_behavior_rules && { scene_behavior_rules: rest.scene_behavior_rules }),
          // Include voice_examples and forbidden_phrases if present
          ...(rest.voice_examples && { voice_examples: rest.voice_examples }),
          ...(rest.forbidden_phrases && { forbidden_phrases: rest.forbidden_phrases })
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

      // If deleted character was the default, clear it
      if (defaultCharacterId === id) {
        setDefaultCharacterId(null);
      }
    } catch (err) {
      console.error('Error deleting character:', err);
      throw err;
    }
  };

  // Load default user character from profile
  const loadDefaultCharacter = async () => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('default_user_character_id')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading default character:', error);
        return null;
      }

      setDefaultCharacterId(data?.default_user_character_id || null);
      return data?.default_user_character_id || null;
    } catch (err) {
      console.error('Error loading default character:', err);
      return null;
    }
  };

  // Set default user character in profile
  const setDefaultCharacter = async (characterId: string | null) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ default_user_character_id: characterId })
        .eq('id', user.id);

      if (error) throw error;

      setDefaultCharacterId(characterId);
      console.log('✅ Default user character updated:', characterId);
    } catch (err) {
      console.error('Error setting default character:', err);
      throw err;
    }
  };

  // Get the default character object
  const getDefaultCharacter = (): UserCharacter | null => {
    if (!defaultCharacterId) return null;
    return characters.find(c => c.id === defaultCharacterId) || null;
  };

  useEffect(() => {
    loadUserCharacters();
    loadDefaultCharacter();
  }, [user?.id]);

  return {
    characters,
    isLoading,
    error,
    loadUserCharacters,
    createUserCharacter,
    updateUserCharacter,
    deleteUserCharacter,
    // Default character management
    defaultCharacterId,
    getDefaultCharacter,
    setDefaultCharacter,
    loadDefaultCharacter
  };
};