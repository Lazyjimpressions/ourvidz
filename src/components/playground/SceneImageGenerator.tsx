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
  const [showDetails, setShowDetails] = useState(false);
  const [optimizedPrompt, setOptimizedPrompt] = useState<string>('');
  const [quality, setQuality] = useState<'fast' | 'high'>('fast');
  
  const { 
    detectScene, 
    analyzeScene, 
    generateSceneImage, 
    isAnalyzing, 
    isGenerating, 
    currentJob,
    lastSceneContext 
  } = useSceneGeneration();

  // Convert scene context to display data
  const getSceneDisplayData = useCallback(() => {
    if (!lastSceneContext) return null;
    
    return {
      characters: lastSceneContext.characters.map(char => `${char.name}: ${char.visualDescription}`),
      setting: lastSceneContext.setting,
      actions: lastSceneContext.actions,
      mood: lastSceneContext.mood,
      visualElements: lastSceneContext.visualElements,
      isNSFW: lastSceneContext.isNSFW
    };
  }, [lastSceneContext]);

  // Handle scene analysis
  const handleAnalyzeScene = useCallback(async () => {
    try {
      const sceneContext = await analyzeScene(messageContent, roleplayTemplate);
      // Preview the optimized prompt
      if (sceneContext) {
        // This would be handled in the hook now
        setOptimizedPrompt('Scene analyzed - ready to generate');
      }
    } catch (error) {
      toast.error('Failed to analyze scene');
      console.error('Scene analysis error:', error);
    }
  }, [analyzeScene, messageContent, roleplayTemplate]);

  // Generate scene image
  const handleGenerateImage = useCallback(async () => {
    try {
      const sceneContext = await generateSceneImage(messageContent, roleplayTemplate, {
        quality,
        style: 'lustify',
        useCharacterReference: false // TODO: Implement character reference
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
  }, [generateSceneImage, messageContent, roleplayTemplate, quality, onImageGenerated]);

  // Check if message contains scene content
  const hasScene = detectScene(messageContent);

  if (!hasScene) return null;

  return (
    <Card className="mt-2 border-primary/20 bg-primary/5">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Scene Detected</span>
            <Badge variant="secondary" className="text-xs">
              {mode === 'roleplay' ? 'Roleplay' : 'Visual'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="h-6 w-6 p-0"
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAnalyzeScene}
              disabled={isAnalyzing}
              className="h-6 w-6 p-0"
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {showDetails && lastSceneContext && (
          <div className="space-y-2 text-xs">
            <div>
              <span className="font-medium text-muted-foreground">Setting:</span> {lastSceneContext.setting}
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Mood:</span> {lastSceneContext.mood}
            </div>
            {lastSceneContext.characters.length > 0 && (
              <div>
                <span className="font-medium text-muted-foreground">Characters:</span> {lastSceneContext.characters.length}
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="font-medium text-muted-foreground">Quality:</span>
              <Button
                variant={quality === 'fast' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setQuality('fast')}
                className="h-5 text-xs px-2"
              >
                <Zap className="h-2 w-2 mr-1" />
                Fast
              </Button>
              <Button
                variant={quality === 'high' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setQuality('high')}
                className="h-5 text-xs px-2"
              >
                <Sparkles className="h-2 w-2 mr-1" />
                High
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            onClick={handleGenerateImage}
            disabled={isGenerating || isAnalyzing}
            size="sm"
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <LoadingSpinner className="mr-2" size="sm" />
                Generating Scene...
              </>
            ) : isAnalyzing ? (
              <>
                <LoadingSpinner className="mr-2" size="sm" />
                Analyzing Scene...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-3 w-3" />
                Generate Scene Image
              </>
            )}
          </Button>
          
          <Badge variant="outline" className="text-xs">
            {lastSceneContext?.isNSFW ? 'NSFW' : 'SFW'}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {quality === 'fast' ? '~15s' : '~45s'}
          </Badge>
        </div>

        {currentJob && (
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
            Status: {currentJob.status} • Format: SDXL Fast • Time: ~15-30s
          </div>
        )}
      </CardContent>
    </Card>
  );
};