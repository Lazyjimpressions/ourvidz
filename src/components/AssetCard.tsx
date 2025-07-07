
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Image, 
  Video, 
  Download, 
  Trash2, 
  Eye, 
  Clock,
  Calendar
} from "lucide-react";
import { UnifiedAsset } from "@/lib/services/OptimizedAssetService";
import { cn } from "@/lib/utils";

interface AssetCardProps {
  asset: UnifiedAsset;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onPreview: () => void;
  onDelete: () => void;
  onDownload: () => void;
  selectionMode: boolean;
  isDeleting?: boolean;
  isLoadingUrl?: boolean;
}

export const AssetCard = ({ 
  asset, 
  isSelected, 
  onSelect, 
  onPreview, 
  onDelete, 
  onDownload, 
  selectionMode,
  isDeleting = false,
  isLoadingUrl = false
}: AssetCardProps) => {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'processing': case 'queued': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'failed': case 'error': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getQualityColor = (quality?: string) => {
    return quality === 'high' 
      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      : 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div 
      className={cn(
        "group relative bg-gray-900 rounded-lg overflow-hidden border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
        isSelected 
          ? "border-blue-500 ring-2 ring-blue-500/50 shadow-lg" 
          : "border-gray-700 hover:border-gray-600",
        isDeleting && "opacity-50 pointer-events-none"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Selection Checkbox */}
      {selectionMode && (
        <div className="absolute top-2 left-2 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
          />
        </div>
      )}

      {/* Media Container */}
      <div 
        className="aspect-square cursor-pointer relative overflow-hidden bg-gray-800"
        onClick={onPreview}
      >
        {/* Loading State */}
        {isLoadingUrl ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <div className="text-center text-gray-400 p-4">
              <div className="animate-pulse text-2xl mb-2">⚡</div>
              <div className="text-xs">Loading preview...</div>
            </div>
          </div>
        ) : asset.status === 'completed' && (asset.thumbnailUrl || asset.url) && !imageError ? (
          <img
            src={asset.thumbnailUrl || asset.url}
            alt={asset.prompt}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            {asset.error ? (
              <div className="text-center text-red-400 p-4">
                <div className="text-2xl mb-2">⚠️</div>
                <div className="text-xs">Failed to load</div>
                {asset.error && (
                  <div className="text-xs mt-1 opacity-75 max-w-[120px] break-words">{truncateText(asset.error, 50)}</div>
                )}
              </div>
            ) : asset.status === 'processing' || asset.status === 'queued' ? (
              <div className="text-center text-gray-400 p-4">
                <div className="animate-spin text-2xl mb-2">⏳</div>
                <div className="text-xs capitalize">{asset.status}</div>
              </div>
            ) : (
              <div className="text-center text-gray-500 p-4">
                {asset.type === 'image' ? (
                  <Image className="h-8 w-8 mx-auto mb-2" />
                ) : (
                  <Video className="h-8 w-8 mx-auto mb-2" />
                )}
                <div className="text-xs">
                  {asset.status === 'completed' ? 'No preview available' : 'Preview not ready'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Type and Model Indicators */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <Badge 
            variant="secondary" 
            className="bg-black/50 text-white border-gray-600 text-xs"
          >
            {asset.type === 'image' ? (
              <Image className="h-3 w-3 mr-1" />
            ) : (
              <Video className="h-3 w-3 mr-1" />
            )}
            {asset.type}
          </Badge>
          
          {/* Model Type Badge for Images */}
          {asset.type === 'image' && asset.modelType && (
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs border",
                asset.modelType === 'SDXL' 
                  ? "bg-purple-500/20 text-purple-300 border-purple-500/40" 
                  : asset.modelType === 'Enhanced-7B'
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-blue-500/20 text-blue-300 border-blue-500/40"
              )}
            >
              {asset.modelType}
            </Badge>
          )}
        </div>

        {/* Duration for videos */}
        {asset.type === 'video' && asset.duration && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="bg-black/50 text-white text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {asset.duration}s
            </Badge>
          </div>
        )}

        {/* Hover Actions */}
        {(isHovered || selectionMode) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 transition-opacity duration-200">
            {asset.status === 'completed' && !asset.error && (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview();
                }}
                className="h-8 w-8 p-0 bg-gray-700 hover:bg-gray-600"
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
            {asset.status === 'completed' && !asset.error && (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload();
                }}
                className="h-8 w-8 p-0 bg-gray-700 hover:bg-gray-600"
              >
                <Download className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="h-8 w-8 p-0 bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Asset Info */}
      <div className="p-3 space-y-2">
        {/* Prompt/Title */}
        <h3 
          className="text-sm font-medium text-white line-clamp-2 leading-tight" 
          title={asset.title || asset.prompt}
        >
          {truncateText(asset.title || asset.prompt, 60)}
        </h3>

        {/* Project Title */}
        {asset.projectTitle && (
          <p className="text-xs text-gray-400 truncate">
            Project: {asset.projectTitle}
          </p>
        )}

        {/* Status and Quality Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant="outline" 
              className={cn("text-xs px-2 py-0.5", getStatusColor(asset.status))}
            >
              {asset.status}
            </Badge>
            
            {asset.quality && (
              <Badge 
                variant="outline" 
                className={cn("text-xs px-2 py-0.5", getQualityColor(asset.quality))}
              >
                {asset.quality === 'high' ? 'HD' : 'Fast'}
              </Badge>
            )}
          </div>

          <div className="flex items-center text-xs text-gray-400">
            <Calendar className="h-3 w-3 mr-1" />
            {formatDate(asset.createdAt)}
          </div>
        </div>

        {/* Format and Resolution */}
        {(asset.format || asset.resolution) && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {asset.format && <span>{asset.format.toUpperCase()}</span>}
            {asset.resolution && <span>{asset.resolution}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced video card display with proper thumbnails
export default AssetCard;
