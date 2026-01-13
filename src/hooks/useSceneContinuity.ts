import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'scene-continuity-settings';
const SCENES_STORAGE_KEY = 'scene-continuity-scenes';
const MAX_STORED_CONVERSATIONS = 25;
const SCENE_POLL_INTERVAL_MS = 2000; // Poll every 2s for scene image updates
const SCENE_POLL_MAX_ATTEMPTS = 15; // Max 30s of polling

interface SceneContinuitySettings {
  enabled: boolean;
  defaultStrength: number; // 0.3-0.7 range for I2I
}

interface PreviousSceneInfo {
  sceneId: string;
  imageUrl: string;
  timestamp: number;
  isPending?: boolean; // True if scene exists but image not yet generated
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
  
  // ✅ NEW: Refresh method for manual updates
  refreshSceneFromDB: (conversationId: string) => Promise<void>;

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
        // Filter out pending scenes without image URLs
        const scene = sceneInfo as PreviousSceneInfo;
        if (scene.imageUrl && scene.imageUrl.trim() !== '') {
          map.set(convId, scene);
        }
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
const fetchLastSceneFromDB = async (convId: string, retryForImage: boolean = false): Promise<PreviousSceneInfo | null> => {
  try {
    // ✅ FIX: First try: Get scene with image_url (completed scenes only)
    let { data: scenesData, error } = await supabase
      .from('character_scenes')
      .select('id, image_url, created_at')
      .eq('conversation_id', convId)
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    let data = scenesData?.[0] || null;

    // If we found a scene with image, return it
    if (!error && data?.image_url) {
      console.log('🔄 Scene continuity: Found previous scene in DB with image', {
        conversationId: convId,
        sceneId: data.id,
        imageUrl: data.image_url.substring(0, 60) + '...'
      });

      return {
        sceneId: data.id,
        imageUrl: data.image_url,
        timestamp: new Date(data.created_at).getTime()
      };
    }

    // ✅ FIX: If retryForImage is true, we're polling - return pending scene for tracking
    if (retryForImage) {
      const { data: pendingData, error: pendingError } = await supabase
        .from('character_scenes')
        .select('id, image_url, created_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!pendingError && pendingData && pendingData.length > 0) {
        const pendingScene = pendingData[0];
        if (pendingScene.image_url) {
          console.log('🔄 Scene continuity: Polling found scene image is now ready', {
            sceneId: pendingScene.id,
            imageUrl: pendingScene.image_url.substring(0, 60) + '...'
          });
          return {
            sceneId: pendingScene.id,
            imageUrl: pendingScene.image_url,
            timestamp: new Date(pendingScene.created_at).getTime()
          };
        }
        console.log('🔄 Scene continuity: Scene still pending (no image_url yet)', {
          sceneId: pendingScene.id
        });
        return {
          sceneId: pendingScene.id,
          imageUrl: '', // Empty = pending
          timestamp: new Date(pendingScene.created_at).getTime(),
          isPending: true
        };
      }
    }

    console.log('🔄 Scene continuity: No previous scene with image in DB for conversation', convId);
    return null;
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

  // ✅ NEW: Manual refresh method to fetch latest scene from DB
  const refreshSceneFromDB = useCallback(async (convId: string): Promise<void> => {
    console.log('🔄 Scene continuity: Manual refresh requested for', convId);
    const scene = await fetchLastSceneFromDB(convId, false);
    if (scene && scene.imageUrl) {
      previousScenesRef.current.set(convId, scene);
      cleanupOldConversations(previousScenesRef.current);
      persistScenesToStorage(previousScenesRef.current);
      if (convId === conversationId) {
        setCurrentPreviousScene(scene);
      }
      console.log('🔄 Scene continuity: Refreshed scene from DB', {
        sceneId: scene.sceneId,
        imageUrl: scene.imageUrl.substring(0, 60) + '...'
      });
    }
  }, [conversationId]);

  // ✅ NEW: Set up realtime subscription for scene image updates
  useEffect(() => {
    if (!conversationId) return;

    // Subscribe to character_scenes updates for this conversation
    const channel = supabase
      .channel(`scene-continuity-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'character_scenes',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const updatedScene = payload.new as { id: string; image_url?: string; created_at: string };
          if (updatedScene.image_url) {
            console.log('🔄 Scene continuity: Realtime update - scene image now available', {
              sceneId: updatedScene.id,
              imageUrl: updatedScene.image_url.substring(0, 60) + '...'
            });
            const sceneInfo: PreviousSceneInfo = {
              sceneId: updatedScene.id,
              imageUrl: updatedScene.image_url,
              timestamp: new Date(updatedScene.created_at).getTime()
            };
            previousScenesRef.current.set(conversationId, sceneInfo);
            persistScenesToStorage(previousScenesRef.current);
            setCurrentPreviousScene(sceneInfo);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

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
    refreshSceneFromDB,

    // State
    isLoading: !isInitialized
  };
};

export default useSceneContinuity;
