import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { RotateCcw, Play, Edit, Trash2, Download, Eye, X, Image as ImageIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ContentCardProps {
  item: {
    id: string;
    url: string;
    prompt: string;
    type: 'image' | 'video';
    modelType?: string;
    quality?: 'fast' | 'high';
    timestamp: Date;
    generationParams?: {
      seed?: number;
      originalAssetId?: string;
    };
    seed?: number;
    originalAssetId?: string;
  };
  // LTX-Style Actions
  onIterate?: () => void;
  onCreateVideo?: () => void;
  onDownload?: () => void;
  onExpand?: () => void;
  // Legacy Actions (for compatibility)
  onEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
  onDismiss?: () => void;
  onView: () => void;
  onUseAsReference?: () => void;
  onUseSeed?: () => void;
  isDeleting?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ContentCard: React.FC<ContentCardProps> = ({
  item,
  // LTX-Style Actions
  onIterate,
  onCreateVideo,
  onDownload,
  onExpand,
  // Legacy Actions
  onEdit,
  onSave,
  onDelete,
  onDismiss,
  onView,
  onUseAsReference,
  onUseSeed,
  isDeleting = false,
  className = "",
  size = 'md'
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  // NEW: Drag and drop functionality for workspace images
  const handleDragStart = (e: React.DragEvent) => {
    // Set drag data for the workspace item
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: item.id,
      url: item.url,
      type: item.type,
      prompt: item.prompt
    }));
    
    // Also set as text for URL-based drops
    e.dataTransfer.setData('text/plain', item.url);
    
    // Set drag image
    const dragImage = new Image();
    dragImage.src = item.url;
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    console.log('🖱️ DRAG START: Dragging workspace item:', item.id);
  };

  const getSeedFromItem = (): number | undefined => {
    return item.generationParams?.seed || item.seed;
  };

  const sizeClasses = {
    sm: 'w-32 h-32',
    md: 'w-48 h-48',
    lg: 'w-64 h-64'
  };

  // LTX-Style: Much smaller icons for subtle hover actions
  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-4 h-4' // Keep consistent size for larger cards
  };

  const buttonSize = {
    sm: 'w-6 h-6',
    md: 'w-7 h-7',
    lg: 'w-8 h-8'
  };

  return (
    <div
      className={`relative group bg-muted rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${sizeClasses[size]} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onExpand || onView}
      draggable={true} // Enable draggable attribute
      onDragStart={handleDragStart} // Handle drag start
    >
      {/* Media Content */}
      {item.type === 'video' ? (
        <video
          src={item.url}
          className="w-full h-full object-cover"
          muted
          loop
          onMouseEnter={(e) => e.currentTarget.play()}
          onMouseLeave={(e) => e.currentTarget.pause()}
        />
      ) : (
        <img
          src={item.url}
          alt={`Content ${item.id}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      )}

      {/* LTX-Style Hover Overlay - Subtle and Clean */}
      <div className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
        isHovered ? 'opacity-100' : 'opacity-0'
      }`}>
        
        {/* Top-Right Corner Actions - Small, Clean Icons */}
        <div className="absolute top-2 right-2 flex gap-1">
          {/* Dismiss Button (X) */}
          {onDismiss && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`${buttonSize[size]} bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm`}
                    onClick={(e) => handleActionClick(e, onDismiss)}
                  >
                    <X className={iconSize[size]} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Hide from workspace</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Delete Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`${buttonSize[size]} bg-red-500/80 hover:bg-red-600/90 text-white rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm`}
                  onClick={(e) => handleActionClick(e, onDelete)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <div className="animate-spin rounded-full border-b-2 border-white" style={{ width: iconSize[size], height: iconSize[size] }}></div>
                  ) : (
                    <Trash2 className={iconSize[size]} />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete permanently</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Bottom-Right Corner Actions - LTX-Style Small Icons */}
        <div className="absolute bottom-2 right-2 flex gap-1">
          {/* Iterate Button (Regen) - Creates 3 more images */}
          {onIterate && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`${buttonSize[size]} bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm`}
                    onClick={(e) => handleActionClick(e, onIterate)}
                  >
                    <RotateCcw className={iconSize[size]} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Regenerate 3 variations</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Create Video Button */}
          {onCreateVideo && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`${buttonSize[size]} bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm`}
                    onClick={(e) => handleActionClick(e, onCreateVideo)}
                  >
                    <Play className={iconSize[size]} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create video from image</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Download Button */}
          {onDownload && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`${buttonSize[size]} bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm`}
                    onClick={(e) => handleActionClick(e, onDownload)}
                  >
                    <Download className={iconSize[size]} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download image</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Bottom-Left Corner - Seed Info (Small, Subtle) */}
        {getSeedFromItem() && (
          <div className="absolute bottom-2 left-2">
            <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-mono text-white/80">
              Seed: {getSeedFromItem()}
            </div>
          </div>
        )}
      </div>

      {/* NO IMAGE/HIGH BADGES - Clean Design Like LTX */}
      {/* Removed all type and quality indicators for clean look */}

      {/* Prompt Display on Hover - Subtle */}
      {isHovered && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white p-2 text-xs">
          <div className="truncate" title={item.prompt}>
            {item.prompt}
          </div>
        </div>
      )}
    </div>
  );
}; 