import React, { useEffect, useCallback, useState } from 'react';
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Download, Save, Edit, Trash2, Copy, RefreshCw, Upload, Info, ChevronDown, ChevronUp } from "lucide-react";
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
    }
  }, [currentIndex, items.length, onClose, onIndexChange]);

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
        className="absolute top-4 right-4 h-10 w-10 p-0 bg-background/20 hover:bg-background/40 text-white z-10"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </Button>

      {/* Left Sidebar - Information Panel */}
      <div className="w-80 bg-background/95 backdrop-blur-sm border-r border-border/20 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header with type and quality badges */}
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              currentItem.type === 'video' 
                ? 'bg-blue-600 text-white' 
                : 'bg-green-600 text-white'
            }`}>
              {currentItem.type.toUpperCase()}
            </div>
            {currentItem.quality && (
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                currentItem.quality === 'high' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-orange-600 text-white'
              }`}>
                {currentItem.quality.toUpperCase()}
              </div>
            )}
          </div>

          {/* Always Visible Information */}
          <div className="space-y-4">
            {/* Original Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Original Prompt</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-muted"
                  onClick={() => copyToClipboard(currentItem.prompt, 'Original prompt')}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed break-words">
                {currentItem.prompt}
              </p>
            </div>

            {/* Enhanced Prompt - Note: enhancedPrompt not in ImageDetails, using current prompt */}
            {currentItem.prompt && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">Enhanced Prompt</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-muted"
                    onClick={() => copyToClipboard(currentItem.prompt, 'Enhanced prompt')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed break-words">
                  {currentItem.prompt}
                </p>
              </div>
            )}

            {/* Seed */}
            {(currentItem.seed || currentItem.generationParams?.seed) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">Seed</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-muted"
                    onClick={() => copyToClipboard(
                      String(currentItem.seed || currentItem.generationParams?.seed), 
                      'Seed'
                    )}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-sm font-mono bg-muted/50 px-2 py-1 rounded text-muted-foreground">
                  {currentItem.seed || currentItem.generationParams?.seed}
                </p>
              </div>
            )}

            {/* Model Used */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Model Used</h3>
              <p className="text-sm text-muted-foreground">
                {getModelDisplayName(currentItem.modelType, currentItem.quality)}
              </p>
            </div>
          </div>

          {/* Collapsible Generation Details */}
          <Collapsible open={showGenerationDetails} onOpenChange={setShowGenerationDetails}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto text-sm font-medium text-foreground hover:bg-transparent"
              >
                Generation Details
                {showGenerationDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-3">
              {detailsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                  Loading details...
                </div>
              ) : (
                <>
                  {details?.generationTime && (
                    <div>
                      <h4 className="text-xs font-medium text-foreground mb-1">Generation Time</h4>
                      <p className="text-sm text-muted-foreground">
                        {Math.round(details.generationTime)}ms
                      </p>
                    </div>
                  )}
                  
                  {details?.negativePrompt && (
                    <div>
                      <h4 className="text-xs font-medium text-foreground mb-1">Negative Prompt</h4>
                      <p className="text-sm text-muted-foreground break-words">
                        {details.negativePrompt}
                      </p>
                    </div>
                  )}

                  {details?.referenceStrength && (
                    <div>
                      <h4 className="text-xs font-medium text-foreground mb-1">Reference Strength</h4>
                      <p className="text-sm text-muted-foreground">
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
                className="w-full justify-between p-0 h-auto text-sm font-medium text-foreground hover:bg-transparent"
              >
                Technical Details
                {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-3">
              {currentItem.timestamp && (
                <div>
                  <h4 className="text-xs font-medium text-foreground mb-1">Created</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(currentItem.timestamp)}
                  </p>
                </div>
              )}
              
              {(currentItem.originalAssetId || currentItem.id) && (
                <div>
                  <h4 className="text-xs font-medium text-foreground mb-1">Asset ID</h4>
                  <p className="text-xs font-mono text-muted-foreground break-all">
                    {currentItem.originalAssetId || currentItem.id}
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Center - Image Display */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Navigation Buttons */}
        {items.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 p-0 bg-background/20 hover:bg-background/40 text-white disabled:opacity-50 z-10"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 p-0 bg-background/20 hover:bg-background/40 text-white disabled:opacity-50 z-10"
              onClick={handleNext}
              disabled={currentIndex === items.length - 1}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </>
        )}

        {/* Media */}
        <div className="max-w-full max-h-[90vh] mx-8">
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
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1">
          <div className="text-sm text-muted-foreground">
            {currentIndex + 1} of {items.length}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Actions Panel */}
      <div className="w-64 bg-background/95 backdrop-blur-sm border-l border-border/20 overflow-y-auto">
        <div className="p-6 space-y-4">
          <h3 className="text-sm font-medium text-foreground mb-4">Actions</h3>
          
          {/* Send to Control Box */}
          {onSendToControlBox && (
            <Button
              onClick={handleSendToControlBox}
              className="w-full justify-start gap-2 text-sm"
              variant="secondary"
            >
              <Upload className="w-4 h-4" />
              Send to Control Box
            </Button>
          )}

          {/* Generate 3 More */}
          <Button
            onClick={handleRegenerate}
            disabled={isGenerating || isRegenerating}
            className="w-full justify-start gap-2 text-sm"
            variant="default"
          >
            {isGenerating || isRegenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Generate 3 More
              </>
            )}
          </Button>

          <div className="border-t border-border/20 pt-4 space-y-2">
            {/* Traditional Actions */}
            {onSave && (
              <Button
                onClick={() => onSave(currentItem)}
                className="w-full justify-start gap-2 text-sm"
                variant="outline"
              >
                <Save className="w-4 h-4" />
                Save to Library
              </Button>
            )}

            {onDownload && (
              <Button
                onClick={() => onDownload(currentItem)}
                className="w-full justify-start gap-2 text-sm"
                variant="outline"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            )}

            {onEdit && (
              <Button
                onClick={() => onEdit(currentItem)}
                className="w-full justify-start gap-2 text-sm"
                variant="outline"
              >
                <Edit className="w-4 h-4" />
                Edit Prompt
              </Button>
            )}

            {onDelete && (
              <Button
                onClick={() => onDelete(currentItem)}
                disabled={isDeleting}
                className="w-full justify-start gap-2 text-sm"
                variant="destructive"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Remove from Workspace
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 