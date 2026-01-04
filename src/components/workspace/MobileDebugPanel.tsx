import React from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MobileDebugPanelProps {
  referenceImage: File | null;
  referenceImageUrl: string | null;
  selectedModel: { id: string; type: string; display_name: string } | null;
  mode: 'image' | 'video';
  isOpen?: boolean;
  onToggle?: () => void;
}

/**
 * Mobile debug panel to show reference image state without needing console
 */
export const MobileDebugPanel: React.FC<MobileDebugPanelProps> = ({
  referenceImage,
  referenceImageUrl,
  selectedModel,
  mode,
  isOpen = false,
  onToggle
}) => {
  const hasReferenceImage = !!(referenceImage || referenceImageUrl);
  const isI2IModel = selectedModel?.type === 'fal' && mode === 'image';
  const shouldHaveReference = isI2IModel;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full text-xs">
          {isOpen ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
          Debug Info
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-3 bg-muted/50 rounded text-xs space-y-2 border">
          <div className="flex items-center gap-2">
            <span className="font-medium">Model:</span>
            <span>{selectedModel?.display_name || 'None'}</span>
            {isI2IModel && (
              <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-600 rounded text-[10px]">
                I2I Model
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="font-medium">Mode:</span>
            <span className="capitalize">{mode}</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Reference Image:</span>
              {hasReferenceImage ? (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Loaded</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  <span>Missing</span>
                </div>
              )}
            </div>
            
            {referenceImage && (
              <div className="pl-4 text-[10px] text-muted-foreground">
                File: {referenceImage.name} ({(referenceImage.size / 1024).toFixed(0)}KB)
              </div>
            )}
            
            {referenceImageUrl && (
              <div className="pl-4 text-[10px] text-muted-foreground break-all">
                URL: {referenceImageUrl.substring(0, 50)}...
              </div>
            )}
          </div>

          {shouldHaveReference && !hasReferenceImage && (
            <div className="p-2 bg-yellow-500/20 border border-yellow-500/50 rounded text-[10px]">
              <AlertCircle className="h-3 w-3 inline mr-1" />
              I2I model selected but no reference image. Generation will fail.
            </div>
          )}

          {hasReferenceImage && isI2IModel && (
            <div className="p-2 bg-green-500/20 border border-green-500/50 rounded text-[10px]">
              <CheckCircle className="h-3 w-3 inline mr-1" />
              Ready for I2I generation
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

