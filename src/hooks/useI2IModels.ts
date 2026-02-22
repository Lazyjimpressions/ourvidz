import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface I2IModel {
  id: string;
  model_key: string;
  display_name: string;
  tasks: string[];
  is_active: boolean;
  is_default: boolean;
  priority: number;
  provider_name: string;
  provider_display_name: string;
  capabilities?: {
    supports_i2i?: boolean;
    uses_strength_param?: boolean;
    nsfw_status?: string;
    requires_image_urls_array?: boolean;
  };
}

export interface I2IModelOption {
  value: string;
  label: string;
  isAvailable: boolean;
  isDefault: boolean;
  supportsMultiRef: boolean;
  capabilities?: I2IModel['capabilities'];
}

/**
 * Hook to load I2I (Image-to-Image) models for scene iteration.
 * Pass filterTask to narrow results (e.g. 'i2i_multi' for multi-ref only).
 */
export const useI2IModels = (filterTask: 'i2i' | 'i2i_multi' = 'i2i') => {
  const [i2iModels, setI2IModels] = useState<I2IModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadI2IModels = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Query for models whose tasks array contains the requested task
        const { data, error } = await supabase
          .from('api_models')
          .select(`
            id,
            model_key,
            display_name,
            tasks,
            is_active,
            is_default,
            priority,
            capabilities,
            default_for_tasks,
            api_providers!inner(name, display_name)
          `)
          .contains('tasks', [filterTask])
          .eq('is_active', true)
          .order('priority', { ascending: true });

        if (error) {
          throw error;
        }

        const formattedModels: I2IModel[] = (data || []).map(model => ({
          id: model.id,
          model_key: model.model_key,
          display_name: model.display_name,
          tasks: model.tasks,
          is_active: model.is_active,
          is_default: model.is_default,
          priority: model.priority,
          provider_name: model.api_providers.name,
          provider_display_name: model.api_providers.display_name,
          capabilities: model.capabilities as I2IModel['capabilities'] || {}
        }));

        setI2IModels(formattedModels);
      } catch (err) {
        console.error('Error loading I2I models:', err);
        setError(err instanceof Error ? err.message : 'Failed to load I2I models');
      } finally {
        setIsLoading(false);
      }
    };

    loadI2IModels();
  }, [filterTask]);

  // Create model options for UI
  const modelOptions: I2IModelOption[] = [
    // Auto option - uses the default I2I model automatically
    {
      value: 'auto',
      label: 'Auto (Use Default)',
      isAvailable: true,
      isDefault: true,
      supportsMultiRef: true,
      capabilities: {}
    },
    // Add all loaded I2I models
    ...i2iModels.map(model => ({
      value: model.id,
      label: `${model.display_name} (${model.provider_display_name})`,
      isAvailable: true,
      isDefault: model.is_default,
      supportsMultiRef: model.tasks.includes('i2i_multi'),
      capabilities: model.capabilities
    }))
  ];

  // Default model is the one marked as default, or the first available
  const defaultModel: I2IModelOption | null = 
    modelOptions.find(m => m.value !== 'auto' && i2iModels.find(im => im.id === m.value && im.is_default)) 
    || modelOptions.find(m => m.value !== 'auto') 
    || null;

  return {
    i2iModels,
    modelOptions,
    defaultModel,
    isLoading,
    error
  };
};
