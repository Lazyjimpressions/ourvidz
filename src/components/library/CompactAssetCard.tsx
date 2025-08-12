import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { PillButton } from '@/components/ui/pill-button';
import { Badge } from '@/components/ui/badge';
import { Download, Trash2, Eye, Play, Image, Video } from 'lucide-react';
import { UnifiedAsset } from '@/lib/services/OptimizedAssetService';

interface CompactAssetCardProps {
  asset: UnifiedAsset;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
  selectionMode: boolean;
}

export const CompactAssetCard = ({
  asset,
  isSelected,
  onSelect,
  onPreview,
  onDownload,
  onDelete,
  selectionMode
}: CompactAssetCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const getStatusColor = () => {
    switch (asset.status) {
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'processing':
      case 'queued':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-muted/50 text-muted-foreground border-muted';
    }
  };

  return (
    <div
      className="group relative bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ contentVisibility: 'auto' }}
    >
      {/* Selection Checkbox */}
      {(selectionMode || isHovered) && (
        <div className="absolute top-2 left-2 z-20">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            className="bg-background/80 border-border"
            aria-label={isSelected ? 'Deselect asset' : 'Select asset'}
          />
        </div>
      )}

      {/* Status Badge */}
      <div className="absolute top-2 right-2 z-20">
        <Badge
          variant="outline"
          className={`text-xs h-5 px-1.5 ${getStatusColor()}`}
        >
          {asset.status === 'processing' ? 'Processing' : 
           asset.status === 'queued' ? 'Queued' :
           asset.status === 'completed' ? 'Done' : 'Failed'}
        </Badge>
      </div>

      {/* Media Container */}
      <div 
        className="relative aspect-square bg-muted cursor-pointer overflow-hidden"
        onClick={onPreview}
        onTouchStart={(e) => {
          const target = e.currentTarget as HTMLElement & { __pressTimer?: number };
          target.__pressTimer = window.setTimeout(() => onSelect(!isSelected), 450);
        }}
        onTouchEnd={(e) => {
          const target = e.currentTarget as HTMLElement & { __pressTimer?: number };
          if (target.__pressTimer) {
            clearTimeout(target.__pressTimer);
            target.__pressTimer = undefined;
          }
        }}
      >
        {asset.url && asset.status === 'completed' && !imageError ? (
          <>
            {asset.type === 'video' ? (
              <div className="relative w-full h-full">
                {asset.thumbnailUrl ? (
                  <img
                    src={asset.thumbnailUrl}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    onError={handleImageError}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <video
                    src={asset.url}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    muted
                    preload="metadata"
                    onError={handleImageError}
                    playsInline
                    disablePictureInPicture
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="bg-background/80 rounded-full p-2 backdrop-blur-sm">
                    <Play className="h-4 w-4 fill-current" />
                  </div>
                </div>
              </div>
            ) : (
              <img
                src={asset.url}
                alt={asset.prompt}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                onError={handleImageError}
                loading="lazy"
                decoding="async"
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            {asset.type === 'image' ? (
              <Image className="h-8 w-8" />
            ) : (
              <Video className="h-8 w-8" />
            )}
          </div>
        )}

        {/* Actions (visible on mobile, hover on desktop) */}
        {asset.status === 'completed' && (
          <div className="absolute bottom-2 right-2 flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <PillButton
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              variant="secondary"
              size="xs"
              aria-label="Download asset"
            >
              <Download className="h-3 w-3" />
            </PillButton>
            <PillButton
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              variant="destructive"
              size="xs"
              aria-label="Delete asset"
            >
              <Trash2 className="h-3 w-3" />
            </PillButton>
          </div>
        )}
      </div>

      {/* Content Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs h-5">
            {asset.type}
          </Badge>
          {asset.quality && (
            <Badge 
              variant="outline" 
              className={`text-xs h-5 ${
                asset.quality === 'high' 
                  ? 'border-purple-500/20 text-purple-400' 
                  : 'border-blue-500/20 text-blue-400'
              }`}
            >
              {asset.quality === 'high' ? 'HQ' : 'Fast'}
            </Badge>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {asset.prompt.length > 80 ? `${asset.prompt.substring(0, 80)}...` : asset.prompt}
        </p>
      </div>
    </div>
  );
};