import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AssetService, UnifiedAsset } from '@/lib/services/AssetService';
import { supabase } from '@/integrations/supabase/client';
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
  
  // Simple workspace query with static key - refetches when workspaceFilter changes
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['workspace-assets'],
    queryFn: async () => {
      if (workspaceFilter.size === 0) {
        return [];
      }
      return AssetService.getAssetsByIds(Array.from(workspaceFilter));
    },
    enabled: true,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // Trigger refetch when workspaceFilter changes
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
  }, [workspaceFilter, queryClient]);

  // Restore workspace from session storage on mount
  useEffect(() => {
    const restoreWorkspace = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      console.log('🔄 Restoring workspace from session storage for user:', user.id);
      
      const userScopedKey = `workspaceFilter_${user.id}`;
      const storedFilter = sessionStorage.getItem(userScopedKey);
      
      if (storedFilter) {
        try {
          const filterArray = JSON.parse(storedFilter);
          if (Array.isArray(filterArray) && filterArray.length > 0) {
            setWorkspaceFilter(new Set(filterArray));
            console.log('✅ Restored workspace with', filterArray.length, 'assets');
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse stored workspace filter:', error);
        }
      }
    };
    
    restoreWorkspace();
  }, []);

  // Save workspace filter to sessionStorage with user scoping
  useEffect(() => {
    const saveWorkspace = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userScopedKey = `workspaceFilter_${user.id}`;
      const filterArray = Array.from(workspaceFilter);
      
      if (filterArray.length > 0) {
        sessionStorage.setItem(userScopedKey, JSON.stringify(filterArray));
        console.log('💾 Saved workspace filter to session for user:', user.id, filterArray.length, 'items');
      } else {
        sessionStorage.removeItem(userScopedKey);
        console.log('🗑️ Cleared workspace filter from session for user:', user.id);
      }
    };
    
    saveWorkspace();
  }, [workspaceFilter]);

  // Transform assets to tiles - simplified for individual image records only
  const transformAssetToTiles = useCallback((asset: UnifiedAsset): MediaTile[] => {
    const tiles: MediaTile[] = [];
    
    if (asset.type === 'image' && asset.url) {
      // Each image is now its own individual database record
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
      asset.status === 'completed' && asset.url
    );
    
    console.log('✅ Completed assets ready for display:', {
      count: completedAssets.length,
      details: completedAssets.map(a => ({ 
        id: a.id, 
        status: a.status, 
        hasUrl: !!a.url, 
        type: a.type
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

  // Simple add to workspace - let React Query handle refetching
  const addToWorkspace = useCallback((assetIds: string[]) => {
    console.log('➕ Adding assets to workspace:', assetIds);
    
    setWorkspaceFilter(prev => {
      const newFilter = new Set(prev);
      assetIds.forEach(id => newFilter.add(id));
      return newFilter;
    });
  }, []);

  // Simple import to workspace - let React Query handle refetching
  const importToWorkspace = useCallback((importedAssets: UnifiedAsset[]) => {
    console.log('🔄 Adding imported assets to workspace:', {
      assetCount: importedAssets.length,
      currentWorkspaceSize: workspaceFilter.size
    });
    
    const newFilterIds = importedAssets.map(asset => asset.id);
    const newFilter = new Set([...workspaceFilter, ...newFilterIds]);
    setWorkspaceFilter(newFilter);
    
    toast.success(`Added ${importedAssets.length} asset${importedAssets.length !== 1 ? 's' : ''} to workspace`);
  }, [workspaceFilter]);

  // Clear workspace with user-scoped session management
  const clearWorkspace = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    setWorkspaceFilter(new Set());
    
    if (user) {
      const userScopedKey = `workspaceFilter_${user.id}`;
      const sessionStartKey = `workspaceSessionStart_${user.id}`;
      sessionStorage.removeItem(userScopedKey);
      sessionStorage.setItem(sessionStartKey, Date.now().toString());
      console.log('🔄 Cleared workspace and reset session for user:', user.id);
    }
    
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