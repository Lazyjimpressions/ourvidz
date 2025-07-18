
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
  negativePrompt
}: PromptInfoModalProps) => {
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
    // Check for SDXL in modelType first
    if (modelType?.includes('sdxl') || modelType?.includes('SDXL') || modelType?.toLowerCase().includes('sdxl')) {
      return 'SDXL';
    }
    
    // Check for Enhanced models
    if (modelType?.includes('Enhanced') || modelType?.includes('7B')) {
      return 'Enhanced 7B';
    }
    
    // Default fallback
    return 'WAN 2.1';
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

            {/* Seed Information */}
            {seed && (
              <SeedDisplay 
                seed={seed}
                onUseSeed={(seedValue) => {
                  copyToClipboard(seedValue.toString(), 'Seed');
                }}
                className="justify-start"
              />
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
          {negativePrompt && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Negative Prompt</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(negativePrompt, 'Negative Prompt')}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm leading-relaxed text-muted-foreground">{negativePrompt}</p>
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
