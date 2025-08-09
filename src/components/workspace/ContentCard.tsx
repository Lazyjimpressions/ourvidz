import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { RotateCcw, Play, Edit, Trash2, Download, Eye, X, Image as ImageIcon, Video as VideoIcon, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UnifiedAsset } from '@/lib/services/AssetService';

interface ContentCardProps {
  item: UnifiedAsset;
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
  // NEW: Separate iterate and regenerate actions
  onIterateFromItem?: () => void;
  onRegenerateJob?: () => void;
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
  // NEW: Separate iterate and regenerate actions
  onIterateFromItem,
  onRegenerateJob,
  isDeleting = false,
  className = "",
  size = 'md'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

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

  // Video-specific handlers
  const handleVideoMouseEnter = async (e: React.MouseEvent<HTMLVideoElement>) => {
    if (item.type === 'video') {
      try {
        await e.currentTarget.play();
        setIsVideoPlaying(true);
      } catch (error) {
        console.log('Video play failed:', error);
        // Fallback: show play overlay
        setIsVideoPlaying(false);
      }
    }
  };

  const handleVideoMouseLeave = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (item.type === 'video') {
      e.currentTarget.pause();
      e.currentTarget.currentTime = 0;
      setIsVideoPlaying(false);
    }
  };

  const handleVideoLoad = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    // Video loaded successfully
    console.log('Video loaded:', item.url);
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error('Video failed to load:', item.url);
    // Fallback to poster image or show error state
  };

  const getSeedFromItem = (): number | undefined => {
    return item.metadata?.seed || item.metadata?.generationParams?.seed;
  };

  const getVideoDuration = (): number | undefined => {
    return item.duration || item.metadata?.duration || item.metadata?.generationParams?.duration;
  };

  const formatDuration = (seconds: number): string => {
    return `${seconds}s`;
  };

  // Get video poster/thumbnail
  const getVideoPoster = (): string | undefined => {
    // Prefer explicit thumbnail; fallback to proper placeholder for videos
    return item.thumbnailUrl || '/video-thumbnail-placeholder.svg';
  };
  const sizeClasses = {
    sm: 'w-32 h-32',
    md: 'w-full aspect-square', // Ensure consistent aspect ratio for grid layout
    lg: 'w-full aspect-square'  // Videos and images both use square aspect ratio
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
        <div className="relative w-full h-full">
          {/* Video Element */}
          <video
            src={item.url}
            className="w-full h-full object-cover"
            muted
            loop
            preload="metadata"
            playsInline
            onMouseEnter={handleVideoMouseEnter}
            onMouseLeave={handleVideoMouseLeave}
            onLoadedData={handleVideoLoad}
            onError={handleVideoError}
            poster={getVideoPoster()}
          />
          
          {/* Video Play Overlay - Shows when not playing */}
          {!isVideoPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="bg-black/60 rounded-full p-2">
                <Play className="w-6 h-6 text-white" fill="white" />
              </div>
            </div>
          )}
          
          {/* Video Duration Badge - Top Right */}
          {getVideoDuration() && (
            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(getVideoDuration()!)}
            </div>
          )}
          
          {/* Video aspect ratio matches grid layout */}
          
        </div>
      ) : (
        <div className="relative w-full h-full">
          {item.url ? (
            <img
              src={item.url}
              alt={`Content ${item.id}`}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                console.error('Image failed to load:', item.url);
                const target = e.currentTarget;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          
          {/* Loading/Error Fallback */}
          <div 
            className={`absolute inset-0 bg-muted animate-pulse flex items-center justify-center ${item.url ? 'hidden' : 'flex'}`}
            style={{ display: item.url ? 'none' : 'flex' }}
          >
            <div className="w-8 h-8 rounded bg-muted-foreground/20"></div>
          </div>
          
        </div>
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
          {/* NEW: Use as Reference Button (Edit icon) - Only for images */}
          {onIterateFromItem && item.type === 'image' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`${buttonSize[size]} bg-blue-600/80 hover:bg-blue-700/90 text-white rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm`}
                    onClick={(e) => handleActionClick(e, onIterateFromItem)}
                  >
                    <Edit className={iconSize[size]} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Use as reference for new generation</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* NEW: Regenerate Job Button (RotateCcw icon) - Only for images */}
          {onRegenerateJob && item.type === 'image' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`${buttonSize[size]} bg-purple-600/80 hover:bg-purple-700/90 text-white rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm`}
                    onClick={(e) => handleActionClick(e, onRegenerateJob)}
                  >
                    <RotateCcw className={iconSize[size]} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Generate 3 more like this</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Create Video Button - Only for images */}
          {onCreateVideo && item.type === 'image' && (
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
                  <p>Download {item.type}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* REMOVED: Bottom-Left Corner - Seed Info (was covering action icons) */}
        {/* REMOVED: Prompt Display on Hover (was covering action icons) */}
      </div>

      {/* NO IMAGE/HIGH BADGES - Clean Design Like LTX */}
      {/* Removed all type and quality indicators for clean look */}

      {/* REMOVED: Prompt Display on Hover - No longer needed */}
    </div>
  );
}; 