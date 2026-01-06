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

      // Call the enhance-prompt edge function for enhancement
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: {
          prompt: originalPrompt,
          contentType: 'scene_description',
          jobType: 'text_enhancement',
        },
      });

      if (error) {
        throw error;
      }

      if (data?.enhanced_prompt) {
        // Return the enhanced prompt directly from the edge function
        return data.enhanced_prompt.trim();
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

