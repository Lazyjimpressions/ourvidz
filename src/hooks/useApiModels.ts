
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ApiModel {
  id: string;
  display_name: string;
  model_key: string;
  version: string | null;
  modality: 'image' | 'video' | 'chat' | 'prompt' | 'audio' | 'embedding' | 'roleplay';
  task: 'generation' | 'enhancement' | 'moderation' | 'style_transfer' | 'upscale' | 'roleplay' | 'tts' | 'stt' | 'chat' | 'embedding';
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
  return useApiModels('image', 'generation');
};

export const useVideoModels = () => {
  return useApiModels('video', 'generation');
};
