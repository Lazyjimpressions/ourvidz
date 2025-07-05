import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const [deletingTiles, setDeletingTiles] = useState<Set<string>>(new Set());
  const [workspaceFilter, setWorkspaceFilter] = useState<Set<string>>(new Set());
  
  // Fetch only assets that are in the workspace filter with optimized caching
  const { data: assets = [], isLoading, refetch } = useQuery({
    queryKey: ['workspace-assets', Array.from(workspaceFilter).sort()],
    queryFn: () => AssetService.getAssetsByIds(Array.from(workspaceFilter)),
    enabled: workspaceFilter.size > 0,
    // OPTIMIZATION: Better caching for workspace
    staleTime: 2 * 60 * 1000, // 2 minutes - workspace doesn't change that frequently
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    refetchOnWindowFocus: false, // OPTIMIZATION: Reduce unnecessary refetches
    refetchOnMount: true,
    // OPTIMIZATION: Background refresh for real-time updates without aggressive polling
    refetchInterval: 15 * 1000, // Every 15 seconds for workspace responsiveness
  });

  // Load workspace filter from localStorage on mount (persistent across refreshes)
  useEffect(() => {
    const savedFilter = localStorage.getItem('workspaceFilter');
    if (savedFilter) {
      try {
        const filterIds = JSON.parse(savedFilter);
        setWorkspaceFilter(new Set(filterIds));
        console.log('🔄 Loaded workspace filter from localStorage:', filterIds);
      } catch (error) {
        console.error('Failed to parse workspace filter:', error);
        localStorage.removeItem('workspaceFilter');
      }
    } else {
      console.log('🆕 No saved workspace filter found, starting with empty workspace');
    }
  }, []);

  // Save workspace filter to localStorage (persistent across refreshes)
  useEffect(() => {
    const filterArray = Array.from(workspaceFilter);
    if (filterArray.length > 0) {
      localStorage.setItem('workspaceFilter', JSON.stringify(filterArray));
      console.log('💾 Saved workspace filter to localStorage:', filterArray);
    } else {
      localStorage.removeItem('workspaceFilter');
      console.log('🗑️ Cleared workspace filter from localStorage');
    }
  }, [workspaceFilter]);

  // Transform assets to tiles with enhanced SDXL array handling
  const transformAssetToTiles = useCallback((asset: UnifiedAsset): MediaTile[] => {
    const tiles: MediaTile[] = [];
    
    if (asset.type === 'image') {
      // Handle SDXL 6-image arrays
      if (asset.signedUrls && asset.signedUrls.length > 0) {
        console.log(`🖼️ Processing SDXL image array with ${asset.signedUrls.length} images for asset ${asset.id}`);
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
        // Handle single image
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

  // Enhanced workspace tiles with real-time processing
  const workspaceTiles = useCallback(() => {
    console.log('🎬 Workspace tiles processing:', {
      totalAssets: assets.length,
      workspaceFilterSize: workspaceFilter.size,
      timestamp: new Date().toISOString()
    });
    
    const completedAssets = assets.filter(asset => 
      asset.status === 'completed' && 
      (asset.url || (asset.signedUrls && asset.signedUrls.length > 0))
    );
    
    console.log('✅ Completed assets ready for display:', {
      count: completedAssets.length,
      details: completedAssets.map(a => ({ 
        id: a.id, 
        status: a.status, 
        hasUrl: !!a.url, 
        hasSignedUrls: !!(a.signedUrls && a.signedUrls.length > 0),
        type: a.type,
        signedUrlCount: a.signedUrls?.length || 0
      }))
    });
    
    const allTiles: MediaTile[] = [];
    completedAssets.forEach(asset => {
      const tiles = transformAssetToTiles(asset);
      allTiles.push(...tiles);
      console.log(`🔄 Generated ${tiles.length} tiles for asset ${asset.id}`);
    });
    
    console.log('🎯 Final workspace tiles:', {
      tileCount: allTiles.length,
      tileTypes: allTiles.reduce((acc, tile) => {
        acc[tile.type] = (acc[tile.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });
    
    return allTiles.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [assets, transformAssetToTiles, workspaceFilter]);

  // Add asset to workspace with optimistic updates
  const addToWorkspace = useCallback((assetIds: string[]) => {
    console.log('➕ Adding assets to workspace:', assetIds);
    
    setWorkspaceFilter(prev => {
      const newFilter = new Set(prev);
      assetIds.forEach(id => newFilter.add(id));
      return newFilter;
    });
    
    // OPTIMIZATION: Smart invalidation - only invalidate workspace queries
    queryClient.invalidateQueries({ 
      queryKey: ['workspace-assets'],
      exact: false 
    });
    // Remove refetch() - let React Query handle it with background refresh
  }, [queryClient]);

  // Enhanced import with optimistic updates
  const importToWorkspace = useCallback((importedAssets: UnifiedAsset[]) => {
    console.log('🔄 Adding imported assets to workspace:', {
      assetCount: importedAssets.length,
      currentWorkspaceSize: workspaceFilter.size
    });
    
    const newFilterIds = importedAssets.map(asset => asset.id);
    
    // OPTIMIZATION: Optimistic update - add assets to cache immediately
    const newFilter = new Set([...workspaceFilter, ...newFilterIds]);
    const currentQueryKey = ['workspace-assets', Array.from(newFilter).sort()];
    
    queryClient.setQueryData(currentQueryKey, (oldData: UnifiedAsset[] | undefined) => {
      const existingAssets = oldData || [];
      const newAssets = importedAssets.filter(asset => 
        !existingAssets.some(existing => existing.id === asset.id)
      );
      return [...existingAssets, ...newAssets].sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      );
    });
    
    setWorkspaceFilter(newFilter);
    
    // OPTIMIZATION: Smart invalidation - only workspace queries
    queryClient.invalidateQueries({ 
      queryKey: ['workspace-assets'],
      exact: false 
    });
    
    toast.success(`Added ${importedAssets.length} asset${importedAssets.length !== 1 ? 's' : ''} to workspace`);
  }, [workspaceFilter, queryClient]);

  // Clear workspace
  const clearWorkspace = useCallback(() => {
    setWorkspaceFilter(new Set());
    localStorage.removeItem('workspaceFilter');
    queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
    toast.success('Workspace cleared');
  }, [queryClient]);

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