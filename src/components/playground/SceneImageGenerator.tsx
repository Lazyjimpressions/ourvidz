import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { useSceneGeneration } from '@/hooks/useSceneGeneration';
import { RoleplayTemplate } from './RoleplaySetup';


interface SceneImageGeneratorProps {
  messageContent: string;
  roleplayTemplate?: RoleplayTemplate | null;
  mode?: string;
  onImageGenerated?: (assetId: string, imageUrl?: string) => void;
}

export const SceneImageGenerator: React.FC<SceneImageGeneratorProps> = ({
  messageContent,
  roleplayTemplate,
  onImageGenerated
}) => {
  const { 
    detectScene, 
    generateSceneImage, 
    isGenerating
  } = useSceneGeneration();

  // Generate scene image
  const handleGenerateImage = useCallback(async () => {
    console.log('🎬 Scene image generation started:', { messageContent: messageContent.slice(0, 100) });
    
    try {
      // Set up event listener BEFORE starting generation
      const handleCompletion = (event: CustomEvent) => {
        console.log('🎯 Generation completed event received:', event.detail);
        if (event.detail?.assetId) {
          console.log('✅ Passing asset data to parent:', {
            assetId: event.detail.assetId,
            imageUrl: event.detail.imageUrl
          });
          onImageGenerated?.(event.detail.assetId, event.detail.imageUrl);
          window.removeEventListener('generation-completed', handleCompletion as EventListener);
        } else {
          console.warn('⚠️ Generation completed but no asset ID found:', event.detail);
        }
      };
      window.addEventListener('generation-completed', handleCompletion as EventListener);

      await generateSceneImage(messageContent, roleplayTemplate, {
        quality: 'high',
        style: 'lustify',
        useCharacterReference: false
      });

    } catch (error) {
      console.error('❌ Scene generation failed:', error);
    }
  }, [generateSceneImage, messageContent, roleplayTemplate, onImageGenerated]);

  // Check if message contains scene content
  const hasScene = detectScene(messageContent);

  if (!hasScene) return null;

  return (
    <div className="mt-2">
      <Button
        onClick={handleGenerateImage}
        disabled={isGenerating}
        variant="outline"
        size="sm"
        className="text-xs h-7 bg-background/50 border-primary/30 hover:border-primary/50 hover:bg-primary/5"
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-2 w-2 border border-primary border-t-transparent mr-2" />
            Generating... 45s
          </>
        ) : (
          <>
            <Camera className="mr-1 h-3 w-3" />
            Generate Image
          </>
        )}
      </Button>
    </div>
  );
};