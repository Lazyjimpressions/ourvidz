
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
      <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            Generation Details
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              {getModelIcon()}
              {getModelName()}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Generation Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(timestamp)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{contentCount} {mode}(s)</span>
              </div>
              <Badge variant={quality === 'high' ? 'default' : 'secondary'} className="text-xs">
                {quality === 'high' ? 'High Quality' : 'Fast'}
              </Badge>
            </div>

            {/* Load Generation Details Button */}
            {!details && (
              <div className="flex justify-center py-3">
                <Button
                  onClick={handleLoadDetails}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Download className="h-3.5 w-3.5" />
                  {loading ? 'Loading Details...' : 'Load Generation Details'}
                </Button>
              </div>
            )}

            {/* Generation Details */}
            {details && (
              <div className="space-y-2 p-3 bg-muted/50 rounded border">
                <h4 className="font-medium text-sm">Generation Details</h4>
                
                {details.seed !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Seed:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{details.seed}</code>
                  </div>
                )}

                {details.generationTime && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Generation Time:</span>
                    <Badge variant="outline" className="text-xs">{formatGenerationTime(details.generationTime)}</Badge>
                  </div>
                )}

                {/* Style & Framing */}
                {(details.aspectRatio || details.cameraAngle || details.shotType || details.style) && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Style & Framing:</span>
                    <div className="flex flex-wrap gap-1">
                      {details.aspectRatio && <Badge variant="outline" className="text-xs">{details.aspectRatio}</Badge>}
                      {details.cameraAngle && <Badge variant="outline" className="text-xs">{details.cameraAngle}</Badge>}
                      {details.shotType && <Badge variant="outline" className="text-xs">{details.shotType}</Badge>}
                      {details.style && <Badge variant="outline" className="text-xs">{details.style}</Badge>}
                    </div>
                  </div>
                )}

                {details.referenceStrength && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Reference Strength:</span>
                    <Badge variant="outline" className="text-xs">{(details.referenceStrength * 100).toFixed(0)}%</Badge>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Prompt Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Prompt</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(prompt, 'Prompt')}
                className="h-7 text-xs"
                aria-label="Copy prompt"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <div className="bg-muted p-2 rounded border max-h-32 overflow-y-auto">
              <p className="text-xs leading-relaxed break-words">{prompt}</p>
            </div>
          </div>

          {/* Negative Prompt Section */}
          {details?.negativePrompt && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Negative Prompt</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(details.negativePrompt!, 'Negative Prompt')}
                  className="h-7 text-xs"
                  aria-label="Copy negative prompt"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
              <div className="bg-muted p-2 rounded border max-h-24 overflow-y-auto">
                <p className="text-xs leading-relaxed text-muted-foreground break-words">{details.negativePrompt}</p>
              </div>
            </div>
          )}

          {/* Technical Details */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Technical Details</h3>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model:</span>
                <span>{getModelName()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quality:</span>
                <span className="capitalize">{quality}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="capitalize">{mode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Job ID:</span>
                <code className="font-mono text-xs bg-muted px-1 rounded truncate max-w-20" title={itemId}>{itemId}</code>
              </div>
              {details?.templateName && (
                <div className="flex justify-between col-span-2">
                  <span className="text-muted-foreground">Template:</span>
                  <span className="truncate max-w-48" title={details.templateName}>{details.templateName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Original Image Preview */}
          {originalImageUrl && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Generated Image</h3>
              <div className="flex justify-center">
                <img
                  src={originalImageUrl}
                  alt="Generated content"
                  className="max-h-48 object-contain rounded border"
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
