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

export const useRealtimeWorkspace = () => {
  const queryClient = useQueryClient();
  const [deletingTiles, setDeletingTiles] = useState<Set<string>>(new Set());
  const [workspaceFilter, setWorkspaceFilter] = useState<Set<string>>(new Set());
  const processedUpdatesRef = useRef<Set<string>>(new Set());
  
  // Efficient workspace query - only fetches when filter changes
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['realtime-workspace-assets', Array.from(workspaceFilter).sort()],
    queryFn: async () => {
      if (workspaceFilter.size === 0) {
        return [];
      }
      console.log('🚀 Fetching workspace assets:', Array.from(workspaceFilter));
      return AssetService.getAssetsByIds(Array.from(workspaceFilter));
    },
    enabled: true,
    // OPTIMIZATION: Cache workspace assets for 10 minutes - they're immutable once completed
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on mount, rely on cache
  });

  // Load workspace filter from localStorage on mount
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
    }
  }, []);

  // Save workspace filter to localStorage
  useEffect(() => {
    const filterArray = Array.from(workspaceFilter);
    if (filterArray.length > 0) {
      localStorage.setItem('workspaceFilter', JSON.stringify(filterArray));
    } else {
      localStorage.removeItem('workspaceFilter');
    }
  }, [workspaceFilter]);

  // Realtime subscription for completed assets
  useEffect(() => {
    const setupRealtimeSubscriptions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('🔔 Setting up realtime subscriptions for workspace');
      
      const imageChannel = supabase
        .channel('workspace-images')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'images',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newImage = payload.new as any;
            if (newImage.status === 'completed' && !processedUpdatesRef.current.has(newImage.id)) {
              console.log('🎉 New completed image detected:', newImage.id);
              processedUpdatesRef.current.add(newImage.id);
              
              // Add to workspace filter
              setWorkspaceFilter(prev => new Set([...prev, newImage.id]));
              
              // Show notification
              toast.success('New image completed and added to workspace!');
              
              // Cleanup
              setTimeout(() => processedUpdatesRef.current.delete(newImage.id), 30000);
            }
          }
        )
        .subscribe();

      const videoChannel = supabase
        .channel('workspace-videos')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'videos',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newVideo = payload.new as any;
            if (newVideo.status === 'completed' && !processedUpdatesRef.current.has(newVideo.id)) {
              console.log('🎉 New completed video detected:', newVideo.id);
              processedUpdatesRef.current.add(newVideo.id);
              
              // Add to workspace filter
              setWorkspaceFilter(prev => new Set([...prev, newVideo.id]));
              
              // Show notification
              toast.success('New video completed and added to workspace!');
              
              // Cleanup
              setTimeout(() => processedUpdatesRef.current.delete(newVideo.id), 30000);
            }
          }
        )
        .subscribe();

      return () => {
        console.log('🔕 Cleaning up workspace realtime subscriptions');
        supabase.removeChannel(imageChannel);
        supabase.removeChannel(videoChannel);
      };
    };

    setupRealtimeSubscriptions();
  }, []);

  // Listen for generation completion events
  useEffect(() => {
    const handleGenerationComplete = (event: CustomEvent) => {
      const { assetId, type } = event.detail;
      console.log('🎉 Generation completion event received:', { assetId, type });
      
      // Add to workspace filter
      setWorkspaceFilter(prev => new Set([...prev, assetId]));
    };

    window.addEventListener('generation-completed', handleGenerationComplete as EventListener);
    
    return () => {
      window.removeEventListener('generation-completed', handleGenerationComplete as EventListener);
    };
  }, []);

  // Transform assets to tiles with enhanced SDXL array handling
  const transformAssetToTiles = useCallback((asset: UnifiedAsset): MediaTile[] => {
    const tiles: MediaTile[] = [];
    
    if (asset.type === 'image') {
      // Handle SDXL 6-image arrays
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

  // Enhanced workspace tiles
  const workspaceTiles = useCallback(() => {
    const completedAssets = assets.filter(asset => 
      asset.status === 'completed' && 
      (asset.url || (asset.signedUrls && asset.signedUrls.length > 0))
    );
    
    const allTiles: MediaTile[] = [];
    completedAssets.forEach(asset => {
      const tiles = transformAssetToTiles(asset);
      allTiles.push(...tiles);
    });
    
    return allTiles.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [assets, transformAssetToTiles]);

  // Add to workspace
  const addToWorkspace = useCallback((assetIds: string[]) => {
    console.log('➕ Adding assets to workspace:', assetIds);
    setWorkspaceFilter(prev => {
      const newFilter = new Set(prev);
      assetIds.forEach(id => newFilter.add(id));
      return newFilter;
    });
  }, []);

  // Import to workspace
  const importToWorkspace = useCallback((importedAssets: UnifiedAsset[]) => {
    console.log('🔄 Adding imported assets to workspace:', importedAssets.length);
    
    const newFilterIds = importedAssets.map(asset => asset.id);
    const newFilter = new Set([...workspaceFilter, ...newFilterIds]);
    setWorkspaceFilter(newFilter);
    
    toast.success(`Added ${importedAssets.length} asset${importedAssets.length !== 1 ? 's' : ''} to workspace`);
  }, [workspaceFilter]);

  // Clear workspace
  const clearWorkspace = useCallback(() => {
    setWorkspaceFilter(new Set());
    localStorage.removeItem('workspaceFilter');
    toast.success('Workspace cleared');
  }, []);

  // Delete tile
  const deleteTile = useCallback(async (tile: MediaTile) => {
    if (deletingTiles.has(tile.id)) return;
    
    console.log('🗑️ Starting workspace tile deletion:', tile.id);
    
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