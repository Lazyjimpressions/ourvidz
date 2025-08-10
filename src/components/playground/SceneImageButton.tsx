import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useSceneGeneration } from '@/hooks/useSceneGeneration';
import { Camera } from 'lucide-react';

interface SceneImageButtonProps {
  messageContent: string;
  characterId?: string;
  conversationId?: string;
  character?: any;
  className?: string;
}

export const SceneImageButton: React.FC<SceneImageButtonProps> = ({
  messageContent,
  characterId,
  conversationId,
  character,
  className
}) => {
  const { generateSceneImage, isGenerating, detectScene } = useSceneGeneration();

  const handleGenerateImage = useCallback(async () => {
    if (!messageContent.trim()) return;

    try {
      // Use the scene generation logic to create an SDXL image
      await generateSceneImage(messageContent, null, {
        style: 'lustify',
        quality: 'high',
        useCharacterReference: !!character?.reference_image_url
      });
    } catch (error) {
      console.error('Failed to generate scene image:', error);
    }
  }, [messageContent, generateSceneImage, character]);

  // Only show the button if the content appears to be a scene description
  // Also check for narrative text patterns (narrator style content)
  const isNarrativeContent = messageContent.includes('**Narrator:**') || 
                           messageContent.includes('*The ') ||
                           messageContent.includes('The room') ||
                           messageContent.includes('candlelight') ||
                           messageContent.includes('atmosphere');
  
  if (!detectScene(messageContent) && !isNarrativeContent) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerateImage}
      disabled={isGenerating}
      className={className}
    >
      <Camera className="w-3 h-3 mr-1" />
      {isGenerating ? 'Creating...' : 'Create Image'}
    </Button>
  );
};