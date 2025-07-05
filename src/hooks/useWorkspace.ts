import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AssetService, UnifiedAsset } from '@/lib/services/AssetService';
import { toast } from 'sonner';

interface MediaTile {
  id: string;
  originalAssetId: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  timestamp: Date;
  quality: 'fast' | 'high';
  modelType?: string;
  duration?: number;
  thumbnailUrl?: string;
}

export const useWorkspace = () => {
  const [deletingTiles, setDeletingTiles] = useState<Set<string>>(new Set());
  const [workspaceFilter, setWorkspaceFilter] = useState<Set<string>>(new Set());
  
  // Fetch only assets that are in the workspace filter
  const { data: assets = [], isLoading, refetch } = useQuery({
    queryKey: ['workspace-assets', Array.from(workspaceFilter).sort()],
    queryFn: () => AssetService.getAssetsByIds(Array.from(workspaceFilter)),
    enabled: workspaceFilter.size > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Load workspace filter from sessionStorage on mount
  useEffect(() => {
    const savedFilter = sessionStorage.getItem('workspaceFilter');
    if (savedFilter) {
      try {
        const filterIds = JSON.parse(savedFilter);
        setWorkspaceFilter(new Set(filterIds));
      } catch (error) {
        console.error('Failed to parse workspace filter:', error);
        sessionStorage.removeItem('workspaceFilter');
      }
    }
  }, []);

  // Save workspace filter to sessionStorage
  useEffect(() => {
    const filterArray = Array.from(workspaceFilter);
    if (filterArray.length > 0) {
      sessionStorage.setItem('workspaceFilter', JSON.stringify(filterArray));
    } else {
      sessionStorage.removeItem('workspaceFilter');
    }
  }, [workspaceFilter]);

  // Transform assets to tiles (single source of truth from React Query)
  const transformAssetToTiles = useCallback((asset: UnifiedAsset): MediaTile[] => {
    const tiles: MediaTile[] = [];
    
    if (asset.type === 'image') {
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
      } else if (asset.url) {
        tiles.push({
          id: asset.id,
          originalAssetId: asset.id,
          type: 'image',
          url: asset.url,
          prompt: asset.prompt,
          timestamp: asset.createdAt,
          quality: (asset.quality as 'fast' | 'high') || 'fast',
          modelType: asset.modelType
        });
      }
    } else if (asset.type === 'video' && asset.url) {
      tiles.push({
        id: asset.id,
        originalAssetId: asset.id,
        type: 'video',
        url: asset.url,
        prompt: asset.prompt,
        timestamp: asset.createdAt,
        quality: (asset.quality as 'fast' | 'high') || 'fast',
        duration: asset.duration,
        thumbnailUrl: asset.thumbnailUrl
      });
    }
    
    return tiles;
  }, []);

  // Get workspace tiles (only show completed assets with URLs)
  const workspaceTiles = useCallback(() => {
    const completedAssets = assets.filter(asset => 
      asset.status === 'completed' && 
      asset.url
    );
    
    const allTiles: MediaTile[] = [];
    completedAssets.forEach(asset => {
      const tiles = transformAssetToTiles(asset);
      allTiles.push(...tiles);
    });
    
    return allTiles.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [assets, transformAssetToTiles]);

  // Add asset to workspace filter
  const addToWorkspace = useCallback((assetIds: string[]) => {
    setWorkspaceFilter(prev => {
      const newFilter = new Set(prev);
      assetIds.forEach(id => newFilter.add(id));
      return newFilter;
    });
  }, []);

  // Import assets to workspace (replace current workspace)
  const importToWorkspace = useCallback((importedAssets: UnifiedAsset[]) => {
    const newFilterIds = importedAssets.map(asset => asset.id);
    setWorkspaceFilter(new Set(newFilterIds));
    toast.success(`Imported ${importedAssets.length} asset${importedAssets.length !== 1 ? 's' : ''} to workspace`);
  }, []);

  // Clear workspace
  const clearWorkspace = useCallback(() => {
    setWorkspaceFilter(new Set());
    sessionStorage.removeItem('workspaceFilter');
    toast.success('Workspace cleared');
  }, []);

  // Delete tile
  const deleteTile = useCallback(async (tile: MediaTile) => {
    if (deletingTiles.has(tile.id)) return;
    
    console.log('🗑️ Starting workspace tile deletion:', {
      tileId: tile.id,
      originalAssetId: tile.originalAssetId,
      type: tile.type
    });
    
    try {
      setDeletingTiles(prev => new Set([...prev, tile.id]));
      
      // Remove from workspace filter first (optimistic update)
      setWorkspaceFilter(prev => {
        const newFilter = new Set(prev);
        newFilter.delete(tile.originalAssetId);
        return newFilter;
      });
      
      // Actual deletion
      await AssetService.deleteAsset(tile.originalAssetId, tile.type);
      
      console.log('✅ Asset deletion successful');
      toast.success(`${tile.type === 'image' ? 'Image' : 'Video'} deleted successfully`);
      
    } catch (error) {
      console.error('❌ Workspace deletion failed:', error);
      
      // Restore to workspace filter on error
      setWorkspaceFilter(prev => new Set([...prev, tile.originalAssetId]));
      
      const errorMessage = error instanceof Error 
        ? error.message.includes('Failed to fetch') 
          ? 'Network error - please check your connection'
          : error.message.includes('permission')
          ? 'Permission denied - please try again'
          : `Deletion failed: ${error.message}`
        : 'Failed to delete item - unknown error';
        
      toast.error(errorMessage);
    } finally {
      setDeletingTiles(prev => {
        const next = new Set(prev);
        next.delete(tile.id);
        return next;
      });
    }
  }, [deletingTiles]);

  return {
    tiles: workspaceTiles(),
    isLoading,
    deletingTiles,
    addToWorkspace,
    importToWorkspace,
    clearWorkspace,
    deleteTile
  };
};