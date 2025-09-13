import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ImageModel {
  id: string;
  model_key: string;
  display_name: string;
  modality: string;
  task: string;
  model_family: string;
  is_active: boolean;
  is_default: boolean;
  priority: number;
  provider_name: string;
  provider_display_name: string;
  capabilities?: {
    nsfw?: boolean;
    speed?: string;
    cost?: string;
    quality?: string;
    reference_images?: boolean;
    seed_control?: boolean;
  };
}

export const useImageModels = () => {
  const [imageModels, setImageModels] = useState<ImageModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadImageModels = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('api_models')
          .select(`
            id,
            model_key,
            display_name,
            modality,
            task,
            model_family,
            is_active,
            is_default,
            priority,
            capabilities,
            api_providers!inner(name, display_name)
          `)
          .eq('modality', 'image')
          .eq('is_active', true)
          .order('priority', { ascending: true });

        if (error) {
          throw error;
        }

        const formattedModels = data.map(model => ({
          ...model,
          provider_name: model.api_providers.name,
          provider_display_name: model.api_providers.display_name
        }));

        setImageModels(formattedModels);
      } catch (err) {
        console.error('Error loading image models:', err);
        setError(err instanceof Error ? err.message : 'Failed to load image models');
      } finally {
        setIsLoading(false);
      }
    };

    loadImageModels();
  }, []);

  // Create model options for UI components
  const modelOptions = [
    {
      value: 'sdxl',
      label: 'SDXL (Local)',
      type: 'local' as const,
      capabilities: {
        nsfw: true,
        speed: 'fast',
        cost: 'free',
        quality: 'high',
        reference_images: true,
        seed_control: true
      }
    },
    ...imageModels.map(model => ({
      value: model.id,
      label: `${model.display_name} (${model.provider_display_name})`,
      type: 'api' as const,
      capabilities: model.capabilities
    }))
  ];

  return {
    imageModels,
    modelOptions,
    isLoading,
    error,
    refetch: () => {
      setIsLoading(true);
      setError(null);
      // Trigger reload by updating a dependency
      setImageModels([]);
    }
  };
};