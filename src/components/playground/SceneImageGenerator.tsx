import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { useSceneGeneration } from '@/hooks/useSceneGeneration';
import { RoleplayTemplate } from './RoleplaySetup';


interface SceneImageGeneratorProps {
  messageContent: string;
  roleplayTemplate?: RoleplayTemplate | null;
  mode?: string;
  onImageGenerated?: (assetId: string) => void;
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
    try {
      await generateSceneImage(messageContent, roleplayTemplate, {
        quality: 'high',
        style: 'lustify',
        useCharacterReference: false
      });

      // Listen for completion to get asset ID
      const handleCompletion = (event: CustomEvent) => {
        if (event.detail?.assetId) {
          onImageGenerated?.(event.detail.assetId);
          window.removeEventListener('generation-completed', handleCompletion as EventListener);
        }
      };
      window.addEventListener('generation-completed', handleCompletion as EventListener);

    } catch (error) {
      console.error('Scene generation failed:', error);
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