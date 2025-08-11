import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSceneNarration } from '@/hooks/useSceneNarration';

interface Scene {
  id: string;
  scene_prompt: string;
  image_url?: string;
  generation_metadata?: any;
}

interface SceneState {
  isActive: boolean;
  isPaused: boolean;
  isGenerating: boolean;
  isVisible: boolean;
  currentScene: Scene | null;
}

interface SceneManagementOptions {
  conversationId?: string;
  characterName?: string;
  userCharacterId?: string;
  contentMode?: 'sfw' | 'nsfw';
}

export const useSceneManagement = (options: SceneManagementOptions = {}) => {
  const { toast } = useToast();
  const { startSceneWithNarration } = useSceneNarration();
  
  const [sceneState, setSceneState] = useState<SceneState>({
    isActive: false,
    isPaused: false,
    isGenerating: false,
    isVisible: true,
    currentScene: null
  });

  const setCurrentScene = useCallback((scene: Scene | null) => {
    setSceneState(prev => ({
      ...prev,
      currentScene: scene,
      isActive: !!scene,
      isPaused: false,
      isGenerating: false
    }));
  }, []);

  const startScene = useCallback(async (scene: Scene) => {
    if (!options.conversationId || !options.characterName) {
      toast({
        title: "Error",
        description: "Missing conversation or character information",
        variant: "destructive",
      });
      return;
    }

    try {
      setSceneState(prev => ({ ...prev, isGenerating: true }));
      
      await startSceneWithNarration(
        options.conversationId,
        scene.id,
        options.characterName,
        {
          userCharacterId: options.userCharacterId,
          contentMode: options.contentMode || 'sfw'
        }
      );

      setSceneState(prev => ({ 
        ...prev, 
        isGenerating: false,
        isActive: true,
        isPaused: false,
        currentScene: scene
      }));

      toast({
        title: "Scene Started",
        description: `Scene "${scene.scene_prompt}" is now active`,
      });

    } catch (error) {
      console.error('Failed to start scene:', error);
      setSceneState(prev => ({ ...prev, isGenerating: false }));
      toast({
        title: "Error",
        description: "Failed to start scene",
        variant: "destructive",
      });
    }
  }, [options.conversationId, options.characterName, options.userCharacterId, options.contentMode, startSceneWithNarration, toast]);

  const pauseScene = useCallback(() => {
    setSceneState(prev => ({ ...prev, isPaused: !prev.isPaused }));
    toast({
      title: sceneState.isPaused ? "Scene Resumed" : "Scene Paused",
      description: sceneState.isPaused ? "Scene generation resumed" : "Scene generation paused",
    });
  }, [sceneState.isPaused, toast]);

  const resetScene = useCallback(async () => {
    if (!sceneState.currentScene || !options.conversationId || !options.characterName) {
      toast({
        title: "Error",
        description: "No active scene to reset",
        variant: "destructive",
      });
      return;
    }

    try {
      setSceneState(prev => ({ ...prev, isGenerating: true }));
      
      await startSceneWithNarration(
        options.conversationId,
        sceneState.currentScene.id,
        options.characterName,
        {
          userCharacterId: options.userCharacterId,
          contentMode: options.contentMode || 'sfw'
        }
      );

      setSceneState(prev => ({ 
        ...prev, 
        isGenerating: false,
        isActive: true,
        isPaused: false
      }));

      toast({
        title: "Scene Reset",
        description: "Scene has been reset and restarted",
      });

    } catch (error) {
      console.error('Failed to reset scene:', error);
      setSceneState(prev => ({ ...prev, isGenerating: false }));
      toast({
        title: "Error",
        description: "Failed to reset scene",
        variant: "destructive",
      });
    }
  }, [sceneState.currentScene, options.conversationId, options.characterName, options.userCharacterId, options.contentMode, startSceneWithNarration, toast]);

  const toggleSceneVisibility = useCallback(() => {
    setSceneState(prev => ({ ...prev, isVisible: !prev.isVisible }));
    toast({
      title: sceneState.isVisible ? "Scene Hidden" : "Scene Visible",
      description: sceneState.isVisible ? "Scene context is now hidden" : "Scene context is now visible",
    });
  }, [sceneState.isVisible, toast]);

  const clearScene = useCallback(() => {
    setSceneState({
      isActive: false,
      isPaused: false,
      isGenerating: false,
      isVisible: true,
      currentScene: null
    });
  }, []);

  return {
    sceneState,
    setCurrentScene,
    startScene,
    pauseScene,
    resetScene,
    toggleSceneVisibility,
    clearScene
  };
};
