import { useCallback } from 'react';
import { usePlayground } from '@/contexts/PlaygroundContext';
import { toast } from 'sonner';

interface SceneNarrativeOptions {
  includeNarrator?: boolean;
  includeUserCharacter?: boolean;
  characterId?: string;
  conversationId?: string;
}

export const useSceneNarrative = () => {
  const { sendMessage, state } = usePlayground();

  const generateSceneNarrative = useCallback(async (
    scenePrompt: string,
    character?: any,
    options: SceneNarrativeOptions = {}
  ) => {
    if (!scenePrompt.trim()) {
      toast.error('Please provide a scene description');
      return;
    }

    try {
      // Build the enhanced scene prompt for narrative generation
      let enhancedPrompt = `Generate a scene: ${scenePrompt}`;
      
      if (character) {
        enhancedPrompt += ` [Character: ${character.name}]`;
      }
      
      if (options.includeNarrator) {
        enhancedPrompt += ` [Include narrator perspective]`;
      }
      
      if (options.includeUserCharacter) {
        enhancedPrompt += ` [Include user character interaction]`;
      }

      // Send the scene generation request
      await sendMessage(enhancedPrompt, {
        characterId: options.characterId,
        conversationId: options.conversationId
      });

      toast.success('Scene description generated!', {
        description: 'The scene narrative has been added to your conversation'
      });

    } catch (error) {
      console.error('Scene narrative generation failed:', error);
      toast.error('Failed to generate scene narrative');
      throw error;
    }
  }, [sendMessage]);

  return {
    generateSceneNarrative,
    isGenerating: state.isLoadingMessage
  };
};