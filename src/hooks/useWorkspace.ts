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

  // Phase 4: Enhanced workspace tiles with comprehensive logging
  const workspaceTiles = useCallback(() => {
    console.log('🎬 Phase 4: workspaceTiles - processing workspace assets:', {
      totalAssets: assets.length,
      workspaceFilterSize: workspaceFilter.size,
      timestamp: new Date().toISOString()
    });
    
    console.log('📊 Phase 4: Asset statuses breakdown:', assets.map(a => ({ 
      id: a.id, 
      status: a.status, 
      hasUrl: !!a.url, 
      type: a.type,
      signedUrlCount: a.signedUrls?.length || 0
    })));
    
    const completedAssets = assets.filter(asset => 
      asset.status === 'completed' && 
      asset.url
    );
    
    console.log('✅ Phase 4: Completed assets with URLs:', {
      count: completedAssets.length,
      details: completedAssets.map(a => ({ 
        id: a.id, 
        status: a.status, 
        hasUrl: !!a.url, 
        type: a.type,
        signedUrlCount: a.signedUrls?.length || 0
      }))
    });
    
    const allTiles: MediaTile[] = [];
    completedAssets.forEach(asset => {
      const tiles = transformAssetToTiles(asset);
      allTiles.push(...tiles);
      console.log(`🔄 Phase 4: Generated ${tiles.length} tiles for asset ${asset.id}`);
    });
    
    console.log('🎯 Phase 4: Final workspace tiles generated:', {
      tileCount: allTiles.length,
      tileTypes: allTiles.reduce((acc, tile) => {
        acc[tile.type] = (acc[tile.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });
    
    return allTiles.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [assets, transformAssetToTiles, workspaceFilter]);

  // Add asset to workspace filter
  const addToWorkspace = useCallback((assetIds: string[]) => {
    setWorkspaceFilter(prev => {
      const newFilter = new Set(prev);
      assetIds.forEach(id => newFilter.add(id));
      return newFilter;
    });
  }, []);

  // Phase 4: Enhanced import with comprehensive debugging
  const importToWorkspace = useCallback((importedAssets: UnifiedAsset[]) => {
    console.log('🔄 Phase 4: importToWorkspace called with comprehensive logging:', {
      assetCount: importedAssets.length,
      timestamp: new Date().toISOString(),
      currentWorkspaceSize: workspaceFilter.size
    });
    
    console.log('📋 Phase 4: Assets being imported detailed analysis:', importedAssets.map(a => ({ 
      id: a.id, 
      status: a.status, 
      hasUrl: !!a.url, 
      type: a.type,
      signedUrlCount: a.signedUrls?.length || 0,
      createdAt: a.createdAt.toISOString()
    })));
    
    const newFilterIds = importedAssets.map(asset => asset.id);
    console.log('🎯 Phase 4: Filter transition:', {
      previousFilter: Array.from(workspaceFilter),
      newFilter: newFilterIds,
      added: newFilterIds.filter(id => !workspaceFilter.has(id)),
      removed: Array.from(workspaceFilter).filter(id => !newFilterIds.includes(id))
    });
    
    setWorkspaceFilter(new Set(newFilterIds));
    console.log('✅ Phase 4: Workspace filter successfully updated');
    
    toast.success(`Imported ${importedAssets.length} asset${importedAssets.length !== 1 ? 's' : ''} to workspace`);
  }, [workspaceFilter]);

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