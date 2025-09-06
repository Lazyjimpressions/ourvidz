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
  Settings,
  ChevronDown,
  ChevronRight,
  Info
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
  const [originalPromptExpanded, setOriginalPromptExpanded] = useState(false);
  const [enhancedPromptExpanded, setEnhancedPromptExpanded] = useState(false);
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

  const copyAllMetadata = async () => {
    if (!details) return;
    
    const metadata = [
      details.templateName && `Template: ${details.templateName}`,
      details.originalPrompt && `Original Prompt: ${details.originalPrompt}`,
      details.enhancedPrompt && `Enhanced Prompt: ${details.enhancedPrompt}`,
      details.seed && `Seed: ${details.seed}`,
      details.referenceStrength && `Reference Strength: ${(details.referenceStrength * 100).toFixed(0)}%`,
      details.denoiseStrength && `Denoise Strength: ${(details.denoiseStrength * 100).toFixed(0)}%`,
      details.guidanceScale && `Guidance Scale: ${details.guidanceScale}`,
      details.steps && `Steps: ${details.steps}`,
      details.lockHair !== undefined && `Hair Lock: ${details.lockHair ? 'ON' : 'OFF'}`,
      details.exactCopyMode !== undefined && `Exact Copy Mode: ${details.exactCopyMode ? 'ON' : 'OFF'}`,
      details.referenceMode && `Reference Mode: ${details.referenceMode}`,
      details.generationTime && `Generation Time: ${details.generationTime}s`
    ].filter(Boolean).join('\n');
    
    await copyToClipboard(metadata, 'All metadata');
  };

  const getJobTypeFormatted = () => {
    // Prioritize fetched details over props
    if (details?.jobType) return details.jobType;
    if (jobType) return jobType;
    
    // Fallback formatting based on fetched quality or prop quality
    const detectedQuality = details?.quality || quality;
    const qualityText = detectedQuality === 'high' ? 'High Quality' : 'Fast';
    const typeText = assetType === 'image' ? 'Image' : 'Video';
    return `${typeText} (${qualityText})`;
  };

  const getJobTypeBadgeVariant = () => {
    // Check fetched quality first, then prop quality
    const detectedQuality = details?.quality || quality;
    if (detectedQuality === 'high' || details?.jobType?.toLowerCase().includes('high')) {
      return 'border-purple-500/20 text-purple-400';
    }
    return 'border-blue-500/20 text-blue-400';
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent side="right" className="w-[380px] sm:w-[380px]">
        <SheetHeader className="pb-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Generation Details
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto pr-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/30 border-t-primary"></div>
            </div>
          )}

          {!loading && details && (
            <>
              {/* Header with Copy All */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                  <h4 className="font-medium text-xs">Generation Summary</h4>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAllMetadata}
                  className="h-6 text-xs px-2"
                  aria-label="Copy all metadata"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy All
                </Button>
              </div>

              <Badge 
                variant="outline" 
                className={`w-fit text-xs ${getJobTypeBadgeVariant()}`}
              >
                {getJobTypeFormatted()}
              </Badge>

              {/* Template Name */}
              {details?.templateName && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    <h4 className="font-medium text-xs">Template</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className="border-emerald-500/20 text-emerald-400 text-xs"
                    >
                      {details.templateName}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(details.templateName!, 'Template name')}
                      className="h-5 w-5 p-0"
                      aria-label="Copy template name"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Style & Framing */}
              {(details?.aspectRatio || details?.cameraAngle || details?.shotType || details?.style) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    <h4 className="font-medium text-xs">Style & Framing</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {details.aspectRatio && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Aspect:</span>
                        <Badge variant="outline" className="text-xs">{details.aspectRatio}</Badge>
                      </div>
                    )}
                    {details.cameraAngle && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Angle:</span>
                        <Badge variant="outline" className="text-xs">{details.cameraAngle}</Badge>
                      </div>
                    )}
                    {details.shotType && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Shot:</span>
                        <Badge variant="outline" className="text-xs">{details.shotType}</Badge>
                      </div>
                    )}
                    {details.style && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Style:</span>
                        <Badge variant="outline" className="text-xs">{details.style}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Original Prompt */}
              {details?.originalPrompt && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <h4 className="font-medium text-xs">Original Prompt</h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOriginalPromptExpanded(!originalPromptExpanded)}
                      className="h-5 w-5 p-0"
                      aria-label={originalPromptExpanded ? "Collapse original prompt" : "Expand original prompt"}
                    >
                      {originalPromptExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </Button>
                  </div>
                  {originalPromptExpanded && (
                    <div className="relative">
                      <div className="text-xs bg-muted/50 p-2 rounded border max-h-24 overflow-y-auto">
                        <p className="break-words leading-relaxed whitespace-pre-wrap pr-6">
                          {details.originalPrompt}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(details.originalPrompt!, 'Original prompt')}
                        className="absolute top-1 right-1 h-5 w-5 p-0 bg-background/80 hover:bg-background/90"
                        aria-label="Copy original prompt"
                      >
                        <Copy className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Enhanced Prompt */}
              {details?.enhancedPrompt && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                      <h4 className="font-medium text-xs">Enhanced Prompt</h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEnhancedPromptExpanded(!enhancedPromptExpanded)}
                      className="h-5 w-5 p-0"
                      aria-label={enhancedPromptExpanded ? "Collapse enhanced prompt" : "Expand enhanced prompt"}
                    >
                      {enhancedPromptExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </Button>
                  </div>
                  {enhancedPromptExpanded && (
                    <div className="relative">
                      <div className="text-xs bg-muted/50 p-2 rounded border max-h-24 overflow-y-auto">
                        <p className="break-words leading-relaxed whitespace-pre-wrap pr-6">
                          {details.enhancedPrompt}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(details.enhancedPrompt!, 'Enhanced prompt')}
                        className="absolute top-1 right-1 h-5 w-5 p-0 bg-background/80 hover:bg-background/90"
                        aria-label="Copy enhanced prompt"
                      >
                        <Copy className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Verified i2i Settings - Only show if referenceStrength exists (actual i2i job) */}
              {details?.referenceStrength && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <h4 className="font-medium text-xs">Verified i2i Settings</h4>
                    <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-400 px-1.5 py-0.5">
                      from job log
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {details.referenceMode && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Reference Mode:</span>
                        <span className="capitalize">{details.referenceMode}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Reference Strength:</span>
                      <span>{(details.referenceStrength * 100).toFixed(0)}%</span>
                    </div>

                    {details.denoiseStrength !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Denoise Strength:</span>
                        <span>{(details.denoiseStrength * 100).toFixed(0)}%</span>
                      </div>
                    )}

                    {details.guidanceScale && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Guidance Scale:</span>
                        <span>{details.guidanceScale}</span>
                      </div>
                    )}

                    {details.steps && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Steps:</span>
                        <span>{details.steps}</span>
                      </div>
                    )}

                    {details.seed && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Seed:</span>
                        <div className="flex items-center gap-1">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{details.seed}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(details.seed!.toString(), 'Seed')}
                            className="h-4 w-4 p-0"
                            aria-label="Copy seed"
                          >
                            <Copy className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {details.lockHair !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Hair Lock:</span>
                        <Badge variant={details.lockHair ? "default" : "secondary"} className="text-xs px-1.5 py-0.5">
                          {details.lockHair ? 'ON' : 'OFF'}
                        </Badge>
                      </div>
                    )}

                    {details.exactCopyMode !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Exact Copy Mode:</span>
                        <Badge variant={details.exactCopyMode ? "default" : "secondary"} className="text-xs px-1.5 py-0.5">
                          {details.exactCopyMode ? 'ON' : 'OFF'}
                        </Badge>
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
              {!loading && !details && (
                <div className="text-center py-6 text-muted-foreground">
                  <FileText className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No generation details available</p>
                  <p className="text-xs mt-1 opacity-75">This asset may have been imported or generated externally</p>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};