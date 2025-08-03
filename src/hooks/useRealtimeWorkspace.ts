
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AssetService, UnifiedAsset } from '@/lib/services/AssetService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MediaTile } from '@/types/workspace';

export const useRealtimeWorkspace = () => {
  const queryClient = useQueryClient();
  const [deletingTiles, setDeletingTiles] = useState<Set<string>>(new Set());
  const [workspaceFilter, setWorkspaceFilter] = useState<Set<string>>(new Set());
  const processedUpdatesRef = useRef<Set<string>>(new Set());
  
  // Batching state for rapid completions
  const batchUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingBatchUpdatesRef = useRef<Set<string>>(new Set());
  
  // PHASE 2: Job tracking ref moved to top level (HOOKS RULE COMPLIANCE)
  const jobTrackingRef = useRef<Map<string, { timer: NodeJS.Timeout; assets: Set<string> }>>(new Map());
  
  // Get active workspace session first
  const { data: activeSession } = useQuery({
    queryKey: ['active-workspace-session'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await (supabase as any)
        .from('workspace_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch workspace items directly from workspace_items table
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['workspace-items', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) {
        console.log('🚀 No active workspace session found');
        return [];
      }
      
      console.log('🚀 Fetching workspace items for session:', activeSession.id);
      const { data, error } = await (supabase as any)
        .from('workspace_items')
        .select('*')
        .eq('session_id', activeSession.id)
        .eq('status', 'generated')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching workspace items:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!activeSession?.id,
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

  // Session storage is no longer needed as we use database sessions
  useEffect(() => {
    console.log('🔄 REALTIME: Using database-based workspace sessions');
  }, []);

  // No longer need to save to session storage - using database sessions

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
            table: 'workspace_items',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const workspaceItem = payload.new as any;
            const eventType = payload.eventType;
            
            if (eventType === 'INSERT' && workspaceItem.status === 'generated' && 
                !processedUpdatesRef.current.has(workspaceItem.id)) {
              
              console.log('🎉 Workspace item created:', workspaceItem.id, 'content_type:', workspaceItem.content_type);
              processedUpdatesRef.current.add(workspaceItem.id);
              
              // Invalidate workspace items query to refresh
              queryClient.invalidateQueries({ 
                queryKey: ['workspace-items'],
                exact: false 
              });
              
              // Dispatch completion event
              window.dispatchEvent(new CustomEvent('generation-completed', {
                detail: { 
                  assetId: workspaceItem.id, 
                  type: workspaceItem.content_type, 
                  status: 'completed'
                }
              }));
              
              setTimeout(() => processedUpdatesRef.current.delete(workspaceItem.id), 60000);
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

  // PHASE 2: Enhanced generation completion event system with job-level tracking
  useEffect(() => {
    
    const handleGenerationComplete = (event: CustomEvent) => {
      const { assetId, assetIds, type, jobId } = event.detail;
      
      if (type === 'batch' && assetIds) {
        console.log('🎉 PHASE 2: Batch generation completion event:', { assetIds, count: assetIds.length, jobId });
        toast.success(`${assetIds.length} new images completed!`);
      } else if (assetId) {
        console.log('🎉 PHASE 2: Single generation completion event:', { assetId, type, jobId });
        toast.success(`New ${type} completed!`);
      }
    };

    const handleBatchGenerationComplete = (event: CustomEvent) => {
      const { assetIds, type, jobId, totalCompleted, totalExpected } = event.detail;
      
      console.log('🎉 PHASE 2: Enhanced batch completion event:', {
        jobId,
        assetIds,
        totalCompleted,
        totalExpected,
        type
      });
      
      if (assetIds && assetIds.length > 0) {
        // Add all completed assets to workspace immediately
        setWorkspaceFilter(prev => {
          const newFilter = new Set(prev);
          assetIds.forEach((id: string) => newFilter.add(id));
          return newFilter;
        });
        
        // Invalidate cache to force refresh
        queryClient.invalidateQueries({ 
          queryKey: ['realtime-workspace-assets'],
          exact: false 
        });
        
        // Enhanced toast notification
        const message = totalCompleted === totalExpected 
          ? `All ${totalCompleted} images completed!`
          : `${totalCompleted}/${totalExpected} images completed!`;
        
        toast.success(message);
      }
    };

    const handleJobStatusUpdate = (event: CustomEvent) => {
      const { jobId, status, assetId, assetType } = event.detail;
      
      console.log('🔄 PHASE 2: Job status update received:', { jobId, status, assetId, assetType });
      
      if (status === 'completed' && assetId) {
        // Track job completion for coordination
        const tracking = jobTrackingRef.current.get(jobId) || { timer: null as any, assets: new Set() };
        tracking.assets.add(assetId);
        
        // Clear existing timer and set new one
        if (tracking.timer) {
          clearTimeout(tracking.timer);
        }
        
        // Wait a bit for all assets from this job to be processed
        tracking.timer = setTimeout(() => {
          const finalAssets = Array.from(tracking.assets);
          console.log('🎯 PHASE 2: Job completion timeout triggered:', {
            jobId,
            assetsCollected: finalAssets,
            assetCount: finalAssets.length
          });
          
          // Add all assets from this job to workspace
          if (finalAssets.length > 0) {
            setWorkspaceFilter(prev => {
              const newFilter = new Set(prev);
              finalAssets.forEach(id => newFilter.add(id));
              return newFilter;
            });
            
            queryClient.invalidateQueries({ 
              queryKey: ['realtime-workspace-assets'],
              exact: false 
            });
          }
          
          // Cleanup tracking
          jobTrackingRef.current.delete(jobId);
        }, 2000); // Wait 2 seconds for job completion coordination
        
        jobTrackingRef.current.set(jobId, tracking);
      }
    };

    // Set up all event listeners
    window.addEventListener('generation-completed', handleGenerationComplete as EventListener);
    window.addEventListener('generation-batch-completed', handleBatchGenerationComplete as EventListener);
    window.addEventListener('job-status-update', handleJobStatusUpdate as EventListener);
    
    return () => {
      // Cleanup all timers
      for (const [jobId, tracking] of jobTrackingRef.current) {
        if (tracking.timer) {
          clearTimeout(tracking.timer);
        }
      }
      jobTrackingRef.current.clear();
      
      // Remove event listeners
      window.removeEventListener('generation-completed', handleGenerationComplete as EventListener);
      window.removeEventListener('generation-batch-completed', handleBatchGenerationComplete as EventListener);
      window.removeEventListener('job-status-update', handleJobStatusUpdate as EventListener);
    };
  }, [queryClient]);

  // Helper function to safely convert seed values from scientific notation
  const convertSeedValue = (seedValue: any): number => {
    if (seedValue === null || seedValue === undefined) {
      console.log('🔍 SEED CONVERSION: Seed value is null/undefined:', seedValue);
      return 0; // Return 0 as default for missing seeds
    }
    
    if (typeof seedValue === 'number') {
      console.log('🔍 SEED CONVERSION: Seed is already a number:', seedValue);
      return seedValue;
    }
    
    if (typeof seedValue === 'string') {
      // Handle scientific notation strings like "1.752888178e+09"
      const parsed = parseFloat(seedValue);
      if (!isNaN(parsed)) {
        console.log('🔍 SEED CONVERSION: Converted string to number:', seedValue, '->', parsed);
        return Math.round(parsed); // Round to integer for display
      }
    }
    
    console.warn('🔍 SEED CONVERSION: Could not convert seed value:', seedValue, typeof seedValue);
    return 0; // Return 0 as fallback
  };

  // Transform workspace items to tiles
  const transformWorkspaceItemToTiles = useCallback((item: any): MediaTile[] => {
    console.log('🔄 TRANSFORM WORKSPACE ITEM TO TILES:', {
      itemId: item.id,
      contentType: item.content_type,
      url: item.url,
      rawSeed: item.seed,
      metadata: item.metadata
    });

    const tiles: MediaTile[] = [];
    const extractedSeed = convertSeedValue(item.seed);
    
    if (item.content_type === 'image' && item.url) {
      tiles.push({
        id: item.id,
        originalAssetId: item.id,
        type: 'image',
        url: item.url,
        prompt: item.prompt,
        timestamp: new Date(item.created_at),
        quality: (item.quality as 'fast' | 'high') || 'fast',
        modelType: item.model_type || 'sdxl',
        enhancedPrompt: item.enhanced_prompt,
        seed: extractedSeed,
        generationParams: {
          ...item.generation_params,
          ...item.metadata,
          seed: extractedSeed
        }
      });
    } else if (item.content_type === 'video' && item.url) {
      tiles.push({
        id: item.id,
        originalAssetId: item.id,
        type: 'video',
        url: item.url,
        prompt: item.prompt,
        timestamp: new Date(item.created_at),
        quality: (item.quality as 'fast' | 'high') || 'fast',
        duration: 5, // Default duration
        thumbnailUrl: item.thumbnail_url,
        enhancedPrompt: item.enhanced_prompt,
        seed: extractedSeed,
        generationParams: {
          ...item.generation_params,
          ...item.metadata,
          seed: extractedSeed
        }
      });
    }
    
    return tiles;
  }, []);

  // Optimized workspace tiles from workspace items
  const workspaceTiles = useCallback(() => {
    if (!assets || assets.length === 0) {
      return [];
    }
    
    const allTiles: MediaTile[] = [];
    assets.forEach(item => {
      const tiles = transformWorkspaceItemToTiles(item);
      allTiles.push(...tiles);
    });
    
    // Sort by timestamp descending (newest first)
    return allTiles.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [assets, transformWorkspaceItemToTiles]);

  // Add to workspace - now handled by backend automatically
  const addToWorkspace = useCallback((assetIds: string[]) => {
    console.log('➕ Assets automatically added to workspace via backend:', assetIds);
    // Refresh workspace items to show new additions
    queryClient.invalidateQueries({ 
      queryKey: ['workspace-items'],
      exact: false 
    });
  }, [queryClient]);

  // Import to workspace - would need to create workspace items
  const importToWorkspace = useCallback((importedAssets: UnifiedAsset[]) => {
    console.log('🔄 Import to workspace not yet implemented for workspace_items');
    // TODO: Implement workspace item creation for imported assets
    toast.success(`Import feature coming soon`);
  }, []);

  // Clear workspace - delete all items in current session
  const clearWorkspace = useCallback(async () => {
    if (!activeSession?.id) return;
    
    try {
      const { error } = await (supabase as any)
        .from('workspace_items')
        .delete()
        .eq('session_id', activeSession.id);
      
      if (error) throw error;
      
      // Refresh workspace items
      queryClient.invalidateQueries({ 
        queryKey: ['workspace-items'],
        exact: false 
      });
      
      toast.success('Workspace cleared');
    } catch (error) {
      console.error('❌ Error clearing workspace:', error);
      toast.error('Failed to clear workspace');
    }
  }, [activeSession?.id, queryClient]);

  // Delete tile - delete workspace item
  const deleteTile = useCallback(async (tile: MediaTile) => {
    if (deletingTiles.has(tile.id)) return;
    
    console.log('🗑️ Starting workspace item deletion:', tile.id);
    
    try {
      setDeletingTiles(prev => new Set([...prev, tile.id]));
      
      // Delete workspace item
      const { error } = await (supabase as any)
        .from('workspace_items')
        .delete()
        .eq('id', tile.id);
      
      if (error) throw error;
      
      // Refresh workspace items
      queryClient.invalidateQueries({ 
        queryKey: ['workspace-items'],
        exact: false 
      });
      
      toast.success(`${tile.type === 'image' ? 'Image' : 'Video'} deleted successfully`);
      
    } catch (error) {
      console.error('❌ Workspace deletion failed:', error);
      
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
  }, [deletingTiles, queryClient]);

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
