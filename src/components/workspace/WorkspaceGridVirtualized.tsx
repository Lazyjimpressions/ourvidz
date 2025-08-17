import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Download, 
  Trash2, 
  Eye, 
  Image, 
  Video, 
  Play,
  Clock,
  Calendar,
  Copy,
  Plus
} from "lucide-react";
import { SimpleLightbox } from "@/components/workspace/SimpleLightbox";
// SDXL Image Selector removed - functionality simplified
import { UnifiedAsset } from '@/lib/services/OptimizedAssetService';
import { useRealtimeWorkspace } from '@/hooks/useRealtimeWorkspace';
import { MediaTile } from '@/types/workspace';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Export types
export interface WorkspaceGridVirtualizedProps {
  onRegenerateItem?: (itemId: string) => void;
  onGenerateMoreLike?: (tile: MediaTile) => void;
  onClearWorkspace?: boolean;
  onImport?: (importHandler: (assets: UnifiedAsset[]) => void) => void;
}

const TileLoadingSkeleton = () => (
  <div className="aspect-square bg-gray-900 rounded-lg animate-pulse">
    <div className="w-full h-full bg-gray-800 rounded-lg" />
  </div>
);

const MediaTileComponent = React.memo(({ 
  tile, 
  onPreview, 
  onDownload, 
  onGenerateMoreLike, 
  onDelete, 
  onSDXLManage,
  isDeleting,
  isLoadingUrl,
  registerElement 
}: {
  tile: MediaTile;
  onPreview: () => void;
  onDownload: (e: React.MouseEvent) => void;
  onGenerateMoreLike?: (tile: MediaTile) => void;
  onDelete: () => void;
  onSDXLManage?: () => void;
  isDeleting: boolean;
  isLoadingUrl: boolean;
  registerElement: (element: HTMLElement | null) => void;
}) => {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div
      ref={registerElement}
      data-index={tile.virtualIndex}
      className={cn(
        "group relative cursor-pointer bg-gray-900 rounded-lg overflow-hidden aspect-square transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
        isDeleting && "opacity-50 pointer-events-none"
      )}
      onClick={onPreview}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Media Content */}
      {isLoadingUrl || !tile.url ? (
        <TileLoadingSkeleton />
      ) : tile.type === 'image' ? (
        <img
          src={tile.url}
          alt="Generated content"
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="relative w-full h-full">
          {tile.thumbnailUrl ? (
            <img
              src={tile.thumbnailUrl}
              alt="Video thumbnail"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <video
              src={tile.url}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="bg-black/70 rounded-full p-3">
              <Play className="w-6 h-6 text-white fill-white" />
            </div>
          </div>
        </div>
      )}
      
      {/* Content Type Icon */}
      <div className="absolute top-2 left-2">
        <Badge variant="secondary" className="bg-black/70 text-white border-gray-600 text-xs">
          {tile.type === 'image' ? (
            <Image className="h-3 w-3 mr-1" />
          ) : (
            <Video className="h-3 w-3 mr-1" />
          )}
          {tile.type}
        </Badge>
      </div>

      {/* Model Type Badge (for images) */}
      {tile.type === 'image' && tile.modelType && (
        <div className="absolute top-2 right-2">
          <Badge 
            variant="secondary" 
            className={cn(
              "text-xs border",
              tile.modelType === 'SDXL'
                ? "bg-purple-500/20 text-purple-300 border-purple-500/40" 
                : "bg-blue-500/20 text-blue-300 border-blue-500/40"
            )}
          >
            {tile.modelType}
            {tile.isPartOfSet && ` (${tile.selectedImageIndices?.length || tile.setSize}/${tile.setSize})`}
          </Badge>
        </div>
      )}

      {/* Duration for videos */}
      {tile.type === 'video' && tile.duration && (
        <div className="absolute bottom-2 right-2">
          <Badge variant="secondary" className="bg-black/70 text-white text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {tile.duration}s
          </Badge>
        </div>
      )}

      {/* Hover Actions */}
      {(isHovered) && tile.url && (
        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="h-6 w-6 p-0 bg-gray-700/80 hover:bg-gray-600 backdrop-blur-sm"
          >
            <Eye className="h-3 w-3" />
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={onDownload}
            className="h-6 w-6 p-0 bg-gray-700/80 hover:bg-gray-600 backdrop-blur-sm"
          >
            <Download className="h-3 w-3" />
          </Button>
          
          {tile.type === 'image' && onGenerateMoreLike && (
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onGenerateMoreLike(tile);
              }}
              className="h-6 w-6 p-0 bg-blue-600/80 hover:bg-blue-700 backdrop-blur-sm"
              title="Generate 3 more like this"
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
          
          {/* SDXL Image Management Button */}
          {tile.isPartOfSet && onSDXLManage && (
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSDXLManage();
              }}
              className="h-6 w-6 p-0 bg-purple-600/80 hover:bg-purple-700 backdrop-blur-sm"
              title="Manage SDXL images"
            >
              <Image className="h-3 w-3" />
            </Button>
          )}
          
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-6 w-6 p-0 bg-red-600/80 hover:bg-red-700 backdrop-blur-sm"
            disabled={isDeleting}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Tile Info Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs px-1 py-0.5 bg-black/50 border-white/20 text-white">
              {tile.quality === 'high' ? 'HD' : 'Fast'}
            </Badge>
          </div>
          <div className="flex items-center text-xs text-gray-300">
            <Calendar className="h-3 w-3 mr-1" />
            {formatDate(tile.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
});

MediaTileComponent.displayName = 'MediaTileComponent';

export const WorkspaceGridVirtualized = ({ 
  onRegenerateItem, 
  onGenerateMoreLike, 
  onClearWorkspace, 
  onImport 
}: WorkspaceGridVirtualizedProps) => {
  const [selectedTile, setSelectedTile] = useState<MediaTile | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [showSDXLSelector, setShowSDXLSelector] = useState(false);
  const [currentSDXLTile, setCurrentSDXLTile] = useState<MediaTile | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use current realtime workspace hook
  const { 
    tiles,
    isLoading, 
    deletingTiles, 
    addToWorkspace, 
    clearWorkspace, 
    deleteTile
  } = useRealtimeWorkspace();

  // For compatibility with existing VirtualizedMediaGrid features
  const visibleTiles = tiles; // Show all tiles for now
  const totalCount = tiles.length;
  const loadingUrls = new Set<string>(); // Simplified for now

  const handleDownload = async (tile: MediaTile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tile.url) {
      toast.error('Image not ready for download');
      return;
    }
    
    try {
      const response = await fetch(tile.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-${tile.type}-${tile.id}.${tile.type === 'image' ? 'png' : 'mp4'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download started');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed');
    }
  };

  // Handle workspace clearing from parent
  useEffect(() => {
    if (onClearWorkspace) {
      clearWorkspace();
    }
  }, [onClearWorkspace, clearWorkspace]);

  // Register import handler with parent component
  const importToWorkspace = useCallback((assets: UnifiedAsset[]) => {
    const assetIds = assets.map(asset => asset.id);
    addToWorkspace(assetIds);
  }, [addToWorkspace]);

  useEffect(() => {
    if (onImport) {
      onImport(importToWorkspace);
    }
  }, [onImport, importToWorkspace]);

  // Handle SDXL image management
  const handleSDXLManage = (tile: MediaTile) => {
    setCurrentSDXLTile(tile);
    setShowSDXLSelector(true);
  };

  const handleSDXLSelectionUpdate = (selectedIndices: number[]) => {
    if (currentSDXLTile) {
      // TODO: Implement SDXL selection update in realtime workspace
      console.log('SDXL selection update:', selectedIndices);
    }
  };

  const handleSDXLIndividualDelete = (imageIndices: number[]) => {
    if (currentSDXLTile) {
      // TODO: Implement SDXL individual delete in realtime workspace
      console.log('SDXL individual delete:', imageIndices);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin text-2xl mb-2">⚡</div>
          <p className="text-gray-400">Loading optimized workspace...</p>
        </div>
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-400 mb-2">
            Your workspace is empty
          </h3>
          <p className="text-gray-600 mb-4">
            Generate new content or import from your library
          </p>
          <Button
            variant="outline"
            onClick={() => setShowLibraryModal(true)}
            className="gap-2 border-gray-700 hover:bg-gray-800"
          >
            <Plus className="w-4 h-4" />
            Import from Library
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Performance Stats and Session Info */}
      <div className="px-6 py-2 text-xs text-gray-500 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>⚡ Optimized: {totalCount} total, {visibleTiles.length} visible</span>
            {/* Session info temporarily disabled until implemented in realtime workspace */}
          </div>
          {loadingUrls.size > 0 && (
            <span className="animate-pulse">Loading {loadingUrls.size} images...</span>
          )}
        </div>
      </div>

      {/* Virtualized Grid Container */}
      <div 
        ref={containerRef}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6"
      >
        {visibleTiles.map((tile) => (
          <MediaTileComponent
            key={tile.id}
            tile={tile}
            onPreview={() => {
              const index = tiles.findIndex(t => t.id === tile.id);
              setSelectedIndex(index);
              setSelectedTile(tile);
            }}
            onDownload={(e) => handleDownload(tile, e)}
            onGenerateMoreLike={onGenerateMoreLike}
            onDelete={() => deleteTile(tile)}
            onSDXLManage={tile.isPartOfSet ? () => handleSDXLManage(tile) : undefined}
            isDeleting={deletingTiles.has(tile.id)}
            isLoadingUrl={loadingUrls.has(tile.originalAssetId)}
            registerElement={() => {}} // Simplified for now
          />
        ))}
      </div>

      {/* Simple Lightbox */}
      {selectedTile && selectedTile.url && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <button
            onClick={() => setSelectedTile(null)}
            className="absolute top-4 right-4 text-white text-2xl"
          >
            ×
          </button>
          {selectedTile.type === 'image' ? (
            <img
              src={selectedTile.url}
              alt={selectedTile.prompt}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <video
              src={selectedTile.url}
              controls
              className="max-w-full max-h-full"
            />
          )}
          <div className="absolute bottom-4 left-4 text-white">
            <p className="text-sm">{selectedTile.prompt}</p>
          </div>
        </div>
      )}

      {/* Import from Library Button */}
      {showLibraryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-white text-lg mb-4">Import from Library</h3>
            <p className="text-gray-400 mb-4">This feature will be implemented soon</p>
            <button
              onClick={() => setShowLibraryModal(false)}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* SDXL Image Selector temporarily disabled */}
      {showSDXLSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-white text-lg mb-4">SDXL Image Management</h3>
            <p className="text-gray-400 mb-4">This feature will be implemented soon</p>
            <button
              onClick={() => {
                setShowSDXLSelector(false);
                setCurrentSDXLTile(null);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};