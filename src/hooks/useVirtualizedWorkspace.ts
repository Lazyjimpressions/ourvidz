import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { OptimizedAssetService, UnifiedAsset } from '@/lib/services/OptimizedAssetService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MediaTile } from '@/types/workspace';

interface VirtualizedWorkspaceOptions {
  itemHeight?: number;
  overscan?: number;
  visibleCount?: number;
}

export const useVirtualizedWorkspace = (options: VirtualizedWorkspaceOptions = {}) => {
  const { 
    itemHeight = 300, 
    overscan = 5,
    visibleCount = 12 
  } = options;

  const queryClient = useQueryClient();
  const [deletingTiles, setDeletingTiles] = useState<Set<string>>(new Set());
  const [workspaceFilter, setWorkspaceFilter] = useState<Set<string>>(new Set());
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: visibleCount });
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const processedUpdatesRef = useRef<Set<string>>(new Set());
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const tileElementsRef = useRef<Map<string, HTMLElement>>(new Map());

  // Fast metadata-only query for workspace items
  const { data: metadataAssets = [], isLoading: isLoadingMetadata } = useQuery({
    queryKey: ['workspace-metadata', Array.from(workspaceFilter).sort()],
    queryFn: async () => {
      if (workspaceFilter.size === 0) return [];
      
      console.log('🚀 Fetching workspace metadata for:', workspaceFilter.size, 'assets');
      const startTime = performance.now();
      
      // Use optimized service that loads metadata without URLs
      const assets = await OptimizedAssetService.getUserAssets(
        {}, 
        { limit: 1000, offset: 0 }
      );
      
      // Filter to only workspace assets and sort by creation date
      const workspaceAssets = assets.assets
        .filter(asset => workspaceFilter.has(asset.id))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      console.log('✅ Workspace metadata loaded:', {
        count: workspaceAssets.length,
        loadTime: Math.round(performance.now() - startTime),
        hasUrls: workspaceAssets.filter(a => a.url).length
      });
      
      return workspaceAssets;
    },
    enabled: workspaceFilter.size > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - metadata is fairly stable
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Load workspace filter from localStorage
  useEffect(() => {
    const savedFilter = localStorage.getItem('workspaceFilter');
    if (savedFilter) {
      try {
        const filterIds = JSON.parse(savedFilter);
        setWorkspaceFilter(new Set(filterIds));
        console.log('🔄 Loaded workspace filter:', filterIds.length, 'items');
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

  // Transform assets to tiles with lazy URL loading
  const allTiles = useCallback((): MediaTile[] => {
    const tiles: MediaTile[] = [];
    
    metadataAssets.forEach(asset => {
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
              modelType: asset.modelType,
              isUrlLoaded: true
            });
          });
        } else {
          // Single image or no URL yet
          tiles.push({
            id: asset.id,
            originalAssetId: asset.id,
            type: 'image',
            url: asset.url,
            prompt: asset.prompt,
            timestamp: asset.createdAt,
            quality: (asset.quality as 'fast' | 'high') || 'fast',
            modelType: asset.modelType,
            isUrlLoaded: !!asset.url
          });
        }
      } else if (asset.type === 'video') {
        tiles.push({
          id: asset.id,
          originalAssetId: asset.id,
          type: 'video',
          url: asset.url,
          prompt: asset.prompt,
          timestamp: asset.createdAt,
          quality: (asset.quality as 'fast' | 'high') || 'fast',
          duration: asset.duration,
          thumbnailUrl: asset.thumbnailUrl,
          isUrlLoaded: !!asset.url
        });
      }
    });
    
    return tiles.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [metadataAssets]);

  // Get visible tiles with virtualization
  const visibleTiles = useCallback(() => {
    const tiles = allTiles();
    const start = Math.max(0, visibleRange.start - overscan);
    const end = Math.min(tiles.length, visibleRange.end + overscan);
    
    return tiles.slice(start, end).map((tile, index) => ({
      ...tile,
      virtualIndex: start + index,
      isVisible: index >= overscan && index < (end - start - overscan)
    }));
  }, [allTiles, visibleRange, overscan]);

  // Lazy load URLs for visible tiles
  const loadUrlsForTiles = useCallback(async (tiles: MediaTile[]) => {
    const tilesToLoad = tiles.filter(tile => 
      !tile.isUrlLoaded && 
      !loadingUrls.has(tile.originalAssetId) &&
      tile.isVisible
    );

    if (tilesToLoad.length === 0) return;

    const assetIds = [...new Set(tilesToLoad.map(tile => tile.originalAssetId))];
    
    console.log('🔄 Lazy loading URLs for', assetIds.length, 'assets');
    
    // Mark as loading
    setLoadingUrls(prev => {
      const next = new Set(prev);
      assetIds.forEach(id => next.add(id));
      return next;
    });

    try {
      // Load URLs for these specific assets
      const assetsWithUrls = await Promise.all(
        assetIds.map(async (assetId) => {
          const asset = metadataAssets.find(a => a.id === assetId);
          if (!asset) return null;
          
          return OptimizedAssetService.generateAssetUrls(asset);
        })
      );

      // Update the query cache with the new URLs
      queryClient.setQueryData(
        ['workspace-metadata', Array.from(workspaceFilter).sort()],
        (oldData: UnifiedAsset[]) => {
          if (!oldData) return oldData;
          
          return oldData.map(asset => {
            const updatedAsset = assetsWithUrls.find(updated => 
              updated && updated.id === asset.id
            );
            return updatedAsset || asset;
          });
        }
      );

      console.log('✅ URLs loaded for', assetsWithUrls.filter(Boolean).length, 'assets');
      
    } catch (error) {
      console.error('❌ Failed to load URLs:', error);
    } finally {
      // Clear loading state
      setLoadingUrls(prev => {
        const next = new Set(prev);
        assetIds.forEach(id => next.delete(id));
        return next;
      });
    }
  }, [metadataAssets, workspaceFilter, queryClient, loadingUrls]);

  // Load URLs when visible tiles change
  useEffect(() => {
    const tiles = visibleTiles();
    if (tiles.length > 0) {
      loadUrlsForTiles(tiles);
    }
  }, [visibleTiles, loadUrlsForTiles]);

  // Intersection Observer for virtualization
  useEffect(() => {
    if (intersectionObserverRef.current) {
      intersectionObserverRef.current.disconnect();
    }

    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const element = entry.target as HTMLElement;
          const index = parseInt(element.dataset.index || '0');
          
          if (entry.isIntersecting) {
            // Update visible range based on intersecting elements
            setVisibleRange(prev => ({
              start: Math.min(prev.start, Math.max(0, index - overscan)),
              end: Math.max(prev.end, index + visibleCount + overscan)
            }));
          }
        });
      },
      {
        rootMargin: `${itemHeight * overscan}px 0px`,
        threshold: 0.1
      }
    );

    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
    };
  }, [itemHeight, overscan, visibleCount]);

  // Register tile element for intersection observation
  const registerTileElement = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      tileElementsRef.current.set(id, element);
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.observe(element);
      }
    } else {
      const existing = tileElementsRef.current.get(id);
      if (existing && intersectionObserverRef.current) {
        intersectionObserverRef.current.unobserve(existing);
      }
      tileElementsRef.current.delete(id);
    }
  }, []);

  // Realtime subscriptions for new assets
  useEffect(() => {
    const setupRealtimeSubscriptions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('🔔 Setting up optimized realtime subscriptions');
      
      const imageChannel = supabase
        .channel('workspace-images-optimized')
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
              console.log('🎉 New image completed:', newImage.id);
              processedUpdatesRef.current.add(newImage.id);
              
              setWorkspaceFilter(prev => new Set([...prev, newImage.id]));
              toast.success('New image ready!');
              
              setTimeout(() => processedUpdatesRef.current.delete(newImage.id), 30000);
            }
          }
        )
        .subscribe();

      return () => {
        console.log('🔕 Cleaning up optimized realtime subscriptions');
        supabase.removeChannel(imageChannel);
      };
    };

    setupRealtimeSubscriptions();
  }, []);

  // Workspace management functions
  const addToWorkspace = useCallback((assetIds: string[]) => {
    console.log('➕ Adding assets to workspace:', assetIds.length);
    setWorkspaceFilter(prev => {
      const newFilter = new Set(prev);
      assetIds.forEach(id => newFilter.add(id));
      return newFilter;
    });
  }, []);

  const importToWorkspace = useCallback((importedAssets: UnifiedAsset[]) => {
    console.log('🔄 Importing assets to workspace:', importedAssets.length);
    const newFilterIds = importedAssets.map(asset => asset.id);
    setWorkspaceFilter(prev => new Set([...prev, ...newFilterIds]));
    toast.success(`Added ${importedAssets.length} asset${importedAssets.length !== 1 ? 's' : ''} to workspace`);
  }, []);

  const clearWorkspace = useCallback(() => {
    setWorkspaceFilter(new Set());
    localStorage.removeItem('workspaceFilter');
    setVisibleRange({ start: 0, end: visibleCount });
    toast.success('Workspace cleared');
  }, [visibleCount]);

  const deleteTile = useCallback(async (tile: MediaTile) => {
    if (deletingTiles.has(tile.id)) return;
    
    console.log('🗑️ Deleting tile:', tile.id);
    
    try {
      setDeletingTiles(prev => new Set([...prev, tile.id]));
      
      // Optimistic update
      setWorkspaceFilter(prev => {
        const newFilter = new Set(prev);
        newFilter.delete(tile.originalAssetId);
        return newFilter;
      });
      
      await OptimizedAssetService.deleteAssetCompletely(tile.originalAssetId, tile.type);
      toast.success(`${tile.type === 'image' ? 'Image' : 'Video'} deleted`);
      
    } catch (error) {
      console.error('❌ Deletion failed:', error);
      // Restore on error
      setWorkspaceFilter(prev => new Set([...prev, tile.originalAssetId]));
      toast.error('Failed to delete item');
    } finally {
      setDeletingTiles(prev => {
        const next = new Set(prev);
        next.delete(tile.id);
        return next;
      });
    }
  }, [deletingTiles]);

  return {
    // Core data
    tiles: allTiles(),
    visibleTiles: visibleTiles(),
    totalCount: allTiles().length,
    
    // Loading states
    isLoading: isLoadingMetadata,
    loadingUrls,
    deletingTiles,
    
    // Workspace management
    addToWorkspace,
    importToWorkspace,
    clearWorkspace,
    deleteTile,
    
    // Virtualization
    registerTileElement,
    visibleRange,
    setVisibleRange,
    
    // Performance metrics
    isOptimized: true
  };
};