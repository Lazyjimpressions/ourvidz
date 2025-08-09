import React, { useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Download, Save, Edit, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  isDeleting?: boolean;
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
  isDeleting = false
}) => {
  const currentItem = items[currentIndex];

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

  if (!currentItem) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      {/* Close Button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 right-4 h-10 w-10 p-0 bg-background/20 hover:bg-background/40 text-white"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </Button>

      {/* Navigation Buttons */}
      {items.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 p-0 bg-background/20 hover:bg-background/40 text-white disabled:opacity-50"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 p-0 bg-background/20 hover:bg-background/40 text-white disabled:opacity-50"
            onClick={handleNext}
            disabled={currentIndex === items.length - 1}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </>
      )}

      {/* Main Content */}
      <div className="relative max-w-4xl max-h-[90vh] mx-4">
        {/* Media */}
        <div className="relative">
          {currentItem.type === 'video' ? (
            <video
              src={currentItem.url}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
              controls
              autoPlay
              loop
            />
          ) : (
            <img
              src={currentItem.url}
              alt={`Content ${currentItem.id}`}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </div>

        {/* Action Bar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg px-4 py-2">
          {/* Navigation Info */}
          <div className="text-sm text-muted-foreground mr-4">
            {currentIndex + 1} of {items.length}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {onEdit && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0"
                      onClick={(e) => handleActionClick(e, () => onEdit(currentItem))}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit prompt</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {onSave && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0"
                      onClick={(e) => handleActionClick(e, () => onSave(currentItem))}
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Save to library</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {onDownload && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0"
                      onClick={(e) => handleActionClick(e, () => onDownload(currentItem))}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {onDelete && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 w-8 p-0"
                      onClick={(e) => handleActionClick(e, () => onDelete(currentItem))}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Remove from workspace</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Enhanced Info Panel with scrollable content */}
        <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-4 max-w-md max-h-[60vh] overflow-y-auto">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                currentItem.type === 'video' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-green-500 text-white'
              }`}>
                {currentItem.type.toUpperCase()}
              </div>
              {currentItem.quality && (
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  currentItem.quality === 'high' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-orange-500 text-white'
                }`}>
                  {currentItem.quality.toUpperCase()}
                </div>
              )}
            </div>
            
            <div className="text-sm">
              <p className="font-medium text-foreground mb-1">Prompt:</p>
              <p className="text-muted-foreground break-words leading-relaxed">{currentItem.prompt}</p>
            </div>

            {(currentItem.generationParams?.seed || currentItem.seed) && (
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">Seed:</p>
                <p className="text-muted-foreground font-mono text-xs bg-muted/50 px-2 py-1 rounded">
                  {currentItem.generationParams?.seed || currentItem.seed}
                </p>
              </div>
            )}

            {currentItem.modelType && (
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">Model:</p>
                <p className="text-muted-foreground">{currentItem.modelType}</p>
              </div>
            )}

            {currentItem.generationParams?.timestamp && (
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">Generated:</p>
                <p className="text-muted-foreground text-xs">
                  {new Date(currentItem.generationParams.timestamp).toLocaleString()}
                </p>
              </div>
            )}

            {currentItem.generationParams?.originalAssetId && (
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">Reference Asset:</p>
                <p className="text-muted-foreground font-mono text-xs">
                  {currentItem.generationParams.originalAssetId}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 