import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PillButton } from '@/components/ui/pill-button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useFetchImageDetails } from '@/hooks/useFetchImageDetails';

import { useToast } from '@/hooks/use-toast';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  Copy, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  PanelLeft,
  PanelRight,
  Download,
  Edit,
  Trash2,
  Wand2,
  Send,
  RefreshCw
} from 'lucide-react';

export interface WorkspaceItem {
  id: string;
  url?: string;
  prompt: string;
  enhancedPrompt?: string;
  negativePrompt?: string;
  type: 'image' | 'video';
  quality?: 'fast' | 'high';
  aspectRatio?: string;
  modelType?: string;
  timestamp?: string;
  status?: string;
  originalAssetId?: string;
  seed?: string;
  generationTime?: string;
  referenceStrength?: number;
  metadata?: Record<string, any>;
}

export interface SimpleLightboxProps {
  items: WorkspaceItem[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onEdit?: (item: WorkspaceItem) => void;
  onDelete?: (item: WorkspaceItem) => void;
  onDownload?: (item: WorkspaceItem) => void;
  onSendToWorkspace?: (item: WorkspaceItem) => void;
  onRegenerateMore?: (item: WorkspaceItem) => void;
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
  onDelete,
  onDownload,
  onSendToWorkspace,
  onRegenerateMore,
  onCreateVideo,
  isDeleting = false,
  isRegenerating = false
}: SimpleLightboxProps): React.ReactElement | null {
  const [showGenerationDetails, setShowGenerationDetails] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const currentItem = items[currentIndex];

  // Fetch image details for the current item
  const { fetchDetails, loading: loadingDetails, details } = useFetchImageDetails();

  useEffect(() => {
    if (currentItem?.type === 'image' && currentItem.id) {
      fetchDetails(currentItem.id);
    }
  }, [currentItem?.id, currentItem?.type, fetchDetails]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setRightPanelCollapsed(!rightPanelCollapsed);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onClose, currentIndex, rightPanelCollapsed]);

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

  const handleVideoPlay = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  const handleVideoMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isVideoMuted;
      setIsVideoMuted(!isVideoMuted);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Text has been copied to your clipboard.",
      });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({
        title: "Copy failed",
        description: "Unable to copy text to clipboard.",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp?: string): string => {
    if (!timestamp) return 'Unknown';
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Invalid date';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!currentItem) {
    return null;
  }

  const handleEditPrompt = () => {
    if (onEdit) {
      onEdit(currentItem);
      onClose();
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(currentItem);
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload(currentItem);
    }
  };

  const handleSendToWorkspace = () => {
    if (onSendToWorkspace) {
      onSendToWorkspace(currentItem);
    }
  };

  const handleRegenerateMore = () => {
    if (onRegenerateMore) {
      onRegenerateMore(currentItem);
    }
  };

  const handleCreateVideo = () => {
    if (onCreateVideo) {
      onCreateVideo(currentItem);
    }
  };

  const getModelDisplayName = (modelType?: string, quality?: string): string => {
    if (!modelType) return 'Unknown';
    return quality === 'high' 
      ? `${modelType.toUpperCase()} HD`
      : modelType.toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex">
      {/* Close Button - elevated to avoid overlaps */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-4 top-4 h-8 w-8 p-0 bg-background/20 hover:bg-background/40 text-white z-[60]"
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
          className="absolute left-4 top-4 h-8 w-8 p-0 bg-background/20 hover:bg-background/40 text-white z-[60]"
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
              <CollapsibleContent className="pt-1">
                <div className="bg-muted/50 p-2 rounded text-xs text-foreground leading-relaxed">
                  {/* Display the actual original prompt, or fall back to current prompt */}
                  {details?.originalPrompt || currentItem.prompt}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 h-4 w-4 p-0 hover:bg-background/50"
                    onClick={() => copyToClipboard(details?.originalPrompt || currentItem.prompt)}
                    aria-label="Copy original prompt"
                  >
                    <Copy className="w-2.5 h-2.5" />
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Enhanced Prompt - only for images */}
            {currentItem.type === 'image' && currentItem.enhancedPrompt && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto text-xs font-medium text-foreground hover:bg-transparent">
                    Enhanced Prompt
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-1">
                  <div className="bg-muted/50 p-2 rounded text-xs text-foreground leading-relaxed">
                    {currentItem.enhancedPrompt}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 h-4 w-4 p-0 hover:bg-background/50"
                      onClick={() => copyToClipboard(currentItem.enhancedPrompt || '')}
                      aria-label="Copy enhanced prompt"
                    >
                      <Copy className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Negative Prompt - only if present */}
            {currentItem.negativePrompt && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto text-xs font-medium text-foreground hover:bg-transparent">
                    Negative Prompt
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-1">
                  <div className="bg-muted/50 p-2 rounded text-xs text-foreground leading-relaxed">
                    {currentItem.negativePrompt}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 h-4 w-4 p-0 hover:bg-background/50"
                      onClick={() => copyToClipboard(currentItem.negativePrompt || '')}
                      aria-label="Copy negative prompt"
                    >
                      <Copy className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Basic metadata always visible */}
            <div className="space-y-1 text-xs border-t border-border/20 pt-3">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-16">Size:</span>
                <span className="text-foreground">{currentItem.aspectRatio || 'Unknown'}</span>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-16">Model:</span>
                  <span className="text-foreground">{getModelDisplayName(currentItem.modelType, currentItem.quality)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-16">Created:</span>
                  <span className="text-foreground">{formatDate(currentItem.timestamp)}</span>
                </div>
                {/* Template Name - if available */}
                {details?.templateName && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-16">Template:</span>
                    <span className="text-foreground text-xs">{details.templateName}</span>
                  </div>
                )}
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
                <CollapsibleContent className="pt-2">
                  <div className="space-y-2 text-xs">
                    {details && (
                      <>
                        {details.seed && (
                          <div>
                            <h4 className="text-xs font-medium text-foreground mb-0.5">Seed</h4>
                            <p className="text-xs font-mono text-muted-foreground">{details.seed}</p>
                          </div>
                        )}
                        {details.generationTime && (
                          <div>
                            <h4 className="text-xs font-medium text-foreground mb-0.5">Generation Time</h4>
                            <p className="text-xs text-muted-foreground">{details.generationTime}</p>
                          </div>
                        )}
                        {details.referenceStrength !== undefined && (
                          <div>
                            <h4 className="text-xs font-medium text-foreground mb-0.5">Reference Strength</h4>
                            <p className="text-xs text-muted-foreground">{details.referenceStrength}</p>
                          </div>
                        )}
                      </>
                    )}
                    <div>
                      <h4 className="text-xs font-medium text-foreground mb-0.5">Asset ID</h4>
                      <p className="text-xs font-mono text-muted-foreground break-all">
                        {currentItem.originalAssetId || currentItem.id}
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Video-specific metadata */}
            {currentItem.type === 'video' && (
              <Collapsible open={showTechnicalDetails} onOpenChange={setShowTechnicalDetails}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-0 h-auto text-xs font-medium text-foreground hover:bg-transparent"
                  >
                    Video Details
                    <ChevronDown className={`w-3 h-3 transition-transform ${showTechnicalDetails ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="space-y-2 text-xs">
                    {currentItem.metadata?.duration && (
                      <div>
                        <h4 className="text-xs font-medium text-foreground mb-0.5">Duration</h4>
                        <p className="text-xs text-muted-foreground">{formatDuration(currentItem.metadata.duration)}</p>
                      </div>
                    )}
                    {currentItem.metadata?.resolution && (
                      <div>
                        <h4 className="text-xs font-medium text-foreground mb-0.5">Resolution</h4>
                        <p className="text-xs text-muted-foreground">{currentItem.metadata.resolution}</p>
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-medium text-foreground mb-0.5">Asset ID</h4>
                      <p className="text-xs font-mono text-muted-foreground break-all">
                        {currentItem.originalAssetId || currentItem.id}
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
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
              className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 p-0 bg-background/20 hover:bg-background/40 text-white z-[50]"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              aria-label="Previous item"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 p-0 bg-background/20 hover:bg-background/40 text-white z-[50]"
              onClick={handleNext}
              disabled={currentIndex === items.length - 1}
              aria-label="Next item"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </>
        )}

        {/* Media Content */}
        <div className="max-w-full max-h-full flex items-center justify-center">
          {currentItem.type === 'image' ? (
            <img
              src={currentItem.url}
              alt={currentItem.prompt}
              className="max-w-full max-h-[90vh] object-contain rounded"
              style={{ maxHeight: 'calc(100vh - 120px)' }}
            />
          ) : (
            <div className="relative">
              <video
                ref={videoRef}
                src={currentItem.url}
                className="max-w-full max-h-[90vh] object-contain rounded"
                style={{ maxHeight: 'calc(100vh - 120px)' }}
                controls={false}
                muted={isVideoMuted}
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                onClick={handleVideoPlay}
              />
              
              {/* Video Controls Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-12 w-12 p-0 bg-background/20 hover:bg-background/40 text-white rounded-full"
                  onClick={handleVideoPlay}
                  aria-label={isVideoPlaying ? 'Pause video' : 'Play video'}
                >
                  {isVideoPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </Button>
              </div>
              
              {/* Volume Control */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute bottom-4 right-4 h-8 w-8 p-0 bg-background/20 hover:bg-background/40 text-white"
                onClick={handleVideoMute}
                aria-label={isVideoMuted ? 'Unmute video' : 'Mute video'}
              >
                {isVideoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>
          )}
        </div>

        {/* Media Info Overlay */}
        <div className="absolute bottom-4 left-4 bg-background/20 backdrop-blur-sm rounded px-2 py-1 text-white text-xs">
          {currentIndex + 1} / {items.length}
        </div>
      </div>

      {/* Right Sidebar - Actions Panel */}
      <div className={`${rightPanelCollapsed ? 'w-6' : 'w-48'} bg-background/95 backdrop-blur-sm border-l border-border/20 transition-all duration-200`}>
        {/* Right Panel Toggle - repositioned */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-14 top-4 h-8 w-8 p-0 bg-background/20 hover:bg-background/40 text-white z-[60]"
          onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          aria-label={rightPanelCollapsed ? 'Expand right panel' : 'Collapse right panel'}
        >
          {rightPanelCollapsed ? <PanelRight className="w-3 h-3" /> : <PanelRight className="w-3 h-3 rotate-180" />}
        </Button>

        {!rightPanelCollapsed && (
          <div className="h-full overflow-y-auto p-4 space-y-3 pt-14">
            <div className="text-xs text-muted-foreground font-medium mb-3">Actions</div>
            
            <div className="space-y-2">
              {/* Send to Workspace */}
              {onSendToWorkspace && (
                <PillButton
                  onClick={handleSendToWorkspace}
                  variant="accent"
                  size="sm"
                  className="w-full justify-start gap-2"
                >
                  <Send className="w-3 h-3" />
                  Send to Control Box
                </PillButton>
              )}

              {/* Generate More - Images only */}
              {currentItem.type === 'image' && onRegenerateMore && (
                <PillButton
                  onClick={handleRegenerateMore}
                  variant="default"
                  size="sm" 
                  className="w-full justify-start gap-2"
                  disabled={isRegenerating}
                >
                  <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                  Generate 3 More
                </PillButton>
              )}

              {/* Create Video - Images only */}
              {currentItem.type === 'image' && onCreateVideo && (
                <PillButton
                  onClick={handleCreateVideo}
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start gap-2"
                >
                  <Wand2 className="w-3 h-3" />
                  Create Video
                </PillButton>
              )}

              {/* Download */}
              {onDownload && (
                <PillButton
                  onClick={handleDownload}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                >
                  <Download className="w-3 h-3" />
                  Download
                </PillButton>
              )}

              {/* Edit Prompt */}
              {onEdit && (
                <PillButton
                  onClick={handleEditPrompt}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2"
                >
                  <Edit className="w-3 h-3" />
                  Edit Prompt
                </PillButton>
              )}

              {/* Delete */}
              {onDelete && (
                <PillButton
                  onClick={handleDelete}
                  variant="destructive"
                  size="sm"
                  className="w-full justify-start gap-2"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </PillButton>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}