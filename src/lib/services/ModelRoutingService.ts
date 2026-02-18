import { supabase } from '@/integrations/supabase/client';

/**
 * Unified model representation for both chat and image models
 */
export interface UnifiedModel {
  id: string;
  modelKey: string;
  displayName: string;
  provider: 'openrouter' | 'replicate' | 'local';
  providerDisplayName: string;
  modality: 'roleplay' | 'image';
  isLocal: boolean;
  isAvailable: boolean;
  isDefault: boolean;
  priority: number;
  capabilities: {
    speed?: 'fast' | 'medium' | 'slow';
    cost?: 'free' | 'low' | 'medium' | 'high';
    nsfw?: boolean;
    quality?: 'high' | 'medium' | 'low';
  };
}

/**
 * Model route with fallback information
 */
export interface ModelRoute {
  primary: UnifiedModel | null;
  fallback: UnifiedModel | null;
  useFallback: boolean;
  reason?: string;
}

/**
 * Default OpenRouter chat models (in priority order)
 */
export const DEFAULT_CHAT_MODELS = [
  {
    modelKey: 'cognitivecomputations/dolphin3.0-r1-mistral-24b:free',
    displayName: 'Dolphin 3.0 R1 Mistral 24B (Free)',
    tier: 'free',
    description: 'Advanced uncensored reasoning model with strong roleplay capabilities'
  },
  {
    modelKey: 'cognitivecomputations/dolphin3.0-mistral-24b:free',
    displayName: 'Dolphin 3.0 Mistral 24B (Free)',
    tier: 'free',
    description: 'General-purpose uncensored instruct model'
  },
  {
    modelKey: 'gryphe/mythomax-l2-13b',
    displayName: 'MythoMax 13B',
    tier: 'free',
    description: 'Creative roleplay model with excellent storytelling'
  },
  {
    modelKey: 'nothingiisreal/mn-celeste-12b',
    displayName: 'Mistral Nemo 12B Celeste (Free)',
    tier: 'free',
    description: 'Lightweight creative writing model'
  },
  {
    modelKey: 'neversleep/llama-3-lumimaid-70b',
    displayName: 'Llama 3 Lumimaid 70B (Premium)',
    tier: 'paid',
    description: 'NeverSleep roleplay finetune'
  }
];

/**
 * Centralized service for model routing decisions
 * Handles fallback logic, health checks, and default model selection
 */
export class ModelRoutingService {
  /**
   * Get the default chat model (always returns a non-local OpenRouter model)
   * This ensures chat always works even when local workers are down
   */
  static getDefaultChatModelKey(): string {
    return DEFAULT_CHAT_MODELS[0].modelKey;
  }

  /**
   * Get the default chat model with full info
   */
  static getDefaultChatModel(): UnifiedModel {
    const defaultModel = DEFAULT_CHAT_MODELS[0];
    return {
      id: defaultModel.modelKey,
      modelKey: defaultModel.modelKey,
      displayName: defaultModel.displayName,
      provider: 'openrouter',
      providerDisplayName: 'OpenRouter',
      modality: 'roleplay',
      isLocal: false,
      isAvailable: true,
      isDefault: true,
      priority: 0,
      capabilities: {
        speed: 'medium',
        cost: 'free',
        nsfw: true,
        quality: 'high'
      }
    };
  }

  /**
   * Get the default image model from database
   * Returns first active Replicate model, or null if none configured
   */
  static async getDefaultImageModel(): Promise<UnifiedModel | null> {
    try {
      const { data, error } = await supabase
        .from('api_models')
        .select(`
          id,
          model_key,
          display_name,
          modality,
          is_default,
          priority,
          capabilities,
          api_providers!inner(name, display_name)
        `)
        .eq('modality', 'image')
        .eq('is_active', true)
        .eq('api_providers.name', 'replicate')
        .contains('default_for_tasks', ['generation'])
        .order('priority', { ascending: true })
        .limit(1)
        .single();

      if (error || !data) {
        console.warn('No default Replicate image model found');
        return null;
      }

      return {
        id: data.id,
        modelKey: data.model_key,
        displayName: data.display_name,
        provider: 'replicate',
        providerDisplayName: (data as any).api_providers.display_name,
        modality: 'image',
        isLocal: false,
        isAvailable: true,
        isDefault: data.is_default,
        priority: data.priority,
        capabilities: (data.capabilities as UnifiedModel['capabilities']) || {
          nsfw: true,
          quality: 'high'
        }
      };
    } catch (error) {
      console.error('Error fetching default image model:', error);
      return null;
    }
  }

  /**
   * Build a chat model route with fallback
   * If local model is selected but unavailable, provides OpenRouter fallback
   */
  static buildChatRoute(
    selectedModelKey: string | null,
    localHealthy: boolean,
    availableModels: UnifiedModel[]
  ): ModelRoute {
    // If no model selected, use default
    if (!selectedModelKey) {
      return {
        primary: this.getDefaultChatModel(),
        fallback: null,
        useFallback: false,
        reason: 'No model selected, using default'
      };
    }

    // Check if selected model is local (qwen-local)
    const isLocalModel = selectedModelKey === 'qwen-local' || selectedModelKey === 'chat_worker';

    if (isLocalModel) {
      if (localHealthy) {
        // Local model available, but still provide fallback
        const fallbackModel = availableModels.find(m => !m.isLocal) || this.getDefaultChatModel();
        return {
          primary: {
            id: 'qwen-local',
            modelKey: 'qwen-local',
            displayName: 'Qwen 2.5-7B-Instruct (Local)',
            provider: 'local',
            providerDisplayName: 'Local',
            modality: 'roleplay',
            isLocal: true,
            isAvailable: true,
            isDefault: false,
            priority: 0,
            capabilities: { speed: 'fast', cost: 'free', nsfw: true, quality: 'high' }
          },
          fallback: fallbackModel,
          useFallback: false
        };
      } else {
        // Local model NOT available, use fallback
        const fallbackModel = availableModels.find(m => !m.isLocal) || this.getDefaultChatModel();
        return {
          primary: null,
          fallback: fallbackModel,
          useFallback: true,
          reason: 'Local chat worker unavailable, using OpenRouter fallback'
        };
      }
    }

    // API model selected
    const selectedModel = availableModels.find(m => m.modelKey === selectedModelKey);
    if (selectedModel) {
      return {
        primary: selectedModel,
        fallback: this.getDefaultChatModel(),
        useFallback: false
      };
    }

    // Selected model not found, use default
    return {
      primary: this.getDefaultChatModel(),
      fallback: null,
      useFallback: false,
      reason: `Model '${selectedModelKey}' not found, using default`
    };
  }

  /**
   * Build an image model route with fallback
   * If local SDXL is selected but unavailable, provides Replicate fallback
   */
  static async buildImageRoute(
    selectedModelId: string | null,
    localHealthy: boolean,
    availableModels: { value: string; type: 'local' | 'api' }[]
  ): Promise<ModelRoute> {
    // If no model selected or 'sdxl' selected, check local health
    if (!selectedModelId || selectedModelId === 'sdxl') {
      if (localHealthy) {
        const fallback = await this.getDefaultImageModel();
        return {
          primary: {
            id: 'sdxl',
            modelKey: 'sdxl',
            displayName: 'SDXL (Local)',
            provider: 'local',
            providerDisplayName: 'Local',
            modality: 'image',
            isLocal: true,
            isAvailable: true,
            isDefault: false,
            priority: 0,
            capabilities: { speed: 'fast', cost: 'free', nsfw: true, quality: 'high' }
          },
          fallback,
          useFallback: false
        };
      } else {
        // Local not available, use Replicate fallback
        const fallback = await this.getDefaultImageModel();
        return {
          primary: null,
          fallback,
          useFallback: true,
          reason: 'Local SDXL worker unavailable, using Replicate fallback'
        };
      }
    }

    // API model selected by UUID
    const defaultModel = await this.getDefaultImageModel();
    return {
      primary: defaultModel ? {
        ...defaultModel,
        id: selectedModelId
      } : null,
      fallback: defaultModel,
      useFallback: false
    };
  }

  /**
   * Check if a model key refers to a local model
   */
  static isLocalModel(modelKey: string): boolean {
    return modelKey === 'qwen-local' || modelKey === 'chat_worker' || modelKey === 'sdxl';
  }

  /**
   * Get the provider type from a model key
   */
  static getProviderFromModelKey(modelKey: string): 'local' | 'openrouter' | 'replicate' | 'unknown' {
    if (this.isLocalModel(modelKey)) return 'local';
    if (modelKey.includes('/')) return 'openrouter'; // OpenRouter format: org/model
    return 'unknown';
  }
}
