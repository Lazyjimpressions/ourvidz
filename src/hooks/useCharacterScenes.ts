import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CharacterScene {
  id: string;
  character_id: string;
  conversation_id: string;
  image_url: string;
  scene_prompt: string;
  generation_metadata: any;
  job_id?: string;
  created_at: string;
  updated_at: string;
}

export const useCharacterScenes = (characterId?: string) => {
  const [scenes, setScenes] = useState<CharacterScene[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadScenes = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('character_scenes')
        .select('*')
        .eq('character_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setScenes(data || []);
    } catch (err) {
      console.error('Error loading character scenes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scenes');
    } finally {
      setIsLoading(false);
    }
  };

  const createScene = async (sceneData: Omit<CharacterScene, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('character_scenes')
        .insert(sceneData)
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        setScenes(prev => [data, ...prev]);
      }
      
      return data;
    } catch (err) {
      console.error('Error creating scene:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (characterId) {
      loadScenes(characterId);
    }
  }, [characterId]);

  const updateScene = async (sceneId: string, updates: Partial<CharacterScene>) => {
    try {
      const { data, error } = await supabase
        .from('character_scenes')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', sceneId)
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        setScenes(prev => prev.map(s => s.id === sceneId ? data : s));
      }
      
      return data;
    } catch (err) {
      console.error('Error updating scene:', err);
      throw err;
    }
  };

  return {
    scenes,
    isLoading,
    error,
    loadScenes,
    createScene,
    updateScene
  };
};