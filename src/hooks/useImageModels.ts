import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocalModelHealth } from './useLocalModelHealth';

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
  avg_generation_time?: number;
  cost_per_use?: number;
  /** 
   * Capabilities JSONB from api_models table. Contains input_schema, 
   * requires_image_urls_array, supports_i2i, safety_checker_param, 
   * uses_strength_param, supports_i2v, char_limit, etc.
   * Kept as Record<string, any> since the schema is table-driven and evolves.
   */
  capabilities?: Record<string, any>;
}

export interface ImageModelOption {
  value: string;
  label: string;
  type: 'local' | 'api';
  isAvailable: boolean;
  avg_generation_time?: number;
  cost_per_use?: number;
  capabilities?: ImageModel['capabilities'];
  maxImages?: number; // Max batch size supported by this model
}

export const useImageModels = (hasReferenceImage?: boolean) => {
  const [imageModels, setImageModels] = useState<ImageModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { sdxlWorker } = useLocalModelHealth();

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
            avg_generation_time,
            cost_per_use,
            capabilities,
            api_providers!inner(name, display_name)
          `)
          .eq('modality', 'image')
          .eq('is_active', true)
          .order('priority', { ascending: true });

        if (error) {
          throw error;
        }

        const formattedModels = data
          .map(model => ({
            ...model,
            provider_name: model.api_providers.name,
            provider_display_name: model.api_providers.display_name,
            capabilities: model.capabilities as ImageModel['capabilities'] || {}
          }))
          // NEW: Filter by I2I capability when reference image exists
          .filter(model => {
            if (hasReferenceImage) {
              // Show models that explicitly support I2I
              const supportsI2I = model.capabilities?.supports_i2i === true;
              // Also include models with reference_images capability (backward compat)
              const hasReferenceImages = model.capabilities?.reference_images === true;
              // Include local SDXL (always supports I2I)
              return supportsI2I || hasReferenceImages;
            }
            // T2I mode: show all models (no filtering)
            return true;
          });

        setImageModels(formattedModels);
      } catch (err) {
        console.error('Error loading image models:', err);
        setError(err instanceof Error ? err.message : 'Failed to load image models');
      } finally {
        setIsLoading(false);
      }
    };

    loadImageModels();
  }, [hasReferenceImage]);  // NEW: Dependency on reference image

  // Create model options for UI components
  // Include local SDXL model (always listed, but marked unavailable if worker is down)
  const localModelOptions: ImageModelOption[] = [
    {
      value: 'sdxl',
      label: sdxlWorker.isAvailable ? 'SDXL (Local)' : 'SDXL (Local - Offline)',
      type: 'local',
      isAvailable: sdxlWorker.isAvailable,
      avg_generation_time: 6,  // ~6 seconds
      cost_per_use: 0,         // Free
      maxImages: 1,            // Local SDXL: single image only
      capabilities: {
        nsfw: true,
        speed: 'fast',
        cost: 'free',
        quality: 'high',
        reference_images: true,
        supports_i2i: true,  // Local SDXL always supports I2I
        seed_control: true
      }
    }
  ];

  const apiModelOptions: ImageModelOption[] = imageModels.map(model => {
    const caps = (model.capabilities || {}) as Record<string, any>;
    const inputSchema = caps.input_schema || {};
    const maxImages = inputSchema?.num_images?.max || 1;
    return {
      value: model.id,
      label: `${model.display_name} (${model.provider_display_name})`,
      type: 'api' as const,
      isAvailable: true,
      avg_generation_time: model.avg_generation_time,
      cost_per_use: model.cost_per_use,
      capabilities: caps as ImageModel['capabilities'],
      maxImages
    };
  });

  const modelOptions: ImageModelOption[] = [...localModelOptions, ...apiModelOptions];

  // Default model is ALWAYS a non-local (API) model to ensure reliability
  // This is the model used when no valid selection is made
  const defaultModel: ImageModelOption | null = apiModelOptions.find(m =>
    imageModels.find(im => im.id === m.value && im.is_default)
  ) || apiModelOptions[0] || null;

  return {
    imageModels,
    modelOptions,
    defaultModel, // NEW: Always returns a reliable non-local default
    isLoading,
    error,
    sdxlWorkerHealthy: sdxlWorker.isAvailable, // NEW: Expose health status
    refetch: () => {
      setIsLoading(true);
      setError(null);
      // Trigger reload by updating a dependency
      setImageModels([]);
    }
  };
};