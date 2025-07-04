import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { WorkspaceContentModal } from "@/components/WorkspaceContentModal";
import { LibraryImportModal } from "@/components/LibraryImportModal";
import { AssetService, UnifiedAsset } from '@/lib/services/AssetService';
import { useAssets, useInvalidateAssets } from '@/hooks/useAssets';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MediaTile {
  id: string;
  originalAssetId: string; // For deletion
  type: 'image' | 'video';
  url: string;
  prompt: string;
  timestamp: Date;
  quality: 'fast' | 'high';
  modelType?: string;
  duration?: number;
  thumbnailUrl?: string;
}

interface MediaGridProps {
  onRegenerateItem?: (itemId: string) => void;
  onGenerateMoreLike?: (tile: MediaTile) => void;
  onClearWorkspace?: (clearHandler: () => void) => void;
  onImport?: (importHandler: (assets: UnifiedAsset[]) => void) => void;
}

export const MediaGrid = ({ onRegenerateItem, onGenerateMoreLike, onClearWorkspace, onImport }: MediaGridProps) => {
  const [tiles, setTiles] = useState<MediaTile[]>([]);
  const [selectedTile, setSelectedTile] = useState<MediaTile | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [deletingTiles, setDeletingTiles] = useState<Set<string>>(new Set());
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [workspaceCleared, setWorkspaceCleared] = useState(false);
  const [clearTimestamp, setClearTimestamp] = useState<number | null>(null);
  
  // Use React Query for session-based asset fetching
  const { data: assets = [], isLoading, error } = useAssets(true);
  const invalidateAssets = useInvalidateAssets();

  // Initialize workspace cleared state from sessionStorage
  useEffect(() => {
    const cleared = sessionStorage.getItem('workspaceCleared') === 'true';
    const timestamp = sessionStorage.getItem('workspaceClearTimestamp');
    if (cleared && timestamp) {
      const clearTime = parseInt(timestamp);
      // Only maintain cleared state if assets are actually empty or all older than clear time
      const hasNewerAssets = assets.some(asset => 
        asset.status === 'completed' && 
        (asset.url || (asset.signedUrls && asset.signedUrls.length > 0)) &&
        asset.createdAt.getTime() > clearTime
      );
      
      if (!hasNewerAssets) {
        console.log('🧹 Workspace was previously cleared, maintaining empty state');
        setWorkspaceCleared(true);
        setClearTimestamp(clearTime);
      } else {
        console.log('🔄 Found newer assets, clearing workspace cleared state');
        sessionStorage.removeItem('workspaceCleared');
        sessionStorage.removeItem('workspaceClearTimestamp');
      }
    }
  }, [assets]);

  // Process assets into tiles whenever assets change
  useEffect(() => {
    console.log('🎯 Processing assets into tiles for unified workspace...');
    console.log('📊 Total assets received:', assets.length);
    
    // If workspace is cleared, only show assets newer than clear timestamp
    let filteredAssets = assets.filter(asset => 
      asset.status === 'completed' && (asset.url || (asset.signedUrls && asset.signedUrls.length > 0))
    );
    console.log('✅ Assets after filtering:', filteredAssets.length);
    
    if (workspaceCleared && clearTimestamp) {
      console.log('🧹 Filtering assets by clear timestamp:', new Date(clearTimestamp));
      filteredAssets = filteredAssets.filter(asset => 
        asset.createdAt.getTime() > clearTimestamp
      );
    }
    
    // Use shared transform function for consistency
    const processedTiles: MediaTile[] = [];
    for (const asset of filteredAssets) {
      processedTiles.push(...transformAssetToTile(asset));
    }

    // Sort by timestamp (newest first)
    processedTiles.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    console.log('✅ Processed tiles:', {
      total: processedTiles.length,
      images: processedTiles.filter(t => t.type === 'image').length,
      videos: processedTiles.filter(t => t.type === 'video').length
    });
    
    setTiles(processedTiles);
    
    // Reset workspace cleared state when genuinely new content arrives
    if (processedTiles.length > 0 && workspaceCleared && clearTimestamp) {
      const hasNewContent = processedTiles.some(tile => 
        tile.timestamp.getTime() > clearTimestamp
      );
      if (hasNewContent) {
        console.log('🔄 New content detected, resetting workspace cleared state');
        setWorkspaceCleared(false);
        setClearTimestamp(null);
        sessionStorage.removeItem('workspaceCleared');
        sessionStorage.removeItem('workspaceClearTimestamp');
      }
    }
  }, [assets, workspaceCleared, clearTimestamp]);

  // Show error state if assets failed to load
  useEffect(() => {
    if (error) {
      console.error('❌ Failed to load assets:', error);
      toast.error('Failed to load media');
    }
  }, [error]);

  const handleDelete = async (tile: MediaTile, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (deletingTiles.has(tile.id)) return;
    
    try {
      setDeletingTiles(prev => new Set([...prev, tile.id]));
      
      await AssetService.deleteAsset(tile.originalAssetId, tile.type);
      
      // Remove all tiles that share the same originalAssetId (for 6-image generations)
      setTiles(prevTiles => 
        prevTiles.filter(t => t.originalAssetId !== tile.originalAssetId)
      );
      
      // Invalidate React Query cache to ensure fresh data
      invalidateAssets();
      
      toast.success(`${tile.type === 'image' ? 'Image' : 'Video'} deleted successfully`);
    } catch (error) {
      console.error('❌ Delete failed:', error);
      toast.error('Failed to delete item');
    } finally {
      setDeletingTiles(prev => {
        const next = new Set(prev);
        next.delete(tile.id);
        return next;
      });
    }
  };

  const handleDownload = async (tile: MediaTile, e: React.MouseEvent) => {
    e.stopPropagation();
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

  // Helper function to transform assets to tiles
  const transformAssetToTile = (asset: UnifiedAsset): MediaTile[] => {
    const tiles: MediaTile[] = [];
    
    if (asset.type === 'image') {
      // Handle 6-image generations
      if (asset.signedUrls && asset.signedUrls.length > 0) {
        asset.signedUrls.forEach((url: string, index: number) => {
          tiles.push({
            id: `${asset.id}-${index}`,
            originalAssetId: asset.id,
            type: 'image',
            url: url,
            prompt: asset.prompt,
            timestamp: asset.createdAt,
            quality: (asset.quality as 'fast' | 'high') || 'fast',
            modelType: asset.modelType
          });
        });
      } else {
        tiles.push({
          id: asset.id,
          originalAssetId: asset.id,
          type: 'image',
          url: asset.url!,
          prompt: asset.prompt,
          timestamp: asset.createdAt,
          quality: (asset.quality as 'fast' | 'high') || 'fast',
          modelType: asset.modelType
        });
      }
    } else if (asset.type === 'video') {
      tiles.push({
        id: asset.id,
        originalAssetId: asset.id,
        type: 'video',
        url: asset.url!,
        prompt: asset.prompt,
        timestamp: asset.createdAt,
        quality: (asset.quality as 'fast' | 'high') || 'fast',
        duration: asset.duration,
        thumbnailUrl: asset.thumbnailUrl
      });
    }
    
    return tiles;
  };

  const handleImportFromLibrary = useCallback((importedAssets: UnifiedAsset[]) => {
    console.log('📥 MediaGrid received import request:', {
      count: importedAssets?.length || 0,
      assetIds: importedAssets?.map(a => a.id) || [],
      assetTypes: importedAssets?.map(a => a.type) || []
    });
    
    if (!importedAssets || importedAssets.length === 0) {
      console.log('📥 No assets to import');
      return;
    }
    
    console.log('📥 Importing assets to workspace:', importedAssets.length);
    
    // Convert imported assets to tiles using shared transform function
    const importedTiles: MediaTile[] = [];
    for (const asset of importedAssets) {
      importedTiles.push(...transformAssetToTile(asset));
    }
    
    // Add imported tiles to current tiles (at the beginning to show as recent)
    setTiles(prevTiles => {
      const combined = [...importedTiles, ...prevTiles];
      // Sort by timestamp to maintain order
      return combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    });
    
    // CRITICAL FIX: Reset workspace cleared state when importing
    if (workspaceCleared) {
      console.log('🔄 Resetting workspace cleared state after import');
      setWorkspaceCleared(false);
      setClearTimestamp(null);
      sessionStorage.removeItem('workspaceCleared');
      sessionStorage.removeItem('workspaceClearTimestamp');
    }
    
    toast.success(`Imported ${importedAssets.length} asset${importedAssets.length !== 1 ? 's' : ''} to workspace`);
  }, [workspaceCleared]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  // Handle workspace clearing
  const handleClearWorkspace = () => {
    console.log('🧹 Clearing workspace');
    const timestamp = Date.now();
    setWorkspaceCleared(true);
    setClearTimestamp(timestamp);
    sessionStorage.setItem('workspaceCleared', 'true');
    sessionStorage.setItem('workspaceClearTimestamp', timestamp.toString());
    toast.success('Workspace cleared');
  };

  // Register clear handler with parent component
  useEffect(() => {
    if (onClearWorkspace) {
      onClearWorkspace(handleClearWorkspace);
    }
  }, [onClearWorkspace]);

  // Register import handler with parent component
  useEffect(() => {
    if (onImport) {
      onImport(handleImportFromLibrary);
      console.log('✅ Import handler registered with parent');
    }
  }, [onImport, handleImportFromLibrary]);

  if (isLoading && tiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin text-2xl mb-2">⏳</div>
          <p className="text-gray-400">Loading your media...</p>
          <p className="text-gray-500 text-sm mt-2">This should only take a few seconds</p>
        </div>
      </div>
    );
  }

  // Show loading overlay for new content being processed
  if (isLoading && tiles.length > 0) {
    return (
      <div className="relative">
        {/* Existing content with loading overlay */}
        <div className="opacity-70">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {tiles.map((tile) => (
              <div key={tile.id} className="group relative cursor-pointer bg-gray-900 rounded-lg overflow-hidden aspect-square">
                {tile.type === 'image' ? (
                  <img src={tile.url} alt="Generated content" className="w-full h-full object-cover" />
                ) : (
                  <div className="relative w-full h-full">
                    <video src={tile.url} className="w-full h-full object-cover" muted preload="metadata" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Loading overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-gray-900/90 rounded-lg p-4 text-center">
            <div className="animate-spin text-xl mb-2">⏳</div>
            <p className="text-white text-sm">Processing new content...</p>
          </div>
        </div>
      </div>
    );
  }

  if (tiles.length === 0 || workspaceCleared) {
    const isCleared = workspaceCleared;
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-400 mb-2">
            {isCleared ? 'Workspace cleared' : 'Your workspace is empty'}
          </h3>
          <p className="text-gray-600 mb-4">
            {isCleared ? 'Generate new content to populate your workspace' : 'Generate new content or import from your library'}
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
      {/* Dynamic Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
        {tiles.map((tile) => (
          <div
            key={tile.id}
            className={cn(
              "group relative cursor-pointer bg-gray-900 rounded-lg overflow-hidden aspect-square transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
              deletingTiles.has(tile.id) && "opacity-50 pointer-events-none"
            )}
            onClick={() => {
              const index = tiles.findIndex(t => t.id === tile.id);
              setSelectedIndex(index);
              setSelectedTile(tile);
            }}
          >
            {/* Media Content */}
            {tile.type === 'image' ? (
              <img
                src={tile.url}
                alt="Generated content"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  console.error('❌ Image failed to load:', tile.url);
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="relative w-full h-full">
                {tile.thumbnailUrl ? (
                  <img
                    src={tile.thumbnailUrl}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={tile.url}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                )}
                {/* Play button overlay for videos */}
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

            {/* Hover Actions - positioned in upper right corner */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  const index = tiles.findIndex(t => t.id === tile.id);
                  setSelectedIndex(index);
                  setSelectedTile(tile);
                }}
                className="h-6 w-6 p-0 bg-gray-700/80 hover:bg-gray-600 backdrop-blur-sm"
              >
                <Eye className="h-3 w-3" />
              </Button>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => handleDownload(tile, e)}
                className="h-6 w-6 p-0 bg-gray-700/80 hover:bg-gray-600 backdrop-blur-sm"
              >
                <Download className="h-3 w-3" />
              </Button>
              
              {/* More Like This Button - Only for images */}
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
              
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => handleDelete(tile, e)}
                className="h-6 w-6 p-0 bg-red-600/80 hover:bg-red-700 backdrop-blur-sm"
                disabled={deletingTiles.has(tile.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            {/* Hover overlay for videos only - excludes the action buttons area */}
            {tile.type === 'video' && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 opacity-0 group-hover:opacity-100 pointer-events-none" />
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
        ))}
      </div>

      {/* Modal for Full Resolution */}
      {selectedTile && (
        <WorkspaceContentModal
          tiles={tiles}
          currentIndex={selectedIndex}
          onClose={() => setSelectedTile(null)}
          onIndexChange={(newIndex) => {
            setSelectedIndex(newIndex);
            setSelectedTile(tiles[newIndex]);
          }}
        />
      )}

      {/* Library Import Modal */}
      <LibraryImportModal
        open={showLibraryModal}
        onClose={() => setShowLibraryModal(false)}
        onImport={handleImportFromLibrary}
      />
    </>
  );
};