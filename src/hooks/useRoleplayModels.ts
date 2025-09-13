import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RoleplayModel {
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
}

export interface ModelOption {
  value: string;
  label: string;
  description: string;
  provider: string;
  isLocal: boolean;
}

export const useRoleplayModels = () => {
  const [apiModels, setApiModels] = useState<RoleplayModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local models (always available)
  const localModels: ModelOption[] = [
    {
      value: 'qwen-local',
      label: 'Qwen 2.5-7B-Instruct (Local)',
      description: 'Local model - fast & private',
      provider: 'Local',
      isLocal: true
    }
  ];

  // Load API models from database
  useEffect(() => {
    const loadApiModels = async () => {
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
            api_providers!inner(name, display_name)
          `)
          .eq('modality', 'roleplay')
          .eq('is_active', true)
          .order('priority', { ascending: true });

        if (error) {
          console.error('Error loading API models:', error);
          setError('Failed to load API models');
          return;
        }

        const formattedModels = data.map(model => ({
          ...model,
          provider_name: model.api_providers.name,
          provider_display_name: model.api_providers.display_name
        }));

        setApiModels(formattedModels);
      } catch (error) {
        console.error('Error in loadApiModels:', error);
        setError('Failed to load API models');
      } finally {
        setIsLoading(false);
      }
    };

    loadApiModels();
  }, []);

  // Convert API models to ModelOption format
  const apiModelOptions: ModelOption[] = apiModels.map(model => ({
    value: model.model_key,
    label: model.display_name,
    description: getModelDescription(model),
    provider: model.provider_display_name,
    isLocal: false
  }));

  // Combine local and API models
  const allModelOptions = [...localModels, ...apiModelOptions];

  return {
    localModels,
    apiModels,
    allModelOptions,
    isLoading,
    error,
    refresh: () => {
      // Trigger reload by updating a dependency
      setApiModels([]);
      setIsLoading(true);
    }
  };
};

// Helper function to generate model descriptions
const getModelDescription = (model: RoleplayModel): string => {
  if (model.provider_name === 'openrouter') {
    if (model.model_key.includes('venice-edition')) {
      return 'Most uncensored model with user control over alignment';
    }
    if (model.model_key.includes('dolphin-3.0-r1')) {
      return 'Advanced reasoning model trained on 800k reasoning traces';
    }
    if (model.model_key.includes('dolphin-3.0')) {
      return 'General-purpose uncensored instruct model';
    }
    return 'Uncensored model optimized for unrestricted roleplay';
  }

  return 'AI model for roleplay conversations';
};
