import { useState, useEffect, useCallback, useRef } from 'react';
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

export const useMediaGridWorkspace = () => {
  const queryClient = useQueryClient();
  const [deletingTiles, setDeletingTiles] = useState<Set<string>>(new Set());
  const [workspaceFilter, setWorkspaceFilter] = useState<Set<string>>(new Set());
  
  // Isolated workspace query for MediaGrid
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['media-grid-workspace-assets', Array.from(workspaceFilter).sort()],
    queryFn: async () => {
      if (workspaceFilter.size === 0) {
        return [];
      }
      return AssetService.getAssetsByIds(Array.from(workspaceFilter));
    },
    enabled: workspaceFilter.size > 0,
    staleTime: 2 * 60 * 60 * 1000, // 2 hours
    gcTime: 12 * 60 * 60 * 1000, // Keep in cache for 12 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  // Restore workspace from different session storage key
  useEffect(() => {
    const restoreWorkspace = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const userScopedKey = `mediaGridWorkspaceFilter_${user.id}`;
      const storedFilter = sessionStorage.getItem(userScopedKey);
      
      if (storedFilter) {
        try {
          const filterArray = JSON.parse(storedFilter);
          if (Array.isArray(filterArray) && filterArray.length > 0) {
            setWorkspaceFilter(new Set(filterArray));
          }
        } catch (error) {
          console.warn('Failed to parse stored media grid workspace filter:', error);
        }
      }
    };
    
    restoreWorkspace();
  }, []);

  // Save workspace filter to session storage
  useEffect(() => {
    const saveWorkspace = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const userScopedKey = `mediaGridWorkspaceFilter_${user.id}`;
      if (workspaceFilter.size > 0) {
        sessionStorage.setItem(userScopedKey, JSON.stringify(Array.from(workspaceFilter)));
      } else {
        sessionStorage.removeItem(userScopedKey);
      }
    };
    
    saveWorkspace();
  }, [workspaceFilter]);

  // Transform assets to tiles
  const transformAssetToTiles = useCallback((asset: UnifiedAsset): MediaTile[] => {
    const tiles: MediaTile[] = [];
    
    if (asset.type === 'image' && asset.url) {
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

  // Get workspace tiles
  const tiles = useCallback(() => {
    const completedAssets = assets.filter(asset => 
      asset.status === 'completed' && asset.url
    );
    
    const allTiles: MediaTile[] = [];
    completedAssets.forEach(asset => {
      const tiles = transformAssetToTiles(asset);
      allTiles.push(...tiles);
    });
    
    return allTiles.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [assets, transformAssetToTiles]);

  // Import to workspace
  const importToWorkspace = useCallback((importedAssets: UnifiedAsset[]) => {
    const newFilterIds = importedAssets.map(asset => asset.id);
    const newFilter = new Set([...workspaceFilter, ...newFilterIds]);
    setWorkspaceFilter(newFilter);
    
    toast.success(`Added ${importedAssets.length} asset${importedAssets.length !== 1 ? 's' : ''} to workspace`);
  }, [workspaceFilter]);

  // Clear workspace
  const clearWorkspace = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    setWorkspaceFilter(new Set());
    
    if (user) {
      const userScopedKey = `mediaGridWorkspaceFilter_${user.id}`;
      sessionStorage.removeItem(userScopedKey);
    }
    
    toast.success('Workspace cleared');
  }, []);

  // Delete tile
  const deleteTile = useCallback(async (tile: MediaTile) => {
    if (deletingTiles.has(tile.id)) return;
    
    try {
      setDeletingTiles(prev => new Set([...prev, tile.id]));
      
      setWorkspaceFilter(prev => {
        const newFilter = new Set(prev);
        newFilter.delete(tile.originalAssetId);
        return newFilter;
      });
      
      await AssetService.deleteAsset(tile.originalAssetId, tile.type);
      
      toast.success(`${tile.type === 'image' ? 'Image' : 'Video'} deleted successfully`);
      
    } catch (error) {
      console.error('Deletion failed:', error);
      
      setWorkspaceFilter(prev => new Set([...prev, tile.originalAssetId]));
      
      const errorMessage = error instanceof Error 
        ? error.message.includes('Failed to fetch') 
          ? 'Network error - please check your connection'
          : error.message
        : 'Failed to delete asset';
      
      toast.error(errorMessage);
    } finally {
      setDeletingTiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(tile.id);
        return newSet;
      });
    }
  }, [deletingTiles]);

  return {
    tiles: tiles(),
    isLoading,
    deletingTiles,
    importToWorkspace,
    clearWorkspace,
    deleteTile
  };
};