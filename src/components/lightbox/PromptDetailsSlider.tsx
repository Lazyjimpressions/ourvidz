import React, { useState, useEffect } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Copy, 
  FileText, 
  Sparkles, 
  Zap, 
  Tag,
  CheckCircle2,
  Settings
} from 'lucide-react';
import { useFetchImageDetails } from '@/hooks/useFetchImageDetails';
import { toast } from '@/hooks/use-toast';

interface PromptDetailsSliderProps {
  assetId: string;
  assetType: 'image' | 'video';
  jobType?: string;
  quality?: string;
  trigger: React.ReactNode;
}

export const PromptDetailsSlider: React.FC<PromptDetailsSliderProps> = ({
  assetId,
  assetType,
  jobType,
  quality,
  trigger
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { fetchDetails, loading, details } = useFetchImageDetails();

  useEffect(() => {
    if (isOpen && assetId) {
      fetchDetails(assetId);
    }
  }, [isOpen, assetId, fetchDetails]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
        duration: 2000,
      });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const getJobTypeFormatted = () => {
    if (jobType) return jobType;
    
    // Fallback formatting based on quality and type
    const qualityText = quality === 'high' ? 'High Quality' : 'Fast';
    const typeText = assetType === 'image' ? 'Image' : 'Video';
    return `${typeText} (${qualityText})`;
  };

  const getJobTypeBadgeVariant = () => {
    if (quality === 'high') return 'border-purple-500/20 text-purple-400';
    return 'border-blue-500/20 text-blue-400';
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Generation Details
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/30 border-t-primary"></div>
            </div>
          )}

          {!loading && (
            <>
              {/* Job Type */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium text-sm">Job Type</h4>
                </div>
                <Badge 
                  variant="outline" 
                  className={`w-fit ${getJobTypeBadgeVariant()}`}
                >
                  {getJobTypeFormatted()}
                </Badge>
              </div>

              {/* Template Name */}
              {details?.templateName && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium text-sm">Template</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className="border-emerald-500/20 text-emerald-400"
                    >
                      {details.templateName}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(details.templateName!, 'Template name')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Original Prompt */}
              {details?.originalPrompt && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium text-sm">Original Prompt</h4>
                  </div>
                  <div className="relative">
                    <div className="text-sm bg-muted/50 p-3 rounded-lg border max-h-32 overflow-y-auto">
                      <p className="break-words leading-relaxed whitespace-pre-wrap pr-8">
                        {details.originalPrompt}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(details.originalPrompt!, 'Original prompt')}
                      className="absolute top-2 right-2 h-6 w-6 p-0 bg-background/80 hover:bg-background/90"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Enhanced Prompt */}
              {details?.enhancedPrompt && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium text-sm">Enhanced Prompt</h4>
                  </div>
                  <div className="relative">
                    <div className="text-sm bg-muted/50 p-3 rounded-lg border max-h-32 overflow-y-auto">
                      <p className="break-words leading-relaxed whitespace-pre-wrap pr-8">
                        {details.enhancedPrompt}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(details.enhancedPrompt!, 'Enhanced prompt')}
                      className="absolute top-2 right-2 h-6 w-6 p-0 bg-background/80 hover:bg-background/90"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Additional Details */}
              {(details?.seed || details?.referenceStrength || details?.generationTime) && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Technical Details</h4>
                  <div className="space-y-2 text-sm">
                    {details.seed && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Seed:</span>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">{details.seed}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(details.seed!.toString(), 'Seed')}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {details.referenceStrength && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Reference Strength:</span>
                        <span>{(details.referenceStrength * 100).toFixed(0)}%</span>
                      </div>
                    )}

                    {details.generationTime && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Generation Time:</span>
                        <span>{details.generationTime}s</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* No Details Message */}
              {!details && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No generation details available</p>
                  <p className="text-xs mt-1">This asset may have been imported or generated externally</p>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};