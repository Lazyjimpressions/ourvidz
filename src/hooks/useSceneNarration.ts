import { useCallback } from 'react';
import { usePlayground } from '@/contexts/PlaygroundContext';
import { useToast } from '@/hooks/use-toast';

interface Scene {
  id: string;
  scene_prompt: string;
  image_url?: string;
  generation_metadata?: any;
}

interface SceneNarrationOptions {
  userCharacterId?: string;
  contentMode?: 'sfw' | 'nsfw';
}

export const useSceneNarration = () => {
  const { sendMessage } = usePlayground();
  const { toast } = useToast();

  const startSceneWithNarration = useCallback(async (
    conversationId: string,
    sceneId: string,
    characterName: string,
    options: SceneNarrationOptions = {}
  ) => {
    console.log('Starting scene narration:', { conversationId, sceneId, characterName, options });
    
    try {
      // Build the scene narration prompt
      const narrationPrompt = buildNarrationPrompt(sceneId, characterName, options);
      console.log('Narration prompt:', narrationPrompt);
      
      // Send the narration message
      await sendMessage(narrationPrompt, { 
        conversationId
      });

      toast({
        title: "Scene Started",
        description: `Narrator is setting the scene with ${characterName}`,
      });

    } catch (error) {
      console.error('Scene narration failed:', error);
      toast({
        title: "Error",
        description: "Failed to start scene narration",
        variant: "destructive",
      });
      throw error;
    }
  }, [sendMessage, toast]);

  const buildNarrationPrompt = useCallback((
    sceneId: string,
    characterName: string,
    options: SceneNarrationOptions = {}
  ): string => {
    const { userCharacterId, contentMode = 'nsfw' } = options; // NSFW-first default
    
    // Base scene generation prompt
    let prompt = `[SCENE_GENERATION] Scene ID: ${sceneId}`;
    
    // Add character context
    prompt += ` [CHARACTERS: ${characterName}`;
    if (userCharacterId) {
      prompt += ', User Character';
    }
    prompt += ']';
    
    // Add context information
    const context = ['narrator'];
    if (userCharacterId) context.push('user');
    prompt += ` [CONTEXT: ${context.join(',')}]`;
    
    // Add content mode
    prompt += ` [MODE: ${contentMode}]`;
    
    // Add specific narration instruction
    prompt += `\n\nPlease set the scene as a narrator. Begin with "**Narrator:**" and describe the scene in vivid detail, setting the atmosphere and context for the roleplay. Focus on the environment, mood, and character positioning.`;
    
    return prompt;
  }, []);

  const generateSceneDescription = useCallback(async (
    scenePrompt: string,
    characterName: string,
    options: SceneNarrationOptions = {}
  ) => {
    try {
      const { userCharacterId, contentMode = 'nsfw' } = options; // NSFW-first default
      
      // Build enhanced scene prompt
      let enhancedPrompt = `[SCENE_GENERATION] ${scenePrompt}`;
      
      // Add character information
      enhancedPrompt += ` [CHARACTERS: ${characterName}`;
      if (userCharacterId) {
        enhancedPrompt += ', User Character';
      }
      enhancedPrompt += ']';
      
      // Add context information
      const context = ['narrator'];
      if (userCharacterId) context.push('user');
      enhancedPrompt += ` [CONTEXT: ${context.join(',')}]`;
      
      // Add content mode
      enhancedPrompt += ` [MODE: ${contentMode}]`;
      
      // Add narration instruction
      enhancedPrompt += `\n\nYou are setting the scene as a narrator. Begin with "**Narrator:**" and describe the scene in vivid detail, setting the atmosphere and context for the roleplay.`;
      
      return enhancedPrompt;
      
    } catch (error) {
      console.error('Failed to generate scene description:', error);
      throw error;
    }
  }, []);

  return {
    startSceneWithNarration,
    buildNarrationPrompt,
    generateSceneDescription
  };
};
