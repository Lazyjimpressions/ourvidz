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
  scene_type?: 'preset' | 'conversation';
  scene_name?: string;
  scene_description?: string;
  scene_rules?: string;
  scene_starters?: string[];
  system_prompt?: string;
  created_at: string;
  updated_at: string;
}

export type SceneFilter = 'all' | 'preset' | 'conversation';

export const useCharacterScenes = (characterId?: string, sceneFilter: SceneFilter = 'all') => {
  const [scenes, setScenes] = useState<CharacterScene[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadScenes = async (id: string, filter: SceneFilter = 'all') => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('character_scenes')
        .select('*')
        .eq('character_id', id);

      // Apply scene_type filter
      if (filter === 'preset') {
        query = query.eq('scene_type', 'preset');
      } else if (filter === 'conversation') {
        query = query.eq('scene_type', 'conversation');
      }
      // 'all' = no filter, returns both types

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Cast data to CharacterScene[] with proper typing
      setScenes((data || []).map(scene => ({
        ...scene,
        scene_type: (scene.scene_type === 'preset' || scene.scene_type === 'conversation') 
          ? scene.scene_type 
          : undefined
      })) as CharacterScene[]);
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
        const newScene: CharacterScene = {
          ...data,
          scene_type: (data.scene_type === 'preset' || data.scene_type === 'conversation') 
            ? data.scene_type 
            : undefined
        };
        setScenes(prev => [newScene, ...prev]);
      }
      
      return data;
    } catch (err) {
      console.error('Error creating scene:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (characterId) {
      loadScenes(characterId, sceneFilter);
    }
  }, [characterId, sceneFilter]);

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
        const updatedScene: CharacterScene = {
          ...data,
          scene_type: (data.scene_type === 'preset' || data.scene_type === 'conversation') 
            ? data.scene_type 
            : undefined
        };
        setScenes(prev => prev.map(s => s.id === sceneId ? updatedScene : s));
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