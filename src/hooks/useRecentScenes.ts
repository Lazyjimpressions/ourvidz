import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RecentSceneDisplay {
  id: string;
  characterId?: string;
  title: string;
  backgroundImage?: string;
  characterNames: string[];
  created_at: string;
}

export const useRecentScenes = (limit: number = 12) => {
  const [scenes, setScenes] = useState<RecentSceneDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadScenes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: sceneRows, error: sceneErr } = await supabase
        .from('character_scenes')
        .select('id, image_url, scene_prompt, character_id, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (sceneErr) throw sceneErr;

      const characterIds = Array.from(
        new Set((sceneRows || []).map((r) => r.character_id).filter(Boolean) as string[])
      );

      let nameMap: Record<string, string> = {};
      if (characterIds.length > 0) {
        const { data: chars, error: charErr } = await supabase
          .from('characters')
          .select('id, name')
          .in('id', characterIds);
        if (charErr) throw charErr;
        nameMap = Object.fromEntries((chars || []).map((c) => [c.id, c.name]));
      }

      const display: RecentSceneDisplay[] = (sceneRows || []).map((r) => ({
        id: r.id,
        characterId: r.character_id || undefined,
        title: r.scene_prompt || 'Untitled Scene',
        backgroundImage: r.image_url || undefined,
        characterNames: r.character_id && nameMap[r.character_id] ? [nameMap[r.character_id]] : [],
        created_at: r.created_at,
      }));

      setScenes(display);
    } catch (err: any) {
      console.error('Error loading recent scenes:', err);
      setError(err?.message || 'Failed to load scenes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScenes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  return { scenes, isLoading, error, reload: loadScenes };
};
