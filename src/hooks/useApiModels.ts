
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ApiModel {
  id: string;
  display_name: string;
  model_key: string;
  version: string | null;
  modality: 'image' | 'video' | 'chat';
  tasks: string[];
  model_family: string | null;
  is_default: boolean;
  priority: number;
  capabilities: Record<string, any>;
  input_defaults: Record<string, any>;
  api_providers: {
    name: string;
    display_name: string;
  };
}

export const useApiModels = (modality?: string, task?: string) => {
  return useQuery({
    queryKey: ['api-models', modality, task],
    queryFn: async () => {
      let query = supabase
        .from('api_models')
        .select(`
          id,
          display_name,
          model_key,
          version,
          modality,
          tasks,
          model_family,
          is_default,
          priority,
          capabilities,
          input_defaults,
          api_providers!inner(name, display_name)
        `)
        .eq('is_active', true);

      if (modality) {
        query = query.eq('modality', modality);
      }

      if (task) {
        query = query.contains('tasks', [task]);
      }

      const { data, error } = await query
        .order('priority', { ascending: false })
        .order('display_name', { ascending: true });

      if (error) throw error;
      return data as ApiModel[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useImageModels = () => {
  return useApiModels('image', 't2i');
};

export const useVideoModels = () => {
  return useApiModels('video');
};

/** Fetches all visual models: T2I, I2I, T2V, I2V, extend, multi */
export const useAllVisualModels = () => {
  return useQuery({
    queryKey: ['api-models', 'all-visual'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_models')
        .select(`
          id,
          display_name,
          model_key,
          version,
          modality,
          tasks,
          model_family,
          is_default,
          priority,
          capabilities,
          input_defaults,
          default_for_tasks,
          api_providers!inner(name, display_name)
        `)
        .eq('is_active', true)
        .or('modality.eq.image,modality.eq.video')
        .order('priority', { ascending: false })
        .order('display_name', { ascending: true });

      if (error) throw error;

      const models = data as unknown as ApiModel[];

      // Group by tasks array — models can appear in multiple groups
      const t2i = models.filter(m => m.tasks?.includes('t2i'));
      const i2i = models.filter(m => m.tasks?.includes('i2i'));
      const i2v = models.filter(m => m.tasks?.includes('i2v'));
      const t2v = models.filter(m => m.tasks?.includes('t2v'));
      const extend = models.filter(m => m.tasks?.includes('extend'));
      const multi = models.filter(m => m.tasks?.includes('multi'));

      return { all: models, t2i, i2i, i2v, t2v, extend, multi };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
