import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocalModelHealth } from './useLocalModelHealth';

export interface RoleplayModel {
  id: string;
  model_key: string;
  display_name: string;
  modality: string;
  tasks: string[];
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
  isAvailable: boolean; // NEW: indicates if model is currently available
  capabilities?: {
    speed?: 'fast' | 'medium' | 'slow';
    cost?: 'free' | 'low' | 'medium' | 'high';
    nsfw?: boolean;
    quality?: 'high' | 'medium' | 'low';
  };
  metadata?: {
    model_family?: string;
    priority?: number;
    is_default?: boolean;
  };
}

export const useRoleplayModels = () => {
  const [apiModels, setApiModels] = useState<RoleplayModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { chatWorker } = useLocalModelHealth();

  // Local models - always included but marked unavailable if worker is down
  const localModels: ModelOption[] = [
    {
      value: 'qwen-local',
      label: 'Qwen 2.5-7B-Instruct (Local)',
      description: chatWorker.isAvailable
        ? 'Local model - fast & private'
        : 'Local model - currently offline',
      provider: 'Local',
      isLocal: true,
      isAvailable: chatWorker.isAvailable, // Health-based availability
      capabilities: {
        speed: 'fast',
        cost: 'free',
        nsfw: true,
        quality: 'high'
      },
      metadata: {
        model_family: 'qwen',
        priority: 0,
        is_default: false
      }
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
            tasks,
            model_family,
            is_active,
            is_default,
            priority,
            api_providers!inner(name, display_name)
          `)
          .eq('modality', 'chat')
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
  const databaseModelOptions: ModelOption[] = apiModels.map(model => {
    // Extract capabilities from model if available
    const capabilities = (model as any).capabilities || {};

    return {
      value: model.model_key,
      label: model.display_name,
      description: getModelDescription(model),
      provider: model.provider_display_name,
      isLocal: false,
      isAvailable: true, // API models are always available
      capabilities: {
        speed: capabilities.speed || (model.provider_name === 'openrouter' ? 'medium' : 'fast'),
        cost: capabilities.cost || (model.provider_name === 'openrouter' ? 'free' : 'low'),
        nsfw: capabilities.nsfw !== undefined ? capabilities.nsfw : true,
        quality: capabilities.quality || 'high'
      },
      metadata: {
        model_family: model.model_family || undefined,
        priority: model.priority,
        is_default: model.is_default
      }
    };
  });

  // API model options come exclusively from the database — no hardcoded fallbacks
  const apiModelOptions: ModelOption[] = databaseModelOptions;

  // Combine local and API models
  // Local models are included but may be marked unavailable
  const allModelOptions = [...localModels, ...apiModelOptions];

  // Default model is ALWAYS a non-local (API) model to ensure reliability
  // Resolved from DB only — if no DB models exist, defaultModel is undefined
  const defaultModel: ModelOption | undefined = apiModelOptions.find(m => m.metadata?.is_default)
    || apiModelOptions[0];

  return {
    localModels,
    apiModels,
    allModelOptions,
    defaultModel, // NEW: Always returns a reliable non-local default
    isLoading,
    error,
    chatWorkerHealthy: chatWorker.isAvailable, // NEW: Expose health status
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
