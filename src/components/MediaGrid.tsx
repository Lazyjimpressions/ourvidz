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
import { useAssets } from '@/hooks/useAssets';
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
  onClearWorkspace?: boolean; // Changed to simple boolean trigger
  onImport?: (importHandler: (assets: UnifiedAsset[]) => void) => void;
}

export const MediaGrid = ({ onRegenerateItem, onGenerateMoreLike, onClearWorkspace, onImport }: MediaGridProps) => {
  const [tiles, setTiles] = useState<MediaTile[]>([]);
  const [selectedTile, setSelectedTile] = useState<MediaTile | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [deletingTiles, setDeletingTiles] = useState<Set<string>>(new Set());
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Subscribe to React Query assets cache - using session-only to match workspace intent
  const { data: assets = [], isLoading } = useAssets(true); // Get session-only assets

  // Load workspace state from sessionStorage on mount
  useEffect(() => {
    console.log('🔄 Starting workspace initialization...');
    const savedTiles = sessionStorage.getItem('workspaceTiles');
    if (savedTiles) {
      try {
        const parsedTiles = JSON.parse(savedTiles);
        // Convert timestamp strings back to Date objects
        const tilesWithDates = parsedTiles.map((tile: any) => ({
          ...tile,
          timestamp: new Date(tile.timestamp)
        }));
        setTiles(tilesWithDates);
        console.log('✅ Loaded workspace from sessionStorage:', tilesWithDates.length, 'tiles');
      } catch (error) {
        console.error('❌ Failed to parse saved workspace tiles:', error);
        sessionStorage.removeItem('workspaceTiles');
      }
    }
    setIsLoaded(true);
    console.log('✅ Workspace initialization complete');
  }, []);

  // Save workspace state to sessionStorage whenever tiles change (only after initialization)
  useEffect(() => {
    if (!isLoaded) {
      console.log('⏳ Skipping save - still initializing...');
      return;
    }
    
    if (tiles.length > 0) {
      sessionStorage.setItem('workspaceTiles', JSON.stringify(tiles));
      console.log('💾 Saved workspace to sessionStorage:', tiles.length, 'tiles');
    }
  }, [tiles, isLoaded]);

  const handleDelete = async (tile: MediaTile, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (deletingTiles.has(tile.id)) return;
    
    console.log('🗑️ Starting workspace tile deletion:', {
      tileId: tile.id,
      originalAssetId: tile.originalAssetId,
      type: tile.type
    });
    
    try {
      setDeletingTiles(prev => new Set([...prev, tile.id]));
      
      // Call the fixed AssetService.deleteAsset with proper error handling
      await AssetService.deleteAsset(tile.originalAssetId, tile.type);
      
      console.log('✅ Asset deletion successful, removing tiles from workspace');
      
      // Remove all tiles that share the same originalAssetId (for 6-image generations)
      setTiles(prevTiles => {
        const filteredTiles = prevTiles.filter(t => t.originalAssetId !== tile.originalAssetId);
        console.log('🔄 Tiles removed from workspace:', {
          before: prevTiles.length,
          after: filteredTiles.length,
          removedAssetId: tile.originalAssetId
        });
        return filteredTiles;
      });
      
      toast.success(`${tile.type === 'image' ? 'Image' : 'Video'} deleted successfully`);
    } catch (error) {
      console.error('❌ Workspace deletion failed:', {
        tileId: tile.id,
        originalAssetId: tile.originalAssetId,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      
      // More specific error message based on error type
      const errorMessage = error instanceof Error 
        ? error.message.includes('Failed to fetch') 
          ? 'Network error - please check your connection'
          : error.message.includes('permission')
          ? 'Permission denied - please try again'
          : `Deletion failed: ${error.message}`
        : 'Failed to delete item - unknown error';
        
      toast.error(errorMessage);
    } finally {
      // Always clear the deleting state so user can retry
      setDeletingTiles(prev => {
        const next = new Set(prev);
        next.delete(tile.id);
        console.log('🔄 Cleared deleting state for tile:', tile.id);
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
    
    // Replace workspace with imported tiles only
    setTiles(() => {
      // Sort by timestamp to maintain order
      return importedTiles.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    });
    
    toast.success(`Imported ${importedAssets.length} asset${importedAssets.length !== 1 ? 's' : ''} to workspace`);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  // Watch for new assets in the React Query cache and add them to workspace
  useEffect(() => {
    if (!isLoaded || isLoading) {
      console.log('⏳ Skipping asset detection - not loaded or still loading...');
      return;
    }

    if (!assets || assets.length === 0) {
      console.log('⏳ No session assets available in cache yet');
      return;
    }

    console.log('🔍 Checking for new session assets in cache:', {
      sessionAssets: assets.length,
      workspaceTiles: tiles.length,
      currentTileIds: tiles.map(t => t.originalAssetId).slice(0, 10) // Show first 10 for debugging
    });

    // Find completed session assets that aren't already in workspace
    const existingTileIds = new Set(tiles.map(tile => tile.originalAssetId));
    const newAssets = assets.filter(asset => 
      asset.status === 'completed' &&
      asset.url && // Has actual content URL
      !existingTileIds.has(asset.id) // Not already in workspace
    );

    if (newAssets.length > 0) {
      console.log('✅ Found new session assets to add to workspace:', {
        count: newAssets.length,
        assets: newAssets.map(a => ({ id: a.id, type: a.type, status: a.status, hasUrl: !!a.url }))
      });

      // Transform new assets to tiles
      const newTiles: MediaTile[] = [];
      for (const asset of newAssets) {
        const assetTiles = transformAssetToTile(asset);
        if (assetTiles.length > 0) {
          newTiles.push(...assetTiles);
        }
      }

      if (newTiles.length > 0) {
        setTiles(prevTiles => {
          console.log('📦 Adding tiles to workspace:', {
            newTiles: newTiles.length,
            existingTiles: prevTiles.length
          });
          
          const combined = [...newTiles, ...prevTiles];
          return combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        });

        toast.success(`${newTiles.length} new ${newTiles.length === 1 ? 'item' : 'items'} added to workspace!`);
      }
    } else {
      console.log('🔍 No new session assets found for workspace');
    }
  }, [assets, tiles, isLoaded, isLoading]);

  // Clear workspace when triggered by parent
  useEffect(() => {
    if (onClearWorkspace && isLoaded) {
      console.log('🧹 Clearing workspace via parent trigger');
      setTiles([]);
      sessionStorage.removeItem('workspaceTiles');
      toast.success('Workspace cleared');
    }
  }, [onClearWorkspace, isLoaded]);

  // Handle workspace clearing
  const handleClearWorkspace = () => {
    console.log('🧹 Clearing workspace');
    setTiles([]);
    sessionStorage.removeItem('workspaceTiles');
    toast.success('Workspace cleared');
  };

  // Register import handler with parent component
  useEffect(() => {
    if (onImport) {
      onImport(handleImportFromLibrary);
      console.log('✅ Import handler registered with parent');
    }
  }, [onImport, handleImportFromLibrary]);


  if (tiles.length === 0) {
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