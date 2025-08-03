import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Image, Play, Edit, Save, Trash2, Download, Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ContentCardProps {
  item: {
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
  };
  onEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
  onView: () => void;
  onDownload?: () => void;
  onUseAsReference?: () => void;
  onUseSeed?: () => void;
  isDeleting?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ContentCard: React.FC<ContentCardProps> = ({
  item,
  onEdit,
  onSave,
  onDelete,
  onView,
  onDownload,
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

  const getSeedFromItem = (): number | undefined => {
    return item.generationParams?.seed || item.seed;
  };

  const sizeClasses = {
    sm: 'w-32 h-32',
    md: 'w-48 h-48',
    lg: 'w-64 h-64'
  };

  const buttonSize = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div
      className={`relative group bg-muted rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${sizeClasses[size]} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onView}
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

      {/* Overlay with Actions */}
      <div className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
        isHovered ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="absolute inset-0 flex flex-col justify-between p-3">
          {/* Top Actions */}
          <div className="flex justify-between items-start">
            <div className="flex gap-1">
              {item.type === 'image' && onUseAsReference && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="secondary"
                        className={`${buttonSize[size]} p-0 bg-background/80 hover:bg-background`}
                        onClick={(e) => handleActionClick(e, onUseAsReference)}
                      >
                        <Image className={iconSize[size]} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Use as reference</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {getSeedFromItem() && onUseSeed && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="secondary"
                        className={`${buttonSize[size]} p-0 bg-background/80 hover:bg-background`}
                        onClick={(e) => handleActionClick(e, onUseSeed)}
                      >
                        <span className="text-xs font-mono">🎲</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Use seed {getSeedFromItem()}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Delete Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="destructive"
                    className={`${buttonSize[size]} p-0 bg-destructive/80 hover:bg-destructive`}
                    onClick={(e) => handleActionClick(e, onDelete)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <div className="animate-spin rounded-full border-b-2 border-white" style={{ width: iconSize[size], height: iconSize[size] }}></div>
                    ) : (
                      <Trash2 className={iconSize[size]} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Remove from workspace</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Bottom Actions */}
          <div className="flex justify-between items-end">
            {/* Seed Display */}
            {getSeedFromItem() && (
              <div className="bg-background/80 px-2 py-1 rounded text-xs font-mono">
                Seed: {getSeedFromItem()}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      className={`${buttonSize[size]} p-0 bg-background/80 hover:bg-background`}
                      onClick={(e) => handleActionClick(e, onEdit)}
                    >
                      <Edit className={iconSize[size]} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit prompt</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      className={`${buttonSize[size]} p-0 bg-background/80 hover:bg-background`}
                      onClick={(e) => handleActionClick(e, onSave)}
                    >
                      <Save className={iconSize[size]} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Save to library</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {onDownload && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="secondary"
                        className={`${buttonSize[size]} p-0 bg-background/80 hover:bg-background`}
                        onClick={(e) => handleActionClick(e, onDownload)}
                      >
                        <Download className={iconSize[size]} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Download</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Type Indicator */}
      <div className="absolute top-2 left-2">
        <div className={`px-2 py-1 rounded text-xs font-medium ${
          item.type === 'video' 
            ? 'bg-blue-500/80 text-white' 
            : 'bg-green-500/80 text-white'
        }`}>
          {item.type === 'video' ? (
            <div className="flex items-center gap-1">
              <Play className="w-3 h-3" />
              VIDEO
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Image className="w-3 h-3" />
              IMAGE
            </div>
          )}
        </div>
      </div>

      {/* Quality Indicator */}
      {item.quality && (
        <div className="absolute top-2 right-2">
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            item.quality === 'high' 
              ? 'bg-purple-500/80 text-white' 
              : 'bg-orange-500/80 text-white'
          }`}>
            {item.quality === 'high' ? 'HIGH' : 'FAST'}
          </div>
        </div>
      )}

      {/* Prompt Tooltip on Hover */}
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