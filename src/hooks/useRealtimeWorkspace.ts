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
  enhancedPrompt?: string;
  seed?: string;
  generationParams?: Record<string, any>;
}

export const useRealtimeWorkspace = () => {
  const queryClient = useQueryClient();
  const [deletingTiles, setDeletingTiles] = useState<Set<string>>(new Set());
  const [workspaceFilter, setWorkspaceFilter] = useState<Set<string>>(new Set());
  const processedUpdatesRef = useRef<Set<string>>(new Set());
  
  // Batching state for rapid completions
  const batchUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingBatchUpdatesRef = useRef<Set<string>>(new Set());
  
  // Efficient workspace query with aggressive caching
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['realtime-workspace-assets', Array.from(workspaceFilter).sort()],
    queryFn: async () => {
      if (workspaceFilter.size === 0) {
        return [];
      }
      console.log('🚀 Fetching workspace assets with optimization:', Array.from(workspaceFilter));
      return AssetService.getAssetsByIds(Array.from(workspaceFilter));
    },
    enabled: workspaceFilter.size > 0,
    // AGGRESSIVE OPTIMIZATION: Cache for 4 hours - assets don't change once completed
    staleTime: 4 * 60 * 60 * 1000, // 4 hours
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on mount, rely on cache
    refetchInterval: false, // No polling - use realtime instead
    // Retry strategy for failed requests
    retry: (failureCount, error) => {
      if (failureCount < 2) return true;
      console.error('❌ Asset fetch failed after retries:', error);
      return false;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Restore workspace from session storage on mount  
  useEffect(() => {
    const restoreWorkspace = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      console.log('🔄 REALTIME: Restoring workspace from session storage for user:', user.id);
      
      const userScopedKey = `workspaceFilter_${user.id}`;
      const storedFilter = sessionStorage.getItem(userScopedKey);
      
      if (storedFilter) {
        try {
          const filterArray = JSON.parse(storedFilter);
          if (Array.isArray(filterArray) && filterArray.length > 0) {
            setWorkspaceFilter(new Set(filterArray));
            console.log('✅ REALTIME: Restored workspace with', filterArray.length, 'assets');
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse stored workspace filter:', error);
        }
      }
    };
    
    restoreWorkspace();
  }, []);

  // Save workspace filter to session storage whenever it changes
  useEffect(() => {
    const saveWorkspace = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const userScopedKey = `workspaceFilter_${user.id}`;
      sessionStorage.setItem(userScopedKey, JSON.stringify(Array.from(workspaceFilter)));
    };
    
    if (workspaceFilter.size > 0) {
      saveWorkspace();
    }
  }, [workspaceFilter]);

  // Batched realtime subscription with debouncing for rapid SDXL completions
  useEffect(() => {
    const setupRealtimeSubscriptions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('🔔 Setting up batched realtime subscriptions');
      
      // Batched update processor
      const processBatchedUpdates = () => {
        if (pendingBatchUpdatesRef.current.size > 0) {
          const batchIds = Array.from(pendingBatchUpdatesRef.current);
          console.log('🚀 Processing batched workspace updates:', batchIds);
          
          setWorkspaceFilter(prev => {
            const newFilter = new Set(prev);
            batchIds.forEach(id => newFilter.add(id));
            return newFilter;
          });
          
          // Single query invalidation for all batched items
          queryClient.invalidateQueries({ 
            queryKey: ['realtime-workspace-assets'],
            exact: false 
          });
          
          // Dispatch batch completion event
          window.dispatchEvent(new CustomEvent('generation-completed', {
            detail: { 
              assetIds: batchIds, 
              type: 'batch', 
              status: 'completed'
            }
          }));
          
          pendingBatchUpdatesRef.current.clear();
        }
        batchUpdateTimerRef.current = null;
      };
      
      // Combined channel for all asset updates
      const combinedChannel = supabase
        .channel('workspace-combined')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'images',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const image = payload.new as any;
            const eventType = payload.eventType;
            
            if (eventType === 'UPDATE' && image.status === 'completed' && 
                !processedUpdatesRef.current.has(image.id)) {
              
              console.log('🎉 Image completed - adding to batch:', image.id, 'job_id:', image.job_id);
              processedUpdatesRef.current.add(image.id);
              pendingBatchUpdatesRef.current.add(image.id);
              
              // Clear existing timer and set new one (debouncing)
              if (batchUpdateTimerRef.current) {
                clearTimeout(batchUpdateTimerRef.current);
              }
              
              // Process batch after 500ms of no new completions
              batchUpdateTimerRef.current = setTimeout(processBatchedUpdates, 500);
              
              setTimeout(() => processedUpdatesRef.current.delete(image.id), 60000);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'videos',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const video = payload.new as any;
            const eventType = payload.eventType;
            
            if (eventType === 'UPDATE' && video.status === 'completed' && 
                !processedUpdatesRef.current.has(video.id)) {
              console.log('🎉 Video completed with enhanced tracking:', video.id);
              processedUpdatesRef.current.add(video.id);
              
              setWorkspaceFilter(prev => new Set([...prev, video.id]));
              
              // Dispatch enhanced completion event
              window.dispatchEvent(new CustomEvent('generation-completed', {
                detail: { assetId: video.id, type: 'video', status: 'completed' }
              }));
              
              // Invalidate cache to force refresh
              queryClient.invalidateQueries({ 
                queryKey: ['realtime-workspace-assets'],
                exact: false 
              });
              
              setTimeout(() => processedUpdatesRef.current.delete(video.id), 60000);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'jobs',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const job = payload.new as any;
            const eventType = payload.eventType;
            
            // Enhanced job status updates with asset coordination
            if (eventType === 'UPDATE' && job.status !== 'queued') {
              console.log('🔄 Enhanced job status updated:', {
                jobId: job.id, 
                status: job.status,
                assetId: job.image_id || job.video_id,
                assetType: job.image_id ? 'image' : 'video'
              });
              
              // Dispatch job status event for coordination
              window.dispatchEvent(new CustomEvent('job-status-update', {
                detail: { 
                  jobId: job.id, 
                  status: job.status,
                  assetId: job.image_id || job.video_id,
                  assetType: job.image_id ? 'image' : 'video'
                }
              }));
              
              // For job completion, trigger asset refresh with delay
              if (job.status === 'completed') {
                setTimeout(() => {
                  queryClient.invalidateQueries({ 
                    queryKey: ['realtime-workspace-assets'],
                    exact: false 
                  });
                }, 2000); // Small delay to allow asset creation
              }
            }
          }
        )
        .subscribe();

      return () => {
        console.log('🔕 Cleaning up batched realtime subscriptions');
        if (batchUpdateTimerRef.current) {
          clearTimeout(batchUpdateTimerRef.current);
        }
        supabase.removeChannel(combinedChannel);
      };
    };

    setupRealtimeSubscriptions();
  }, [queryClient]);

  // Enhanced generation completion event system with batch support
  useEffect(() => {
    const handleGenerationComplete = (event: CustomEvent) => {
      const { assetId, assetIds, type } = event.detail;
      
      if (type === 'batch' && assetIds) {
        console.log('🎉 Batch generation completion event:', { assetIds, count: assetIds.length });
        toast.success(`${assetIds.length} new images completed!`);
      } else if (assetId) {
        console.log('🎉 Single generation completion event:', { assetId, type });
        toast.success(`New ${type} completed!`);
      }
    };

    window.addEventListener('generation-completed', handleGenerationComplete as EventListener);
    
    return () => {
      window.removeEventListener('generation-completed', handleGenerationComplete as EventListener);
    };
  }, [queryClient]);

  // Transform assets to tiles - simplified for individual image handling
  const transformAssetToTiles = useCallback((asset: UnifiedAsset): MediaTile[] => {
    const tiles: MediaTile[] = [];
    
    if (asset.type === 'image') {
      // Handle individual image records only
      if (asset.url) {
        // Handle single image
        tiles.push({
          id: asset.id,
          originalAssetId: asset.id,
          type: 'image',
          url: asset.url,
          prompt: asset.prompt,
          timestamp: asset.createdAt,
          quality: (asset.quality as 'fast' | 'high') || 'fast',
          modelType: asset.modelType,
          enhancedPrompt: asset.enhancedPrompt,
          seed: asset.metadata?.seed,
          generationParams: asset.metadata
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
        thumbnailUrl: asset.thumbnailUrl,
        enhancedPrompt: asset.enhancedPrompt,
        seed: asset.metadata?.seed,
        generationParams: asset.metadata
      });
    }
    
    return tiles;
  }, []);

  // Optimized workspace tiles with enhanced caching
  const workspaceTiles = useCallback(() => {
    const completedAssets = assets.filter(asset => 
      asset.status === 'completed' && asset.url
    );
    
    const allTiles: MediaTile[] = [];
    completedAssets.forEach(asset => {
      const tiles = transformAssetToTiles(asset);
      allTiles.push(...tiles);
    });
    
    // Sort by timestamp descending (newest first)
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