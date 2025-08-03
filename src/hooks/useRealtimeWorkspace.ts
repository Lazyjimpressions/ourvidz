
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AssetService, UnifiedAsset } from '@/lib/services/AssetService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MediaTile } from '@/types/workspace';

// ✅ FIX: Standardized query keys for workspace consistency
const WORKSPACE_QUERY_KEYS = {
  ITEMS: ['workspace-items-all'],
  ASSETS: ['workspace-assets'], 
  MEDIA_GRID: ['media-grid-workspace-assets']
} as const;

// ✅ ADD: Coordinated invalidation system
const createWorkspaceInvalidator = (queryClient: any) => {
  return () => {
    console.log('🔄 COORDINATED INVALIDATION: Invalidating all workspace queries');
    
    queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_KEYS.ITEMS });
    queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_KEYS.ASSETS });
    queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_KEYS.MEDIA_GRID });
    
    console.log('✅ All workspace queries invalidated');
  };
};

/**
 * Unified real-time workspace hook with session storage based architecture
 * Provides coordinated query invalidation and real-time workspace updates
 * 
 * @returns {Object} Workspace state and actions
 * @returns {MediaTile[]} returns.workspaceTiles - Current workspace items as media tiles
 * @returns {boolean} returns.isLoading - Loading state for workspace data
 * @returns {Function} returns.addToWorkspace - Add asset to workspace
 * @returns {Function} returns.clearWorkspace - Clear all workspace items
 * @returns {Function} returns.deleteTile - Delete specific workspace item
 */
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
  
  // ✅ ADD: Coordinated invalidation function
  const invalidateWorkspaceQueries = useCallback(createWorkspaceInvalidator(queryClient), [queryClient]);
  
  /**
   * Get active workspace session for the current user
   * Creates session storage based workspace management
   */
  const { data: activeSession, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ['active-workspace-session'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('🚀 DEBUG: No authenticated user found');
        return null;
      }
      
      console.log('🚀 DEBUG: Fetching active workspace session for user:', user.id);
      const { data, error } = await (supabase as any)
        .from('workspace_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) {
        console.error('🚀 DEBUG: Error fetching workspace session:', error);
        return null;
      }
      
      console.log('🚀 DEBUG: Active workspace session:', data);
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Debug session state
  useEffect(() => {
    console.log('🚀 DEBUG: Session state changed:', {
      sessionLoading,
      sessionError,
      activeSession,
      hasSession: !!activeSession?.id
    });
  }, [activeSession, sessionLoading, sessionError]);

  /**
   * Fetch all workspace items for the current user
   * Uses unified query keys for consistent data access
   */
  const { data: assets = [], isLoading: itemsLoading, error: itemsError } = useQuery({
    queryKey: WORKSPACE_QUERY_KEYS.ITEMS,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('🚀 DEBUG: No authenticated user for items query');
        return [];
      }
      
      console.log('🚀 DEBUG: Fetching ALL workspace items for user:', user.id);
      const { data, error } = await (supabase as any)
        .from('workspace_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'generated')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ DEBUG: Error fetching workspace items:', error);
        return [];
      }
      
      // ✅ ADD: Comprehensive data verification logging
      console.log('🚀 DEBUG: ALL workspace items fetched:', {
        count: data?.length || 0,
        userId: user.id,
        items: data?.map((item: any) => ({
          id: item.id,
          session_id: item.session_id,
          content_type: item.content_type,
          url: item.url ? 'has_url' : 'no_url',
          prompt: item.prompt?.substring(0, 30) + '...'
        }))
      });
      
      // ✅ ADD: Data verification summary
      console.log('🔍 WORKSPACE DATA VERIFICATION:', {
        totalItems: data?.length || 0,
        itemsWithUrls: data?.filter((item: any) => item.url)?.length || 0,
        itemsWithoutUrls: data?.filter((item: any) => !item.url)?.length || 0,
        sessionId: activeSession?.id,
        userId: user.id,
        contentTypes: data?.reduce((acc: any, item: any) => {
          acc[item.content_type] = (acc[item.content_type] || 0) + 1;
          return acc;
        }, {}) || {}
      });
      
      return data || [];
    },
    enabled: !sessionLoading,
    // Reduce cache time for debugging
    staleTime: 30 * 1000, // 30 seconds for debugging
    gcTime: 5 * 60 * 1000, // 5 minutes for debugging
    refetchOnWindowFocus: true, // Enable for debugging
    refetchOnMount: true, // Enable for debugging
    refetchInterval: false, // No polling - use realtime instead
    // Retry strategy for failed requests
    retry: (failureCount, error) => {
      console.log('🔄 Retry attempt:', failureCount, 'for workspace items query');
      return failureCount < 3;
    }
  });

  // Debug assets state
  useEffect(() => {
    console.log('🚀 DEBUG: Assets state changed:', {
      itemsLoading,
      itemsError,
      assetsCount: assets.length,
      sessionId: activeSession?.id,
      assets: assets.slice(0, 3).map((item: any) => ({
        id: item.id,
        content_type: item.content_type,
        url: item.url ? 'has_url' : 'no_url'
      }))
    });
  }, [assets, itemsLoading, itemsError, activeSession?.id]);

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
          
          // ✅ FIX: Use coordinated invalidation for all workspace queries
          invalidateWorkspaceQueries();
          
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
              
              // ✅ FIX: Use coordinated invalidation for all workspace queries
              console.log('🔄 QUERY INVALIDATION: Workspace item inserted, invalidating queries');
              invalidateWorkspaceQueries();
              
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
              
              // ✅ FIX: Use coordinated invalidation for all workspace queries
              console.log('🔄 QUERY INVALIDATION: Video completed, invalidating queries');
              invalidateWorkspaceQueries();
              
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
              
              // ✅ FIX: For job completion, trigger coordinated refresh with delay
              if (job.status === 'completed') {
                setTimeout(() => {
                  console.log('🔄 QUERY INVALIDATION: Job completed, invalidating queries');
                  invalidateWorkspaceQueries();
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
        
        // ✅ FIX: Use coordinated invalidation for all workspace queries
        console.log('🔄 QUERY INVALIDATION: Batch generation completed, invalidating queries');
        invalidateWorkspaceQueries();
        
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
            
            console.log('🔄 QUERY INVALIDATION: Job status update completed, invalidating queries');
            invalidateWorkspaceQueries();
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

  // ✅ ENHANCE: Helper function to safely convert seed values with better error handling
  const convertSeedValue = (seedValue: any): number => {
    if (seedValue === null || seedValue === undefined) {
      console.log('🔍 SEED CONVERSION: Seed value is null/undefined, using 0');
      return 0;
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

  // ✅ ENHANCE: Transform workspace items to tiles with comprehensive validation
  const transformWorkspaceItemToTiles = useCallback((item: any): MediaTile[] => {
    // ✅ ADD: Comprehensive validation
    if (!item || !item.id) {
      console.warn('⚠️ Invalid workspace item:', item);
      return [];
    }
    
    if (!item.url) {
      console.warn('⚠️ Workspace item missing URL:', item.id);
      return [];
    }
    
    console.log('🔄 TRANSFORM WORKSPACE ITEM TO TILES:', {
      itemId: item.id,
      contentType: item.content_type,
      url: item.url ? 'has_url' : 'no_url',
      rawSeed: item.seed,
      hasMetadata: !!item.metadata
    });

    const tiles: MediaTile[] = [];
    const extractedSeed = convertSeedValue(item.seed);
    
    // ✅ ADD: Safe metadata parsing
    let safeMetadata = {};
    try {
      safeMetadata = item.metadata ? 
        (typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata) : 
        {};
    } catch (error) {
      console.warn('⚠️ Failed to parse metadata for item:', item.id, error);
      safeMetadata = {};
    }
    
    if (item.content_type === 'image' && item.url) {
      tiles.push({
        id: item.id,
        originalAssetId: item.id,
        type: 'image',
        url: item.url,
        prompt: item.prompt || '',
        timestamp: new Date(item.created_at),
        quality: (item.quality as 'fast' | 'high') || 'fast',
        modelType: item.model_type || 'sdxl',
        enhancedPrompt: item.enhanced_prompt || '',
        seed: extractedSeed,
        generationParams: {
          ...item.generation_params,
          ...safeMetadata,
          seed: extractedSeed
        }
      });
    } else if (item.content_type === 'video' && item.url) {
      tiles.push({
        id: item.id,
        originalAssetId: item.id,
        type: 'video',
        url: item.url,
        prompt: item.prompt || '',
        timestamp: new Date(item.created_at),
        quality: (item.quality as 'fast' | 'high') || 'fast',
        duration: 5, // Default duration
        thumbnailUrl: item.thumbnail_url || '',
        enhancedPrompt: item.enhanced_prompt || '',
        seed: extractedSeed,
        generationParams: {
          ...item.generation_params,
          ...safeMetadata,
          seed: extractedSeed
        }
      });
    }
    
    console.log('✅ Generated tiles for item:', item.id, 'tile count:', tiles.length);
    return tiles;
  }, []);

  // ✅ ENHANCE: Optimized workspace tiles from workspace items with comprehensive logging
  const workspaceTiles = useCallback(() => {
    console.log('🎬 WORKSPACE TILES PROCESSING:', {
      totalAssets: assets?.length || 0,
      sessionId: activeSession?.id,
      timestamp: new Date().toISOString()
    });
    
    if (!assets || assets.length === 0) {
      console.log('📭 No workspace assets available');
      return [];
    }
    
    const allTiles: MediaTile[] = [];
    let processedCount = 0;
    let errorCount = 0;
    
    assets.forEach(item => {
      try {
        const tiles = transformWorkspaceItemToTiles(item);
        allTiles.push(...tiles);
        processedCount++;
      } catch (error) {
        console.error('❌ Error processing workspace item:', item.id, error);
        errorCount++;
      }
    });
    
    console.log('🎯 FINAL WORKSPACE TILES:', {
      totalItems: assets.length,
      processedCount,
      errorCount,
      tileCount: allTiles.length,
      tileTypes: allTiles.reduce((acc, tile) => {
        acc[tile.type] = (acc[tile.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });
    
    // Sort by timestamp descending (newest first)
    return allTiles.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [assets, transformWorkspaceItemToTiles, activeSession?.id]);

  // Add to workspace - now handled by backend automatically
  const addToWorkspace = useCallback((assetIds: string[]) => {
    console.log('➕ Assets automatically added to workspace via backend:', assetIds);
    // ✅ FIX: Use coordinated invalidation for all workspace queries
    console.log('🔄 QUERY INVALIDATION: Adding to workspace, invalidating queries');
    invalidateWorkspaceQueries();
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
      
      // ✅ FIX: Use coordinated invalidation for all workspace queries
      console.log('🔄 QUERY INVALIDATION: Clearing workspace, invalidating queries');
      invalidateWorkspaceQueries();
      
      toast.success('Workspace cleared');
    } catch (error) {
      console.error('❌ Error clearing workspace:', error);
      toast.error('Failed to clear workspace');
    }
  }, [activeSession?.id, invalidateWorkspaceQueries]);

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
      
      // ✅ FIX: Use coordinated invalidation for all workspace queries
      console.log('🔄 QUERY INVALIDATION: Deleting tile, invalidating queries');
      invalidateWorkspaceQueries();
      
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
  }, [deletingTiles, invalidateWorkspaceQueries]);

  return {
    tiles: workspaceTiles(),
    isLoading: sessionLoading || itemsLoading,
    deletingTiles,
    addToWorkspace,
    importToWorkspace,
    clearWorkspace,
    deleteTile
  };
};
