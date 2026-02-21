
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ApiModel {
  id: string;
  display_name: string;
  model_key: string;
  version: string | null;
  modality: 'image' | 'video' | 'chat';
  task: 't2i' | 'i2i' | 't2v' | 'i2v' | 'extend' | 'multi' | 'upscale' | 'roleplay' | 'reasoning' | 'enhancement' | 'embedding' | 'vision';
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
          task,
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
        query = query.eq('task', task);
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
          task,
          model_family,
          is_default,
          priority,
          capabilities,
          input_defaults,
          api_providers!inner(name, display_name)
        `)
        .eq('is_active', true)
        .or('modality.eq.image,modality.eq.video')
        .in('task', ['t2i', 'i2i', 't2v', 'i2v', 'extend', 'multi'])
        .order('priority', { ascending: false })
        .order('display_name', { ascending: true });

      if (error) throw error;

      const models = data as ApiModel[];

      // Group by task directly — no model_key sniffing needed
      const t2i = models.filter(m => m.task === 't2i');
      const i2i = models.filter(m => m.task === 'i2i');
      const i2v = models.filter(m => m.task === 'i2v');
      const t2v = models.filter(m => m.task === 't2v');
      const extend = models.filter(m => m.task === 'extend');
      const multi = models.filter(m => m.task === 'multi');

      return { all: models, t2i, i2i, i2v, t2v, extend, multi };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
