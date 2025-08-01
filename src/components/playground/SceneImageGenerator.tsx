import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image, Sparkles, Eye, Settings, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useSceneGeneration } from '@/hooks/useSceneGeneration';
import { RoleplayTemplate } from './RoleplaySetup';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface SceneData {
  characters: string[];
  setting: string;
  actions: string[];
  mood: string;
  visualElements: string[];
  isNSFW: boolean;
}

interface SceneImageGeneratorProps {
  messageContent: string;
  roleplayTemplate?: RoleplayTemplate | null;
  mode?: string;
  onImageGenerated?: (assetId: string) => void;
}

export const SceneImageGenerator: React.FC<SceneImageGeneratorProps> = ({
  messageContent,
  roleplayTemplate,
  mode = 'roleplay',
  onImageGenerated
}) => {
  const { 
    detectScene, 
    generateSceneImage, 
    isGenerating, 
    currentJob
  } = useSceneGeneration();

  // Generate scene image
  const handleGenerateImage = useCallback(async () => {
    try {
      const sceneContext = await generateSceneImage(messageContent, roleplayTemplate, {
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
    <Card className="mt-2 border-primary/20 bg-primary/5">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Scene Detected</span>
          </div>
          
          <Button
            onClick={handleGenerateImage}
            disabled={isGenerating}
            size="sm"
          >
            {isGenerating ? (
              <>
                <LoadingSpinner className="mr-2" size="sm" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-3 w-3" />
                Generate Scene Image
              </>
            )}
          </Button>
        </div>

        {currentJob && (
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded mt-2">
            Status: {currentJob.status} • SDXL High Quality • ~45s
          </div>
        )}
      </CardContent>
    </Card>
  );
};