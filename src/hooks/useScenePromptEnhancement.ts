import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type EnhancementType = 'general' | 'detailed' | 'atmosphere' | 'dynamics';

interface EnhancementOptions {
  type?: EnhancementType;
}

export const useScenePromptEnhancement = () => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const { toast } = useToast();

  const enhancePrompt = useCallback(async (
    originalPrompt: string,
    options: EnhancementOptions = {}
  ): Promise<string> => {
    if (!originalPrompt.trim()) {
      toast({
        title: "No Prompt",
        description: "Please enter a scene prompt first.",
        variant: "destructive",
      });
      return originalPrompt;
    }

    setIsEnhancing(true);

    try {
      // Build enhancement instruction based on type
      let enhancementInstruction = '';
      switch (options.type) {
        case 'detailed':
          enhancementInstruction = 'Make this scene description more detailed and vivid, adding sensory details and specific imagery.';
          break;
        case 'atmosphere':
          enhancementInstruction = 'Enhance the atmosphere and mood of this scene, adding emotional depth and environmental details.';
          break;
        case 'dynamics':
          enhancementInstruction = 'Add character dynamics and interaction details to this scene description.';
          break;
        default:
          enhancementInstruction = 'Improve and enhance this scene description, making it more engaging and detailed while preserving the original intent.';
      }

      // Call the roleplay-chat edge function for enhancement
      const { data, error } = await supabase.functions.invoke('roleplay-chat', {
        body: {
          message: `[PROMPT_ENHANCEMENT]\n\nOriginal prompt: "${originalPrompt}"\n\nEnhancement instruction: ${enhancementInstruction}\n\nPlease provide an enhanced version of the scene prompt that is more detailed, engaging, and well-crafted while maintaining the original intent and key elements.`,
          characterId: null, // No specific character needed for enhancement
          conversationId: null,
          contentTier: 'nsfw',
          modelKey: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', // Use a capable model
        },
      });

      if (error) {
        throw error;
      }

      if (data?.response) {
        // Extract the enhanced prompt from the response
        // The response might be wrapped in quotes or have extra text
        let enhancedPrompt = data.response.trim();
        
        // Remove quotes if present
        if (enhancedPrompt.startsWith('"') && enhancedPrompt.endsWith('"')) {
          enhancedPrompt = enhancedPrompt.slice(1, -1);
        }
        
        // If the response is very long, try to extract just the prompt part
        if (enhancedPrompt.length > originalPrompt.length * 3) {
          // Look for the actual prompt in the response
          const promptMatch = enhancedPrompt.match(/(?:enhanced|improved|version)[\s:]*["']?([^"']{50,})["']?/i);
          if (promptMatch && promptMatch[1]) {
            enhancedPrompt = promptMatch[1].trim();
          }
        }

        return enhancedPrompt || originalPrompt;
      }

      return originalPrompt;
    } catch (error) {
      console.error('Prompt enhancement failed:', error);
      toast({
        title: "Enhancement Failed",
        description: error instanceof Error ? error.message : "Failed to enhance prompt. Please try again.",
        variant: "destructive",
      });
      return originalPrompt;
    } finally {
      setIsEnhancing(false);
    }
  }, [toast]);

  return {
    enhancePrompt,
    isEnhancing,
  };
};

