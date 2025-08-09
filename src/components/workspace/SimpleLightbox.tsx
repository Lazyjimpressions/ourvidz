import React, { useEffect, useCallback, useState } from 'react';
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Download, Save, Edit, Trash2, Copy, RefreshCw, Upload, Info, ChevronDown, ChevronUp, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useFetchImageDetails } from "@/hooks/useFetchImageDetails";
import { useImageRegeneration } from "@/hooks/useImageRegeneration";

interface WorkspaceItem {
  id: string;
  url: string;
  prompt: string;
  type: 'image' | 'video';
  modelType?: string;
  quality?: 'fast' | 'high';
  generationParams?: {
    seed?: number;
    originalAssetId?: string;
    timestamp?: string;
  };
  seed?: number;
  originalAssetId?: string;
  timestamp?: string;
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
  isDeleting?: boolean;
  isRegenerating?: boolean;
}

export const SimpleLightbox: React.FC<SimpleLightboxProps> = ({
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
  isDeleting = false,
  isRegenerating = false
}) => {
  const currentItem = items[currentIndex];
  const [showGenerationDetails, setShowGenerationDetails] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  
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
    if (imageId) {
      // Reset previous details first
      reset();
      fetchDetails(imageId);
    }
    
    // Cleanup function to cancel pending requests when switching images
    return () => {
      reset();
    };
  }, [currentItem?.originalAssetId, currentItem?.id, fetchDetails, reset]);

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

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
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

  if (!currentItem) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex">
      {/* Close Button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-7 w-7 p-0 bg-background/20 hover:bg-background/40 text-white z-10"
        onClick={onClose}
      >
        <X className="w-3 h-3" />
      </Button>

      {/* Left Sidebar - Information Panel */}
      <div className={`${leftPanelCollapsed ? 'w-6' : 'w-64'} bg-background/95 backdrop-blur-sm border-r border-border/20 overflow-y-auto transition-all duration-200`}>
        {/* Left Panel Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-2 top-2 h-6 w-6 p-0 bg-background/20 hover:bg-background/40 text-white z-10"
          onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
        >
          {leftPanelCollapsed ? <PanelLeftOpen className="w-2.5 h-2.5" /> : <PanelLeftClose className="w-2.5 h-2.5" />}
        </Button>

        {!leftPanelCollapsed && (
          <div className="p-3 space-y-3 pt-10">
            {/* Header with type and quality badges */}
            <div className="flex items-center gap-1.5">
              <div className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                currentItem.type === 'video' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-green-600 text-white'
              }`}>
                {currentItem.type.toUpperCase()}
              </div>
              {currentItem.quality && (
                <div className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                  currentItem.quality === 'high' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-orange-600 text-white'
                }`}>
                  {currentItem.quality.toUpperCase()}
                </div>
              )}
            </div>

            {/* Always Visible Information */}
            <div className="space-y-2">
              {/* Original Prompt */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-foreground">Original Prompt</h3>
                  <button
                    className="opacity-60 hover:opacity-100 transition-opacity"
                    onClick={() => copyToClipboard(currentItem.prompt, 'Original prompt')}
                  >
                    <Copy className="w-2.5 h-2.5" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed break-words">
                  {currentItem.prompt}
                </p>
              </div>

              {/* Enhanced Prompt */}
              {currentItem.prompt && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-foreground">Enhanced Prompt</h3>
                    <button
                      className="opacity-60 hover:opacity-100 transition-opacity"
                      onClick={() => copyToClipboard(currentItem.prompt, 'Enhanced prompt')}
                    >
                      <Copy className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed break-words">
                    {currentItem.prompt}
                  </p>
                </div>
              )}

              {/* Seed */}
              {(currentItem.seed || currentItem.generationParams?.seed) && (
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

              {/* Model Used */}
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-foreground">Model Used</h3>
                <p className="text-xs text-muted-foreground">
                  {getModelDisplayName(currentItem.modelType, currentItem.quality)}
                </p>
              </div>
            </div>

            {/* Collapsible Generation Details */}
            <Collapsible open={showGenerationDetails} onOpenChange={setShowGenerationDetails}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto text-xs font-medium text-foreground hover:bg-transparent"
                >
                  Generation Details
                  {showGenerationDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
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

            {/* Collapsible Technical Details */}
            <Collapsible open={showTechnicalDetails} onOpenChange={setShowTechnicalDetails}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto text-xs font-medium text-foreground hover:bg-transparent"
                >
                  Technical Details
                  {showTechnicalDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-1.5">
                {currentItem.timestamp && (
                  <div>
                    <h4 className="text-xs font-medium text-foreground mb-0.5">Created</h4>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(currentItem.timestamp)}
                    </p>
                  </div>
                )}
                
                {(currentItem.originalAssetId || currentItem.id) && (
                  <div>
                    <h4 className="text-xs font-medium text-foreground mb-0.5">Asset ID</h4>
                    <p className="text-xs font-mono text-muted-foreground break-all">
                      {currentItem.originalAssetId || currentItem.id}
                    </p>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>

      {/* Center - Image Display */}
      <div className="flex-1 flex items-center justify-center relative">
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

        {/* Media */}
        <div className="max-w-full max-h-[90vh] mx-4">
          {currentItem.type === 'video' ? (
            <video
              src={currentItem.url}
              className="max-w-full max-h-full object-contain rounded-lg"
              controls
              autoPlay
              loop
            />
          ) : (
            <img
              src={currentItem.url}
              alt={`Content ${currentItem.id}`}
              className="max-w-full max-h-full object-contain rounded-lg"
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

      {/* Right Sidebar - Actions Panel */}
      <div className={`${rightPanelCollapsed ? 'w-6' : 'w-48'} bg-background/95 backdrop-blur-sm border-l border-border/20 overflow-y-auto transition-all duration-200`}>
        {/* Right Panel Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-8 h-6 w-6 p-0 bg-background/20 hover:bg-background/40 text-white z-10"
          onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
        >
          {rightPanelCollapsed ? <PanelRightOpen className="w-2.5 h-2.5" /> : <PanelRightClose className="w-2.5 h-2.5" />}
        </Button>

        {!rightPanelCollapsed && (
          <div className="p-3 space-y-2 pt-12">
            <h3 className="text-xs font-medium text-foreground mb-2">Actions</h3>
            
            {/* Send to Control Box */}
            {onSendToControlBox && (
              <Button
                onClick={handleSendToControlBox}
                className="w-full justify-start gap-1.5 text-xs h-7"
                variant="secondary"
              >
                <Upload className="w-3 h-3" />
                Send to Control Box
              </Button>
            )}

            {/* Generate 3 More */}
            <Button
              onClick={handleRegenerate}
              disabled={isGenerating || isRegenerating}
              className="w-full justify-start gap-1.5 text-xs h-7"
              variant="default"
            >
              {isGenerating || isRegenerating ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  Generate 3 More
                </>
              )}
            </Button>

            <div className="border-t border-border/20 pt-2 space-y-1">
              {/* Traditional Actions */}
              {onSave && (
                <Button
                  onClick={() => onSave(currentItem)}
                  className="w-full justify-start gap-1.5 text-xs h-7"
                  variant="outline"
                >
                  <Save className="w-3 h-3" />
                  Save to Library
                </Button>
              )}

              {onDownload && (
                <Button
                  onClick={() => onDownload(currentItem)}
                  className="w-full justify-start gap-1.5 text-xs h-7"
                  variant="outline"
                >
                  <Download className="w-3 h-3" />
                  Download
                </Button>
              )}

              {onEdit && (
                <Button
                  onClick={() => onEdit(currentItem)}
                  className="w-full justify-start gap-1.5 text-xs h-7"
                  variant="outline"
                >
                  <Edit className="w-3 h-3" />
                  Edit Prompt
                </Button>
              )}

              {onDelete && (
                <Button
                  onClick={() => onDelete(currentItem)}
                  disabled={isDeleting}
                  className="w-full justify-start gap-1.5 text-xs h-7"
                  variant="destructive"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3 h-3" />
                      Remove from Workspace
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};