import { useState, useEffect, useCallback, useRef } from 'react';
import { useRoleplayModels } from '@/hooks/useRoleplayModels';
import { useImageModels } from '@/hooks/useImageModels';
import { useUserCharacters } from '@/hooks/useUserCharacters';
import { ConsistencySettings } from '@/services/ImageConsistencyService';
import { SceneStyle } from '@/types/roleplay';

const STORAGE_KEY = 'roleplay-settings';

interface RoleplaySettings {
  memoryTier: 'conversation' | 'character' | 'profile';
  modelProvider: string;
  selectedImageModel: string;
  selectedI2IModel: string;
  consistencySettings: ConsistencySettings;
  userCharacterId: string | null;
  sceneStyle: SceneStyle;
}

const DEFAULT_CONSISTENCY_SETTINGS: ConsistencySettings = {
  method: 'hybrid',
  reference_strength: 0.35,
  denoise_strength: 0.25,
  modify_strength: 0.5
};

const DEFAULT_SETTINGS: RoleplaySettings = {
  memoryTier: 'conversation',
  // Start safe while models load; edge function will fall back to OpenRouter if local worker is unhealthy
  modelProvider: '',
  selectedImageModel: '',
  selectedI2IModel: 'auto',
  consistencySettings: DEFAULT_CONSISTENCY_SETTINGS,
  userCharacterId: null,
  sceneStyle: 'character_only'
};

interface UseRoleplaySettingsResult {
  settings: RoleplaySettings;
  updateSettings: (updates: Partial<RoleplaySettings>) => void;
  saveSettings: () => void;
  resetSettings: () => void;
  isLoading: boolean;
  // Model info
  chatWorkerHealthy: boolean;
  sdxlWorkerHealthy: boolean;
  chatModels: Array<{ value: string; label: string; isAvailable: boolean; isLocal: boolean }>;
  imageModels: Array<{ value: string; label: string; isAvailable: boolean; type: string }>;
  userCharacters: Array<{ id: string; name: string; image_url?: string; gender?: string }>;
}

export const useRoleplaySettings = (): UseRoleplaySettingsResult => {
  const [settings, setSettings] = useState<RoleplaySettings>(DEFAULT_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);
  const hasInitialized = useRef(false);

  // Load models from database
  const {
    allModelOptions: chatModels,
    defaultModel: defaultChatModel,
    isLoading: chatModelsLoading,
    chatWorkerHealthy
  } = useRoleplayModels();

  const {
    modelOptions: imageModels,
    defaultModel: defaultImageModel,
    isLoading: imageModelsLoading,
    sdxlWorkerHealthy
  } = useImageModels();

  const {
    characters: userCharacters,
    defaultCharacterId,
    isLoading: userCharactersLoading
  } = useUserCharacters();

  // Validate if a chat model is available
  const isValidChatModel = useCallback((modelValue: string): boolean => {
    const model = chatModels.find(m => m.value === modelValue);
    return model ? model.isAvailable : false;
  }, [chatModels]);

  // Validate if an image model is available
  const isValidImageModel = useCallback((modelValue: string): boolean => {
    const model = imageModels.find(m => m.value === modelValue);
    return model ? model.isAvailable : false;
  }, [imageModels]);

  // Initialize settings from localStorage with validation
  useEffect(() => {
    if (hasInitialized.current) return;
    if (chatModelsLoading || imageModelsLoading) return;
    if (chatModels.length === 0 && imageModels.length === 0) return;

    hasInitialized.current = true;

    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);

        // Validate and fall back for chat model
        let effectiveChatModel = parsed.modelProvider;
        if (!effectiveChatModel || !isValidChatModel(effectiveChatModel)) {
          effectiveChatModel = defaultChatModel?.value || DEFAULT_SETTINGS.modelProvider;
        }

        // Validate and fall back for image model
        let effectiveImageModel = parsed.selectedImageModel;
        if (!effectiveImageModel || !isValidImageModel(effectiveImageModel)) {
          effectiveImageModel = defaultImageModel?.value || '';
        }

        // Use saved or default user character
        const effectiveUserCharacterId = parsed.userCharacterId || defaultCharacterId || null;

        setSettings({
          memoryTier: parsed.memoryTier || DEFAULT_SETTINGS.memoryTier,
          modelProvider: effectiveChatModel,
          selectedImageModel: effectiveImageModel,
          selectedI2IModel: parsed.selectedI2IModel || DEFAULT_SETTINGS.selectedI2IModel,
          consistencySettings: parsed.consistencySettings || DEFAULT_CONSISTENCY_SETTINGS,
          userCharacterId: effectiveUserCharacterId,
          sceneStyle: parsed.sceneStyle || DEFAULT_SETTINGS.sceneStyle
        });
      } else {
        // No saved settings, use defaults from database
        setSettings({
          ...DEFAULT_SETTINGS,
          modelProvider: defaultChatModel?.value || DEFAULT_SETTINGS.modelProvider,
          selectedImageModel: defaultImageModel?.value || '',
          userCharacterId: defaultCharacterId || null
        });
      }
    } catch (error) {
      console.warn('Failed to load roleplay settings:', error);
      setSettings({
        ...DEFAULT_SETTINGS,
        modelProvider: defaultChatModel?.value || DEFAULT_SETTINGS.modelProvider,
        selectedImageModel: defaultImageModel?.value || ''
      });
    }

    setIsInitialized(true);
  }, [chatModelsLoading, imageModelsLoading, chatModels, imageModels, defaultChatModel, defaultImageModel, defaultCharacterId, isValidChatModel, isValidImageModel]);

  // Update settings (in memory only)
  const updateSettings = useCallback((updates: Partial<RoleplaySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save roleplay settings:', error);
    }
  }, [settings]);

  // Reset settings to defaults
  const resetSettings = useCallback(() => {
    const defaultSettings: RoleplaySettings = {
      ...DEFAULT_SETTINGS,
      modelProvider: defaultChatModel?.value || DEFAULT_SETTINGS.modelProvider,
      selectedImageModel: defaultImageModel?.value || '',
      userCharacterId: defaultCharacterId || null
    };
    setSettings(defaultSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
  }, [defaultChatModel, defaultImageModel, defaultCharacterId]);

  const isLoading = !isInitialized || chatModelsLoading || imageModelsLoading || userCharactersLoading;

  return {
    settings,
    updateSettings,
    saveSettings,
    resetSettings,
    isLoading,
    chatWorkerHealthy,
    sdxlWorkerHealthy,
    chatModels,
    imageModels,
    userCharacters
  };
};

export default useRoleplaySettings;
