
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Calendar, Clock, Image, Video, Zap, Crown } from 'lucide-react';
import { SeedDisplay } from '@/components/workspace/SeedDisplay';
import { toast } from 'sonner';

interface PromptInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  quality: 'fast' | 'high';
  mode: 'image' | 'video';
  timestamp: Date;
  contentCount: number;
  itemId: string;
  originalImageUrl?: string;
  seed?: number;
  modelType?: string;
  referenceStrength?: number;
  negativePrompt?: string;
  generationParams?: any;
}

export const PromptInfoModal = ({
  isOpen,
  onClose,
  prompt,
  quality,
  mode,
  timestamp,
  contentCount,
  itemId,
  originalImageUrl,
  seed,
  modelType,
  referenceStrength,
  negativePrompt,
  generationParams
}: PromptInfoModalProps) => {
  // DEBUG: Log all received props
  React.useEffect(() => {
    if (isOpen) {
      console.log('🔍 PromptInfoModal - Received Props Debug:', {
        prompt,
        quality,
        mode,
        timestamp,
        contentCount,
        itemId,
        originalImageUrl,
        seed,
        seedType: typeof seed,
        seedValue: seed,
        modelType,
        referenceStrength,
        negativePrompt,
        generationParams,
        generationParamsType: typeof generationParams,
        generationParamsKeys: generationParams ? Object.keys(generationParams) : null
      });
    }
  }, [isOpen, seed, generationParams]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // PHASE 2 FIX: Extract seed and generation time from generationParams
  const extractedSeed = seed !== undefined ? seed : generationParams?.seed;
  const generationTime = generationParams?.generation_time;
  const extractedNegativePrompt = negativePrompt || generationParams?.negative_prompt;

  // DEBUG: Log extracted values
  React.useEffect(() => {
    if (isOpen) {
      console.log('🎯 PromptInfoModal - Extracted Values Debug:', {
        seed,
        'generationParams?.seed': generationParams?.seed,
        extractedSeed,
        extractedSeedType: typeof extractedSeed,
        extractedSeedTruthy: !!extractedSeed,
        generationTime,
        generationTimeType: typeof generationTime,
        extractedNegativePrompt,
        conditionalCheck: {
          'extractedSeed exists': !!extractedSeed,
          'extractedSeed !== undefined': extractedSeed !== undefined,
          'extractedSeed !== null': extractedSeed !== null,
          'extractedSeed is valid': extractedSeed !== undefined && extractedSeed !== null,
          'Number(extractedSeed)': Number(extractedSeed),
          'Boolean(extractedSeed)': Boolean(extractedSeed)
        }
      });
    }
  }, [isOpen, extractedSeed, generationTime, seed, generationParams]);

  const getModelIcon = () => {
    if (modelType?.includes('sdxl') || modelType?.includes('SDXL') || modelType?.toLowerCase().includes('sdxl')) {
      return quality === 'high' ? <Crown className="h-4 w-4" /> : <Zap className="h-4 w-4" />;
    }
    return mode === 'image' ? <Image className="h-4 w-4" /> : <Video className="h-4 w-4" />;
  };

  const getModelName = () => {
    // PHASE 2 FIX: Check job_type for accurate model detection
    if (modelType?.includes('sdxl_image_fast') || modelType?.includes('sdxl_image_high')) {
      return modelType.includes('fast') ? 'SDXL Fast' : 'SDXL High';
    }
    
    // Check for SDXL patterns in modelType
    if (modelType?.includes('sdxl') || modelType?.includes('SDXL') || modelType?.toLowerCase().includes('sdxl')) {
      return 'SDXL';
    }
    
    // Check for Enhanced models
    if (modelType?.includes('enhanced') || modelType?.includes('Enhanced') || modelType?.includes('7B')) {
      return 'Enhanced 7B';
    }
    
    // WAN models
    if (modelType?.includes('image_fast') || modelType?.includes('image_high')) {
      return modelType.includes('fast') ? 'WAN Fast' : 'WAN High';
    }
    
    // Default fallback
    return 'WAN 2.1';
  };

  // Format generation time for display
  const formatGenerationTime = (timeInSeconds: number) => {
    if (timeInSeconds < 60) {
      return `${timeInSeconds.toFixed(1)}s`;
    } else {
      const minutes = Math.floor(timeInSeconds / 60);
      const seconds = (timeInSeconds % 60).toFixed(1);
      return `${minutes}m ${seconds}s`;
    }
  };

  // PHASE 2 FIX: Proper validation for seed display - handle 0 as valid value
  const shouldShowSeed = extractedSeed !== undefined && extractedSeed !== null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Generation Details
            <Badge variant="outline" className="flex items-center gap-1">
              {getModelIcon()}
              {getModelName()}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Generation Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(timestamp)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{contentCount} {mode}(s)</span>
              </div>
              <Badge variant={quality === 'high' ? 'default' : 'secondary'}>
                {quality === 'high' ? 'High Quality' : 'Fast'}
              </Badge>
            </div>

            {/* DEBUG: Always show seed debug info */}
            <div className="bg-red-100 border border-red-300 p-2 rounded text-xs">
              <strong>DEBUG - Seed Info:</strong><br/>
              Raw seed prop: {String(seed)} (type: {typeof seed})<br/>
              generationParams?.seed: {String(generationParams?.seed)} (type: {typeof generationParams?.seed})<br/>
              extractedSeed: {String(extractedSeed)} (type: {typeof extractedSeed})<br/>
              shouldShowSeed: {shouldShowSeed ? 'YES' : 'NO'}<br/>
              Old truthy check: {!!extractedSeed ? 'PASS' : 'FAIL'}
            </div>

            {/* PHASE 2 FIX: Seed Information - Fixed conditional to handle seed: 0 */}
            {shouldShowSeed && (
              <SeedDisplay 
                seed={extractedSeed}
                onUseSeed={(seedValue) => {
                  copyToClipboard(seedValue.toString(), 'Seed');
                }}
                className="justify-start"
              />
            )}

            {/* Alternative seed display for debugging */}
            {!shouldShowSeed && (seed !== undefined || generationParams?.seed !== undefined) && (
              <div className="bg-yellow-100 border border-yellow-300 p-2 rounded">
                <strong>DEBUG SEED:</strong> {seed !== undefined ? seed : generationParams?.seed} (should be showing but condition failed)
              </div>
            )}

            {/* Reference Strength */}
            {referenceStrength && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Reference Strength:</span>
                <Badge variant="outline">{referenceStrength.toFixed(3)}</Badge>
              </div>
            )}
          </div>

          {/* Prompt Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Prompt</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(prompt, 'Prompt')}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm leading-relaxed">{prompt}</p>
            </div>
          </div>

          {/* Negative Prompt Section */}
          {extractedNegativePrompt && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Negative Prompt</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(extractedNegativePrompt, 'Negative Prompt')}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm leading-relaxed text-muted-foreground">{extractedNegativePrompt}</p>
              </div>
            </div>
          )}

          {/* Technical Details */}
          <div className="space-y-2">
            <h3 className="font-semibold">Technical Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Model:</span>
                <span className="ml-2">{getModelName()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Quality:</span>
                <span className="ml-2 capitalize">{quality}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Type:</span>
                <span className="ml-2 capitalize">{mode}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Job ID:</span>
                <span className="ml-2 font-mono text-xs">{itemId}</span>
              </div>
              {/* PHASE 2 FIX: Add seed display with fixed condition */}
              {shouldShowSeed && (
                <div>
                  <span className="text-muted-foreground">Seed:</span>
                  <span className="ml-2 font-mono">{extractedSeed}</span>
                </div>
              )}
              {/* DEBUG: Always show seed in technical details for debugging */}
              {!shouldShowSeed && (seed !== undefined || generationParams?.seed !== undefined) && (
                <div className="col-span-2 bg-red-100 p-1 rounded text-xs">
                  <span className="text-muted-foreground">DEBUG Seed:</span>
                  <span className="ml-2 font-mono">{seed !== undefined ? seed : generationParams?.seed}</span>
                </div>
              )}
              {/* PHASE 2 FIX: Add generation time display */}
              {generationTime && (
                <div>
                  <span className="text-muted-foreground">Generation Time:</span>
                  <span className="ml-2">{formatGenerationTime(generationTime)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Original Image Preview */}
          {originalImageUrl && (
            <div className="space-y-2">
              <h3 className="font-semibold">Generated Image</h3>
              <div className="flex justify-center">
                <img
                  src={originalImageUrl}
                  alt="Generated content"
                  className="max-h-64 object-contain rounded-lg border"
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
