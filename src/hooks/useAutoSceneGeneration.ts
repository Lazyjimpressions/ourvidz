import { useCallback } from 'react';
import { useJobQueue } from './useJobQueue';
import { useCharacterScenes } from './useCharacterScenes';

interface AutoSceneOptions {
  characterId: string;
  conversationId: string;
  characterName: string;
  referenceImageUrl?: string;
  isEnabled: boolean;
}

export const useAutoSceneGeneration = () => {
  const { queueJob } = useJobQueue();
  const { createScene } = useCharacterScenes();

  const generateSceneFromMessage = useCallback(async (
    message: string,
    options: AutoSceneOptions
  ) => {
    if (!options.isEnabled || !message.trim()) return;

    // Detect if message contains visual descriptors
    const visualKeywords = [
      'looks', 'appears', 'walks', 'moves', 'stands', 'sits', 'room', 'place', 'location',
      'setting', 'scene', 'environment', 'wearing', 'holding', 'expression', 'gesture',
      'lighting', 'atmosphere', 'background', 'surroundings'
    ];
    
    const hasVisualContent = visualKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    if (!hasVisualContent) return;

    // Extract scene context from message
    const scenePrompt = `${options.characterName} in scene: ${message}`;

    try {
      // Queue image generation job
      const jobParams = {
        jobType: 'sdxl_image_fast',
        metadata: {
          prompt: scenePrompt,
          destination: 'character_gallery',
          reference_image_url: options.referenceImageUrl,
          reference_type: 'character',
          reference_strength: 0.3,
          character_id: options.characterId,
          conversation_id: options.conversationId,
          auto_generated: true
        }
      };

      await queueJob(jobParams);
      
      // Note: Scene will be saved to character_scenes table when job completes
      // via job callback system
      
    } catch (error) {
      console.error('Auto scene generation failed:', error);
    }
  }, [queueJob, createScene]);

  return {
    generateSceneFromMessage
  };
};