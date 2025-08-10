import { useCallback } from 'react';
import { usePlayground } from '@/contexts/PlaygroundContext';
import { toast } from 'sonner';

interface CharacterParticipant {
  id: string;
  name: string;
  role: 'ai' | 'user' | 'narrator';
  image_url?: string;
  reference_image_url?: string;
  description?: string;
}

interface SceneNarrativeOptions {
  includeNarrator?: boolean;
  includeUserCharacter?: boolean;
  characterId?: string;
  conversationId?: string;
  userCharacterId?: string;
}

export const useSceneNarrative = () => {
  const { sendMessage, state } = usePlayground();

  const generateSceneNarrative = useCallback(async (
    scenePrompt: string,
    characters: CharacterParticipant[] = [],
    options: SceneNarrativeOptions = {}
  ) => {
    if (!scenePrompt.trim()) {
      toast.error('Please provide a scene description');
      return;
    }

    try {
      // Build the enhanced scene prompt with proper markers for detection
      let enhancedPrompt = `[SCENE_GENERATION] ${scenePrompt}`;
      
      // Add character information
      if (characters.length > 0) {
        const characterNames = characters.map(c => c.name).join(', ');
        enhancedPrompt += ` [CHARACTERS: ${characterNames}]`;
      }
      
      // Add context information
      const context = [];
      if (options.includeNarrator) context.push('narrator');
      if (options.includeUserCharacter) context.push('user');
      if (context.length > 0) {
        enhancedPrompt += ` [CONTEXT: ${context.join(',')}]`;
      }

      console.log('Sending scene generation prompt:', enhancedPrompt);

      // Send the scene generation request
      await sendMessage(enhancedPrompt, {
        characterId: options.characterId,
        conversationId: options.conversationId
      });

      toast.success('Scene narrative being generated...', {
        description: 'The scene will appear in your conversation shortly'
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