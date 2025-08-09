import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PillButton } from "@/components/ui/pill-button";
import { 
  X, ChevronLeft, ChevronRight, Edit, Copy, RotateCcw, Heart, Download, Trash2,
  ChevronDown, Settings, Sliders, Palette, Clock, Layers, PanelLeft, PanelRight,
  Play, Pause, Volume2, VolumeX
} from "lucide-react";
import { toast } from "sonner";
import { useFetchImageDetails } from "@/hooks/useFetchImageDetails";
import { useImageRegeneration } from "@/hooks/useImageRegeneration";

interface WorkspaceItem {
  id: string;
  url: string;
  prompt: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  timestamp: Date;
  quality: 'fast' | 'high';
  modelType?: string;
  duration?: number;
  enhancedPrompt?: string;
  seed?: number;
  generationParams?: Record<string, any>;
  // Video-specific properties
  resolution?: string;
  format?: string;
  // Optional originalAssetId for compatibility
  originalAssetId?: string;
}

interface SimpleLightboxProps {
  items: WorkspaceItem[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onEdit?: (item: WorkspaceItem) => void;
  onSave?: (item: WorkspaceItem) => void;
  onDelete?: (item: WorkspaceItem) => void;
  onDownload?: (item: WorkspaceItem) => void;
  onSendToControlBox?: (item: WorkspaceItem) => void;
  onRegenerate?: (item: WorkspaceItem) => void;
  onCreateVideo?: (item: WorkspaceItem) => void;
  isDeleting?: boolean;
  isRegenerating?: boolean;
}

export function SimpleLightbox({
  items,
  currentIndex,
  onClose,
  onIndexChange,
  onEdit,
  onSave,
  onDelete,
  onDownload,
  onSendToControlBox,
  onRegenerate,
  onCreateVideo,
  isDeleting = false,
  isRegenerating = false
}: SimpleLightboxProps): React.ReactElement | null {
  const [showGenerationDetails, setShowGenerationDetails] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  
  const currentItem = items[currentIndex];
  
  if (!currentItem) return null;

  // Video control states
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Fetch detailed image information
  const { fetchDetails, loading: detailsLoading, details, reset } = useFetchImageDetails();
  
  // Setup regeneration functionality
  const { regenerateImage, isGenerating } = useImageRegeneration(
    {
      id: currentItem?.id || '',
      originalAssetId: currentItem?.originalAssetId || currentItem?.id || '',
      type: currentItem?.type === 'video' ? 'video' : 'image',
      url: currentItem?.url || '',
      prompt: currentItem?.prompt || '',
      timestamp: new Date(currentItem?.timestamp || Date.now()),
      quality: currentItem?.quality || 'fast',
      modelType: currentItem?.modelType,
      seed: currentItem?.seed || currentItem?.generationParams?.seed,
      enhancedPrompt: currentItem?.prompt,
      generationParams: currentItem?.generationParams
    },
    {
      seed: currentItem?.seed || currentItem?.generationParams?.seed,
      negativePrompt: details?.negativePrompt,
      originalPrompt: currentItem?.prompt
    }
  );

  // Video handlers
  const handlePlayPause = () => {
    if (videoRef.current && currentItem.type === 'video') {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  const handleToggleMute = () => {
    if (videoRef.current && currentItem.type === 'video') {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVideoEnded = () => {
    setIsVideoPlaying(false);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        if (currentIndex > 0) {
          onIndexChange(currentIndex - 1);
        }
        break;
      case 'ArrowRight':
        if (currentIndex < items.length - 1) {
          onIndexChange(currentIndex + 1);
        }
        break;
      case '[':
        setLeftPanelCollapsed(!leftPanelCollapsed);
        break;
      case ']':
        setRightPanelCollapsed(!rightPanelCollapsed);
        break;
      case '\\':
        if (leftPanelCollapsed || rightPanelCollapsed) {
          setLeftPanelCollapsed(false);
          setRightPanelCollapsed(false);
        } else {
          setLeftPanelCollapsed(true);
          setRightPanelCollapsed(true);
        }
        break;
    }
  }, [currentIndex, items.length, onClose, onIndexChange, leftPanelCollapsed, rightPanelCollapsed]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [handleKeyDown]);

  // Fetch details when item changes
  useEffect(() => {
    const imageId = currentItem?.originalAssetId || currentItem?.id;
    if (imageId && currentItem.type === 'image') {
      // Reset previous details first
      reset();
      fetchDetails(imageId);
    }
    
    // Cleanup function to cancel pending requests when switching images
    return () => {
      reset();
    };
  }, [currentItem?.originalAssetId, currentItem?.id, currentItem?.type, fetchDetails, reset]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      onIndexChange(currentIndex + 1);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied to clipboard`);
  };

  const handleSendToControlBox = () => {
    if (onSendToControlBox && currentItem) {
      onSendToControlBox(currentItem);
      toast.success('Prompt sent to control box');
    }
  };

  const handleRegenerate = async () => {
    try {
      await regenerateImage();
    } catch (error) {
      console.error('Regeneration failed:', error);
    }
  };

  const formatDate = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getModelDisplayName = (modelType?: string, quality?: string) => {
    if (!modelType) return quality === 'high' ? 'SDXL High' : 'SDXL Fast';
    return modelType.includes('sdxl') 
      ? `SDXL ${quality === 'high' ? 'High' : 'Fast'}`
      : modelType.toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex">
      {/* Close Button - elevated to avoid overlaps */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 right-4 h-8 w-8 p-0 bg-background/20 hover:bg-background/40 text-white z-50"
        onClick={onClose}
        aria-label="Close lightbox"
      >
        <X className="w-4 h-4" />
      </Button>

      {/* Left Sidebar - Information Panel */}
      <div className={`${leftPanelCollapsed ? 'w-6' : 'w-64'} bg-background/95 backdrop-blur-sm border-r border-border/20 transition-all duration-200`}>
        {/* Left Panel Toggle - repositioned */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-4 top-4 h-8 w-8 p-0 bg-background/20 hover:bg-background/40 text-white z-40"
          onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
          aria-label={leftPanelCollapsed ? 'Expand left panel' : 'Collapse left panel'}
        >
          {leftPanelCollapsed ? <PanelLeft className="w-3 h-3" /> : <PanelLeft className="w-3 h-3 rotate-180" />}
        </Button>

        {!leftPanelCollapsed && (
          <div className="h-full overflow-y-auto p-4 space-y-3 pt-14">
            {/* Header with type and quality badges */}
            <div className="flex items-center gap-1.5">
              <Badge variant={currentItem.type === 'video' ? 'default' : 'secondary'} className="text-xs">
                {currentItem.type.toUpperCase()}
              </Badge>
              {currentItem.quality && (
                <Badge variant={currentItem.quality === 'high' ? 'default' : 'outline'} className="text-xs">
                  {currentItem.quality.toUpperCase()}
                </Badge>
              )}
            </div>

            {/* Original and Enhanced Prompts as collapsibles */}
            <Collapsible open={true}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto text-xs font-medium text-foreground hover:bg-transparent">
                  Original Prompt
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-muted-foreground leading-relaxed break-words">
                    {currentItem.prompt}
                  </p>
                  <button
                    className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={() => copyToClipboard(currentItem.prompt, 'Original Prompt')}
                  >
                    <Copy className="w-2.5 h-2.5" />
                  </button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {currentItem.enhancedPrompt && currentItem.enhancedPrompt !== currentItem.prompt && (
              <Collapsible open={false}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto text-xs font-medium text-foreground hover:bg-transparent">
                    Enhanced Prompt
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-muted-foreground leading-relaxed break-words">
                      {currentItem.enhancedPrompt}
                    </p>
                    <button
                      className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={() => copyToClipboard(currentItem.enhancedPrompt || '', 'Enhanced Prompt')}
                    >
                      <Copy className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

              {/* Seed - Images only */}
              {currentItem.type === 'image' && (currentItem.seed || currentItem.generationParams?.seed) && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-foreground">Seed</h3>
                    <button
                      className="opacity-60 hover:opacity-100 transition-opacity"
                      onClick={() => copyToClipboard(
                        String(currentItem.seed || currentItem.generationParams?.seed), 
                        'Seed'
                      )}
                    >
                      <Copy className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <p className="text-xs font-mono bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground">
                    {currentItem.seed || currentItem.generationParams?.seed}
                  </p>
                </div>
              )}

              {/* Basic Info */}
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-foreground">Details</h3>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">
                    Quality: <span className="text-foreground">{currentItem.quality}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Type: <span className="text-foreground">{currentItem.type}</span>
                  </p>
                  {currentItem.type === 'video' && (
                    <>
                      {currentItem.duration && (
                        <p className="text-xs text-muted-foreground">
                          Duration: <span className="text-foreground">{currentItem.duration}s</span>
                        </p>
                      )}
                      {currentItem.resolution && (
                        <p className="text-xs text-muted-foreground">
                          Resolution: <span className="text-foreground">{currentItem.resolution}</span>
                        </p>
                      )}
                      {currentItem.format && (
                        <p className="text-xs text-muted-foreground">
                          Format: <span className="text-foreground">{currentItem.format}</span>
                        </p>
                      )}
                    </>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Model: <span className="text-foreground">{getModelDisplayName(currentItem.modelType, currentItem.quality)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created: <span className="text-foreground">{formatDate(currentItem.timestamp)}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Collapsible Generation Details - Images only */}
            {currentItem.type === 'image' && (
              <Collapsible open={showGenerationDetails} onOpenChange={setShowGenerationDetails}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-0 h-auto text-xs font-medium text-foreground hover:bg-transparent"
                  >
                    Generation Details
                    <ChevronDown className={`w-3 h-3 transition-transform ${showGenerationDetails ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-1.5">
                  {detailsLoading ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="animate-spin rounded-full h-2.5 w-2.5 border-b border-current"></div>
                      Loading details...
                    </div>
                  ) : (
                    <>
                      {details?.generationTime && (
                        <div>
                          <h4 className="text-xs font-medium text-foreground mb-0.5">Generation Time</h4>
                          <p className="text-xs text-muted-foreground">
                            {Math.round(details.generationTime)}ms
                          </p>
                        </div>
                      )}
                      
                      {details?.negativePrompt && (
                        <div>
                          <h4 className="text-xs font-medium text-foreground mb-0.5">Negative Prompt</h4>
                          <p className="text-xs text-muted-foreground break-words">
                            {details.negativePrompt}
                          </p>
                        </div>
                      )}

                      {details?.referenceStrength && (
                        <div>
                          <h4 className="text-xs font-medium text-foreground mb-0.5">Reference Strength</h4>
                          <p className="text-xs text-muted-foreground">
                            {(details.referenceStrength * 100).toFixed(0)}%
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Template & Technical Details */}
            {/* Template */}
            <div className="space-y-1 mt-2">
              <h3 className="text-xs font-medium text-foreground">Template</h3>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">
                  Template: <span className="text-foreground">{currentItem.generationParams?.template || 'None'}</span>
                </p>
                {currentItem.generationParams?.fallback && (
                  <p className="text-xs text-muted-foreground">
                    Fallback: <span className="text-foreground">{currentItem.generationParams.fallback}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Technical Details */}
            <Collapsible open={showTechnicalDetails} onOpenChange={setShowTechnicalDetails}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto text-xs font-medium text-foreground hover:bg-transparent"
                >
                  Technical Details
                  <ChevronDown className={`w-3 h-3 transition-transform ${showTechnicalDetails ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-1.5">
                <div>
                  <h4 className="text-xs font-medium text-foreground mb-0.5">Asset ID</h4>
                  <p className="text-xs font-mono text-muted-foreground break-all">
                    {currentItem.originalAssetId || currentItem.id}
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>

      {/* Center - Media Display */}
      <div className="flex-1 flex items-center justify-center p-3 relative">
        {/* Navigation Buttons */}
        {items.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 bg-background/20 hover:bg-background/40 text-white disabled:opacity-50 z-10"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 bg-background/20 hover:bg-background/40 text-white disabled:opacity-50 z-10"
              onClick={handleNext}
              disabled={currentIndex === items.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </>
        )}

        <div className="relative max-w-full max-h-full">
          {/* Media Container */}
          <div className="relative rounded-lg overflow-hidden shadow-2xl">
            {currentItem.type === 'video' ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  src={currentItem.url}
                  className="max-w-full max-h-[80vh] object-contain"
                  poster={currentItem.thumbnailUrl}
                  onEnded={handleVideoEnded}
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  muted={isMuted}
                  loop
                />
                
                {/* Video Controls Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Play/Pause Button */}
                      <button
                        onClick={handlePlayPause}
                        className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
                      >
                        {isVideoPlaying ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                      </button>
                      
                      {/* Mute/Unmute Button */}
                      <button
                        onClick={handleToggleMute}
                        className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
                      >
                        {isMuted ? (
                          <VolumeX className="w-5 h-5" />
                        ) : (
                          <Volume2 className="w-5 h-5" />
                        )}
                      </button>
                      
                      {/* Duration */}
                      {currentItem.duration && (
                        <span className="text-white text-sm">
                          {formatDuration(currentItem.duration)}
                        </span>
                      )}
                    </div>
                    
                    {/* Video Info */}
                    <div className="text-white text-sm opacity-80">
                      Video
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <img
                src={currentItem.url}
                alt={currentItem.prompt}
                className="max-w-full max-h-[80vh] object-contain"
                onLoad={() => console.log('Image loaded successfully')}
                onError={(e) => console.error('Image failed to load:', e)}
              />
            )}
          </div>

          {/* Navigation indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1">
            <div className="text-xs text-muted-foreground">
              {currentIndex + 1} of {items.length}
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Actions Panel */}
      <div className={`${rightPanelCollapsed ? 'w-6' : 'w-56'} bg-background/95 backdrop-blur-sm border-l border-border/20 overflow-y-auto transition-all duration-200`}>
        {/* Right Panel Toggle - repositioned above pills */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-4 top-4 h-8 w-8 p-0 bg-background/20 hover:bg-background/40 text-white z-40"
          onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          aria-label={rightPanelCollapsed ? 'Expand right panel' : 'Collapse right panel'}
        >
          {rightPanelCollapsed ? <PanelRight className="w-3 h-3" /> : <PanelRight className="w-3 h-3 rotate-180" />}
        </Button>

        {!rightPanelCollapsed && (
          <div className="p-4 space-y-3 pt-16">
            <div className="flex flex-col gap-2">
              {/* Send to Control Box - Primary action for images */}
              {currentItem.type === 'image' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PillButton 
                        onClick={handleSendToControlBox} 
                        size="sm" 
                        variant="default"
                        disabled={!currentItem.url}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Send to Control Box
                      </PillButton>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Use this image as reference for new generation</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Generate 3 More - For images only */}
              {currentItem.type === 'image' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PillButton 
                        onClick={handleRegenerate} 
                        size="sm" 
                        variant="secondary"
                        disabled={isGenerating}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Generate 3 More
                      </PillButton>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Generate 3 more images like this one</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Create Video - For images only */}
              {currentItem.type === 'image' && (
                <PillButton 
                  onClick={() => onCreateVideo?.(currentItem)} 
                  size="sm" 
                  variant="default"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Create Video
                </PillButton>
              )}

              {/* Save */}
              <PillButton 
                onClick={() => onSave?.(currentItem)} 
                size="sm" 
                variant="ghost"
              >
                <Heart className="w-3 h-3 mr-1" />
                Save
              </PillButton>

              {/* Download */}
              <PillButton 
                onClick={() => onDownload?.(currentItem)} 
                size="sm" 
                variant="ghost"
              >
                <Download className="w-3 h-3 mr-1" />
                Download
              </PillButton>

              {/* Edit Prompt */}
              <PillButton 
                onClick={() => onEdit?.(currentItem)} 
                size="sm" 
                variant="outline"
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit Prompt
              </PillButton>

              {/* Remove */}
              <PillButton 
                onClick={() => onDelete?.(currentItem)} 
                size="sm" 
                variant="destructive"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Remove
              </PillButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}