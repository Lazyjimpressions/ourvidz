
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Calendar, Clock, Image, Video, Zap, Crown, Download } from 'lucide-react';
// Inline seed display component (replaces deleted SeedDisplay)
const SeedDisplay: React.FC<{ seed?: number }> = ({ seed }) => {
  if (!seed) return null;
  return (
    <div className="bg-gray-800 p-2 rounded text-sm">
      <span className="text-gray-400">Seed: </span>
      <span className="text-white font-mono">{seed}</span>
    </div>
  );
};
import { toast } from 'sonner';
import { useFetchImageDetails } from '@/hooks/useFetchImageDetails';

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
  modelType?: string;
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
  modelType
}: PromptInfoModalProps) => {
  const { fetchDetails, loading, details } = useFetchImageDetails();

  // Reset details when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      // No reset function needed - details will be refreshed on next load
    }
  }, [isOpen]);

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

  const getModelIcon = () => {
    if (modelType?.includes('sdxl') || modelType?.includes('SDXL') || modelType?.toLowerCase().includes('sdxl')) {
      return quality === 'high' ? <Crown className="h-4 w-4" /> : <Zap className="h-4 w-4" />;
    }
    return mode === 'image' ? <Image className="h-4 w-4" /> : <Video className="h-4 w-4" />;
  };

  const getModelName = () => {
    if (modelType?.includes('sdxl_image_fast') || modelType?.includes('sdxl_image_high')) {
      return modelType.includes('fast') ? 'SDXL Fast' : 'SDXL High';
    }
    
    if (modelType?.includes('sdxl') || modelType?.includes('SDXL') || modelType?.toLowerCase().includes('sdxl')) {
      return 'SDXL';
    }
    
    if (modelType?.includes('enhanced') || modelType?.includes('Enhanced') || modelType?.includes('7B')) {
      return 'Enhanced 7B';
    }
    
    if (modelType?.includes('image_fast') || modelType?.includes('image_high')) {
      return modelType.includes('fast') ? 'WAN Fast' : 'WAN High';
    }
    
    return 'WAN 2.1';
  };

  const formatGenerationTime = (timeInSeconds: number) => {
    if (timeInSeconds < 60) {
      return `${timeInSeconds.toFixed(1)}s`;
    } else {
      const minutes = Math.floor(timeInSeconds / 60);
      const seconds = (timeInSeconds % 60).toFixed(1);
      return `${minutes}m ${seconds}s`;
    }
  };

  const handleLoadDetails = () => {
    fetchDetails(itemId);
  };

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

            {/* Load Generation Details Button */}
            {!details && (
              <div className="flex justify-center py-4">
                <Button
                  onClick={handleLoadDetails}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {loading ? 'Loading Details...' : 'Load Generation Details'}
                </Button>
              </div>
            )}

            {/* Generation Details */}
            {details && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium">Generation Details</h4>
                
                {details.seed !== undefined && (
                  <SeedDisplay seed={details.seed} />
                )}

                {details.generationTime && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Generation Time:</span>
                    <Badge variant="outline">{formatGenerationTime(details.generationTime)}</Badge>
                  </div>
                )}

                {details.referenceStrength && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Reference Strength:</span>
                                            <Badge variant="outline">{details.referenceStrength.toFixed(2)}</Badge>
                  </div>
                )}
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
          {details?.negativePrompt && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Negative Prompt</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(details.negativePrompt!, 'Negative Prompt')}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm leading-relaxed text-muted-foreground">{details.negativePrompt}</p>
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
              {details?.templateName && (
                <div>
                  <span className="text-muted-foreground">Template:</span>
                  <span className="ml-2">{details.templateName}</span>
                </div>
              )}
              {details?.seed && (
                <div>
                  <span className="text-muted-foreground">Seed:</span>
                  <span className="ml-2 font-mono">{details.seed}</span>
                </div>
              )}
              {details?.generationTime && (
                <div>
                  <span className="text-muted-foreground">Generation Time:</span>
                  <span className="ml-2">{details.generationTime}</span>
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
