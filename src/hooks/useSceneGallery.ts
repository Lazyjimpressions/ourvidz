import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SceneTemplate, SceneTemplateFilter, ContentRating } from '@/types/roleplay';

/**
 * Hook for fetching and managing scene templates in the Scene Gallery
 * Supports filtering, pagination, and CRUD operations
 *
 * @param filter - Filter type ('all', 'sfw', 'nsfw', 'popular', 'recent')
 * @param limit - Maximum number of scenes to fetch (default: 20)
 */
export const useSceneGallery = (
  filter: SceneTemplateFilter = 'all',
  limit: number = 20
) => {
  const { user } = useAuth();
  const [scenes, setScenes] = useState<SceneTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadScenes = useCallback(async (currentFilter: SceneTemplateFilter = filter) => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('scenes')
        .select('*');

      // Apply content rating filter
      if (currentFilter === 'sfw') {
        query = query.eq('content_rating', 'sfw');
      } else if (currentFilter === 'nsfw') {
        query = query.eq('content_rating', 'nsfw');
      }

      // Apply ordering based on filter
      if (currentFilter === 'popular') {
        query = query.order('usage_count', { ascending: false });
      } else {
        // Default to recent
        query = query.order('created_at', { ascending: false });
      }

      query = query.limit(limit);

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transform database rows to SceneTemplate type
      const templates: SceneTemplate[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        creator_id: row.creator_id,
        scenario_type: row.scenario_type,
        setting: row.setting,
        atmosphere: row.atmosphere as SceneTemplate['atmosphere'],
        time_of_day: row.time_of_day,
        min_characters: row.min_characters ?? 1,
        max_characters: row.max_characters ?? 2,
        suggested_user_role: row.suggested_user_role,
        content_rating: (row.content_rating || 'sfw') as ContentRating,
        tags: row.tags || [],
        is_public: row.is_public ?? true,
        usage_count: row.usage_count ?? 0,
        preview_image_url: row.preview_image_url,
        scene_starters: row.scene_starters || [],
        scene_prompt: row.scene_prompt,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      setScenes(templates);
    } catch (err) {
      console.error('❌ Error loading scene gallery:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scenes');
    } finally {
      setIsLoading(false);
    }
  }, [filter, limit]);

  /**
   * Create a new scene template
   */
  const createScene = async (
    sceneData: Omit<SceneTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'>
  ): Promise<SceneTemplate | null> => {
    if (!user?.id) {
      setError('Must be logged in to create scenes');
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('scenes')
        .insert({
          ...sceneData,
          creator_id: user.id,
          usage_count: 0
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newScene: SceneTemplate = {
        id: data.id,
        name: data.name,
        description: data.description,
        creator_id: data.creator_id,
        scenario_type: data.scenario_type,
        setting: data.setting,
        atmosphere: data.atmosphere,
        time_of_day: data.time_of_day,
        min_characters: data.min_characters ?? 1,
        max_characters: data.max_characters ?? 2,
        suggested_user_role: data.suggested_user_role,
        content_rating: data.content_rating || 'sfw',
        tags: data.tags || [],
        is_public: data.is_public ?? true,
        usage_count: 0,
        preview_image_url: data.preview_image_url,
        scene_starters: data.scene_starters || [],
        scene_prompt: data.scene_prompt,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      setScenes(prev => [newScene, ...prev]);
      return newScene;
    } catch (err) {
      console.error('❌ Error creating scene:', err);
      setError(err instanceof Error ? err.message : 'Failed to create scene');
      return null;
    }
  };

  /**
   * Update an existing scene template
   */
  const updateScene = async (
    sceneId: string,
    updates: Partial<Omit<SceneTemplate, 'id' | 'created_at' | 'creator_id'>>
  ): Promise<SceneTemplate | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from('scenes')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', sceneId)
        .select()
        .single();

      if (updateError) throw updateError;

      const updatedScene: SceneTemplate = {
        id: data.id,
        name: data.name,
        description: data.description,
        creator_id: data.creator_id,
        scenario_type: data.scenario_type,
        setting: data.setting,
        atmosphere: data.atmosphere,
        time_of_day: data.time_of_day,
        min_characters: data.min_characters ?? 1,
        max_characters: data.max_characters ?? 2,
        suggested_user_role: data.suggested_user_role,
        content_rating: data.content_rating || 'sfw',
        tags: data.tags || [],
        is_public: data.is_public ?? true,
        usage_count: data.usage_count ?? 0,
        preview_image_url: data.preview_image_url,
        scene_starters: data.scene_starters || [],
        scene_prompt: data.scene_prompt,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      setScenes(prev => prev.map(s => s.id === sceneId ? updatedScene : s));
      return updatedScene;
    } catch (err) {
      console.error('❌ Error updating scene:', err);
      setError(err instanceof Error ? err.message : 'Failed to update scene');
      return null;
    }
  };

  /**
   * Delete a scene template
   */
  const deleteScene = async (sceneId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('scenes')
        .delete()
        .eq('id', sceneId);

      if (deleteError) throw deleteError;

      setScenes(prev => prev.filter(s => s.id !== sceneId));
      return true;
    } catch (err) {
      console.error('❌ Error deleting scene:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete scene');
      return false;
    }
  };

  /**
   * Increment usage count when a scene is used
   */
  const incrementUsage = async (sceneId: string): Promise<void> => {
    try {
      const { error: rpcError } = await supabase.rpc('increment_scene_usage', {
        scene_id: sceneId
      });

      // If RPC doesn't exist, do manual update
      if (rpcError) {
        await supabase
          .from('scenes')
          .update({ usage_count: supabase.rpc('increment', { x: 1 }) })
          .eq('id', sceneId);
      }

      // Update local state
      setScenes(prev => prev.map(s =>
        s.id === sceneId ? { ...s, usage_count: s.usage_count + 1 } : s
      ));
    } catch (err) {
      // Non-critical error, just log it
      console.warn('Could not increment scene usage:', err);
    }
  };

  /**
   * Search scenes by name or tags
   */
  const searchScenes = async (query: string): Promise<SceneTemplate[]> => {
    if (!query.trim()) {
      await loadScenes();
      return scenes;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: searchError } = await supabase
        .from('scenes')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (searchError) throw searchError;

      const templates: SceneTemplate[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        creator_id: row.creator_id,
        scenario_type: row.scenario_type,
        setting: row.setting,
        atmosphere: row.atmosphere,
        time_of_day: row.time_of_day,
        min_characters: row.min_characters ?? 1,
        max_characters: row.max_characters ?? 2,
        suggested_user_role: row.suggested_user_role,
        content_rating: row.content_rating || 'sfw',
        tags: row.tags || [],
        is_public: row.is_public ?? true,
        usage_count: row.usage_count ?? 0,
        preview_image_url: row.preview_image_url,
        scene_starters: row.scene_starters || [],
        scene_prompt: row.scene_prompt,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      setScenes(templates);
      return templates;
    } catch (err) {
      console.error('❌ Error searching scenes:', err);
      setError(err instanceof Error ? err.message : 'Failed to search scenes');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Load scenes on mount and when filter changes
  useEffect(() => {
    loadScenes(filter);
  }, [filter, loadScenes]);

  return {
    scenes,
    isLoading,
    error,
    loadScenes,
    createScene,
    updateScene,
    deleteScene,
    incrementUsage,
    searchScenes
  };
};
