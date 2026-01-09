import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'scene-continuity-settings';

interface SceneContinuitySettings {
  enabled: boolean;
  defaultStrength: number; // 0.3-0.7 range for I2I
}

interface PreviousSceneInfo {
  sceneId: string;
  imageUrl: string;
  timestamp: number;
}

const DEFAULT_SETTINGS: SceneContinuitySettings = {
  enabled: true, // Default to enabled per plan
  defaultStrength: 0.45 // Moderate strength for scene-to-scene
};

interface UseSceneContinuityResult {
  // Settings
  isEnabled: boolean;
  defaultStrength: number;
  setEnabled: (enabled: boolean) => void;
  setDefaultStrength: (strength: number) => void;

  // Previous scene tracking (per conversation)
  previousSceneId: string | null;
  previousSceneImageUrl: string | null;
  setLastScene: (conversationId: string, sceneId: string, imageUrl: string) => void;
  clearLastScene: (conversationId: string) => void;
  getPreviousScene: (conversationId: string) => PreviousSceneInfo | null;

  // State
  isLoading: boolean;
}

export const useSceneContinuity = (conversationId?: string): UseSceneContinuityResult => {
  const [settings, setSettings] = useState<SceneContinuitySettings>(DEFAULT_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);
  const hasInitialized = useRef(false);

  // In-memory cache of previous scenes per conversation
  // Using a ref to persist across renders without causing re-renders
  const previousScenesRef = useRef<Map<string, PreviousSceneInfo>>(new Map());

  // State for the current conversation's previous scene
  const [currentPreviousScene, setCurrentPreviousScene] = useState<PreviousSceneInfo | null>(null);

  // Initialize settings from localStorage
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({
          enabled: parsed.enabled ?? DEFAULT_SETTINGS.enabled,
          defaultStrength: parsed.defaultStrength ?? DEFAULT_SETTINGS.defaultStrength
        });
      }
    } catch (error) {
      console.warn('Failed to load scene continuity settings:', error);
    }

    setIsInitialized(true);
  }, []);

  // Update current previous scene when conversationId changes
  useEffect(() => {
    if (conversationId) {
      const scene = previousScenesRef.current.get(conversationId) || null;
      setCurrentPreviousScene(scene);
    } else {
      setCurrentPreviousScene(null);
    }
  }, [conversationId]);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: SceneContinuitySettings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save scene continuity settings:', error);
    }
  }, []);

  // Toggle scene continuity
  const setEnabled = useCallback((enabled: boolean) => {
    const newSettings = { ...settings, enabled };
    setSettings(newSettings);
    saveSettings(newSettings);
    console.log('🔄 Scene continuity:', enabled ? 'enabled' : 'disabled');
  }, [settings, saveSettings]);

  // Set default I2I strength
  const setDefaultStrength = useCallback((strength: number) => {
    // Clamp strength between 0.2 and 0.8
    const clampedStrength = Math.max(0.2, Math.min(0.8, strength));
    const newSettings = { ...settings, defaultStrength: clampedStrength };
    setSettings(newSettings);
    saveSettings(newSettings);
    console.log('🔄 Scene continuity strength:', clampedStrength);
  }, [settings, saveSettings]);

  // Store the last scene for a conversation
  const setLastScene = useCallback((convId: string, sceneId: string, imageUrl: string) => {
    const sceneInfo: PreviousSceneInfo = {
      sceneId,
      imageUrl,
      timestamp: Date.now()
    };
    previousScenesRef.current.set(convId, sceneInfo);

    // Update state if this is the current conversation
    if (convId === conversationId) {
      setCurrentPreviousScene(sceneInfo);
    }

    console.log('🔄 Scene continuity: Stored last scene for conversation', {
      conversationId: convId,
      sceneId,
      imageUrl: imageUrl.substring(0, 60) + '...'
    });
  }, [conversationId]);

  // Clear the last scene for a conversation
  const clearLastScene = useCallback((convId: string) => {
    previousScenesRef.current.delete(convId);

    // Update state if this is the current conversation
    if (convId === conversationId) {
      setCurrentPreviousScene(null);
    }

    console.log('🔄 Scene continuity: Cleared last scene for conversation', convId);
  }, [conversationId]);

  // Get previous scene info for a conversation
  const getPreviousScene = useCallback((convId: string): PreviousSceneInfo | null => {
    return previousScenesRef.current.get(convId) || null;
  }, []);

  return {
    // Settings
    isEnabled: settings.enabled,
    defaultStrength: settings.defaultStrength,
    setEnabled,
    setDefaultStrength,

    // Previous scene tracking
    previousSceneId: currentPreviousScene?.sceneId || null,
    previousSceneImageUrl: currentPreviousScene?.imageUrl || null,
    setLastScene,
    clearLastScene,
    getPreviousScene,

    // State
    isLoading: !isInitialized
  };
};

export default useSceneContinuity;
