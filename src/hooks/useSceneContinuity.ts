import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'scene-continuity-settings';
const SCENES_STORAGE_KEY = 'scene-continuity-scenes';
const MAX_STORED_CONVERSATIONS = 25;

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

/**
 * Helper to persist scenes Map to localStorage
 */
const persistScenesToStorage = (scenesMap: Map<string, PreviousSceneInfo>) => {
  try {
    const scenesObj = Object.fromEntries(scenesMap);
    localStorage.setItem(SCENES_STORAGE_KEY, JSON.stringify(scenesObj));
  } catch (error) {
    console.warn('🔄 Scene continuity: Failed to persist scenes to localStorage:', error);
  }
};

/**
 * Helper to load scenes from localStorage
 */
const loadScenesFromStorage = (): Map<string, PreviousSceneInfo> => {
  const map = new Map<string, PreviousSceneInfo>();
  try {
    const savedScenes = localStorage.getItem(SCENES_STORAGE_KEY);
    if (savedScenes) {
      const parsed = JSON.parse(savedScenes);
      Object.entries(parsed).forEach(([convId, sceneInfo]) => {
        map.set(convId, sceneInfo as PreviousSceneInfo);
      });
      console.log('🔄 Scene continuity: Loaded', map.size, 'scenes from localStorage');
    }
  } catch (error) {
    console.warn('🔄 Scene continuity: Failed to load scenes from localStorage:', error);
  }
  return map;
};

/**
 * Helper to cleanup old conversations to prevent localStorage bloat
 */
const cleanupOldConversations = (scenesMap: Map<string, PreviousSceneInfo>) => {
  if (scenesMap.size <= MAX_STORED_CONVERSATIONS) return;

  // Remove oldest entries by timestamp
  const entries = Array.from(scenesMap.entries());
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
  const toRemove = entries.slice(0, entries.length - MAX_STORED_CONVERSATIONS);
  toRemove.forEach(([key]) => scenesMap.delete(key));

  console.log('🔄 Scene continuity: Cleaned up', toRemove.length, 'old conversations');
};

/**
 * Fetch last scene from database (fallback when localStorage misses)
 * ✅ FIX 5: Improved fallback - first try scenes with image_url, then any scene
 */
const fetchLastSceneFromDB = async (convId: string): Promise<PreviousSceneInfo | null> => {
  try {
    // ✅ FIX 5: First try: Get scene with image_url
    let { data, error } = await supabase
      .from('character_scenes')
      .select('id, image_url, created_at')
      .eq('conversation_id', convId)
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // ✅ FIX 5: Fallback: If no scene with image_url, get most recent scene (image might be updating)
    if (error || !data?.image_url) {
      console.log('🔄 Scene continuity: No scene with image_url, checking for any scene...');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('character_scenes')
        .select('id, image_url, created_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!fallbackError && fallbackData) {
        data = fallbackData;
        error = null;
        console.log('🔄 Scene continuity: Found scene without image_url, will check again later', {
          sceneId: data.id,
          hasImage: !!data.image_url
        });
      }
    }

    if (error || !data) {
      console.log('🔄 Scene continuity: No previous scene in DB for conversation', convId);
      return null;
    }

    // Only return if we have an image URL (required for I2I)
    if (!data.image_url) {
      console.log('🔄 Scene continuity: Scene found but no image_url yet - will retry later');
      return null;
    }

    console.log('🔄 Scene continuity: Found previous scene in DB', {
      conversationId: convId,
      sceneId: data.id,
      imageUrl: data.image_url.substring(0, 60) + '...'
    });

    return {
      sceneId: data.id,
      imageUrl: data.image_url,
      timestamp: new Date(data.created_at).getTime()
    };
  } catch (error) {
    console.warn('🔄 Scene continuity: Failed to fetch scene from DB:', error);
    return null;
  }
};

export const useSceneContinuity = (conversationId?: string): UseSceneContinuityResult => {
  const [settings, setSettings] = useState<SceneContinuitySettings>(DEFAULT_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);
  const hasInitialized = useRef(false);

  // In-memory cache of previous scenes per conversation
  // Using a ref to persist across renders without causing re-renders
  // Now initialized from localStorage
  const previousScenesRef = useRef<Map<string, PreviousSceneInfo>>(new Map());

  // State for the current conversation's previous scene
  const [currentPreviousScene, setCurrentPreviousScene] = useState<PreviousSceneInfo | null>(null);

  // Initialize settings and scenes from localStorage
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Load settings
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

    // Load previous scenes from localStorage
    previousScenesRef.current = loadScenesFromStorage();

    setIsInitialized(true);
  }, []);

  // Update current previous scene when conversationId changes
  // Also triggers DB fallback if localStorage doesn't have the scene
  useEffect(() => {
    if (!conversationId) {
      setCurrentPreviousScene(null);
      return;
    }

    // Check localStorage/memory first
    const cached = previousScenesRef.current.get(conversationId);
    if (cached) {
      console.log('🔄 Scene continuity: Found cached scene for conversation', {
        conversationId,
        sceneId: cached.sceneId,
        imageUrl: cached.imageUrl.substring(0, 60) + '...'
      });
      setCurrentPreviousScene(cached);
      return;
    }

    // Fallback: Query database for last scene
    console.log('🔄 Scene continuity: No cached scene, checking database for', conversationId);
    fetchLastSceneFromDB(conversationId).then(scene => {
      if (scene) {
        // Store in memory and localStorage
        previousScenesRef.current.set(conversationId, scene);
        cleanupOldConversations(previousScenesRef.current);
        persistScenesToStorage(previousScenesRef.current);
        setCurrentPreviousScene(scene);
      } else {
        setCurrentPreviousScene(null);
      }
    });
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

  // Store the last scene for a conversation (with localStorage persistence)
  const setLastScene = useCallback((convId: string, sceneId: string, imageUrl: string) => {
    const sceneInfo: PreviousSceneInfo = {
      sceneId,
      imageUrl,
      timestamp: Date.now()
    };
    previousScenesRef.current.set(convId, sceneInfo);

    // Cleanup old conversations if needed
    cleanupOldConversations(previousScenesRef.current);

    // Persist to localStorage
    persistScenesToStorage(previousScenesRef.current);

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

  // Clear the last scene for a conversation (with localStorage persistence)
  const clearLastScene = useCallback((convId: string) => {
    previousScenesRef.current.delete(convId);

    // Persist deletion to localStorage
    persistScenesToStorage(previousScenesRef.current);

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
