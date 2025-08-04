import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { useSceneGeneration } from '@/hooks/useSceneGeneration';
import { RoleplayTemplate } from './RoleplaySetup';


interface SceneImageGeneratorProps {
  messageContent: string;
  roleplayTemplate?: RoleplayTemplate | null;
  mode?: string;
  onImageGenerated?: (assetId: string, imageUrl?: string, bucket?: string) => void;
}

export const SceneImageGenerator: React.FC<SceneImageGeneratorProps> = ({
  messageContent,
  roleplayTemplate,
  mode,
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
    
    // Set up persistent event listener that doesn't get removed immediately
    const handleCompletion = (event: CustomEvent) => {
      console.log('🎯 Generation completed event received:', event.detail);
      if (event.detail?.assetId || event.detail?.imageId) {
        const assetId = event.detail.assetId || event.detail.imageId;
        console.log('✅ Passing asset data to parent:', {
          assetId,
          imageUrl: event.detail.imageUrl,
          bucket: event.detail.bucket
        });
        onImageGenerated?.(assetId, event.detail.imageUrl, event.detail.bucket);
        // Remove listener after successful handling
        window.removeEventListener('generation-completed', handleCompletion as EventListener);
      } else {
        console.warn('⚠️ Generation completed but no asset ID found:', event.detail);
      }
    };
    
    try {
      // Remove any existing listeners first
      window.removeEventListener('generation-completed', handleCompletion as EventListener);
      window.addEventListener('generation-completed', handleCompletion as EventListener);

      await generateSceneImage(messageContent, roleplayTemplate, {
        quality: 'high',
        style: 'lustify',
        useCharacterReference: false
      });

    } catch (error) {
      console.error('❌ Scene generation failed:', error);
      // Clean up listener on error
      window.removeEventListener('generation-completed', handleCompletion as EventListener);
    }
  }, [generateSceneImage, messageContent, roleplayTemplate, onImageGenerated]);

  // Check if message contains scene content with debug logging
  const hasScene = detectScene(messageContent);
  
  console.log('🎬 SceneImageGenerator Debug:', {
    messageContent: messageContent.slice(0, 100),
    hasScene,
    mode,
    roleplayTemplate: !!roleplayTemplate,
    isRoleplayMode: mode === 'roleplay'
  });

  // For roleplay mode, be more lenient - show button if content is substantial
  const shouldShowButton = hasScene || (mode === 'roleplay' && messageContent.length > 50);
  
  if (!shouldShowButton) return null;

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