
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AssetService, UnifiedAsset } from '@/lib/services/AssetService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MediaTile, WorkspaceReferenceImage } from '@/types/workspace';

export const useRealtimeWorkspace = () => {
  const queryClient = useQueryClient();
  const [deletingTiles, setDeletingTiles] = useState<Set<string>>(new Set());
  const [workspaceFilter, setWorkspaceFilter] = useState<Set<string>>(new Set());
  const [referenceImages, setReferenceImages] = useState<WorkspaceReferenceImage[]>([]);
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
    staleTime: 4 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
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
      const referenceImagesKey = `workspaceReferenceImages_${user.id}`;
      
      const storedFilter = sessionStorage.getItem(userScopedKey);
      const storedReferenceImages = sessionStorage.getItem(referenceImagesKey);
      
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
      
      if (storedReferenceImages) {
        try {
          const referenceImagesArray = JSON.parse(storedReferenceImages);
          if (Array.isArray(referenceImagesArray) && referenceImagesArray.length > 0) {
            setReferenceImages(referenceImagesArray.map(img => ({
              ...img,
              timestamp: new Date(img.timestamp)
            })));
            console.log('✅ REALTIME: Restored', referenceImagesArray.length, 'reference images');
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse stored reference images:', error);
        }
      }
    };
    
    restoreWorkspace();
  }, []);

  // Save workspace filter and reference images to session storage whenever they change
  useEffect(() => {
    const saveWorkspace = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const userScopedKey = `workspaceFilter_${user.id}`;
      const referenceImagesKey = `workspaceReferenceImages_${user.id}`;
      
      sessionStorage.setItem(userScopedKey, JSON.stringify(Array.from(workspaceFilter)));
      sessionStorage.setItem(referenceImagesKey, JSON.stringify(referenceImages));
    };
    
    if (workspaceFilter.size > 0 || referenceImages.length > 0) {
      saveWorkspace();
    }
  }, [workspaceFilter, referenceImages]);

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

  // Helper function to safely convert seed values from scientific notation
  const convertSeedValue = (seedValue: any): number => {
    if (seedValue === null || seedValue === undefined) {
      console.log('🔍 SEED CONVERSION: Seed value is null/undefined:', seedValue);
      return 0;
    }
    
    if (typeof seedValue === 'number') {
      console.log('🔍 SEED CONVERSION: Seed is already a number:', seedValue);
      return seedValue;
    }
    
    if (typeof seedValue === 'string') {
      const parsed = parseFloat(seedValue);
      if (!isNaN(parsed)) {
        console.log('🔍 SEED CONVERSION: Converted string to number:', seedValue, '->', parsed);
        return Math.round(parsed);
      }
    }
    
    console.warn('🔍 SEED CONVERSION: Could not convert seed value:', seedValue, typeof seedValue);
    return 0;
  };

  // Transform assets to tiles - FIXED: Proper seed extraction and conversion
  const transformAssetToTiles = useCallback((asset: UnifiedAsset): MediaTile[] => {
    console.log('🔄 TRANSFORM ASSET TO TILES:', {
      assetId: asset.id,
      type: asset.type,
      rawMetadata: asset.metadata,
      metadataKeys: asset.metadata ? Object.keys(asset.metadata) : null,
      rawSeed: asset.metadata?.seed,
      seedType: typeof asset.metadata?.seed
    });

    const tiles: MediaTile[] = [];
    
    if (asset.type === 'image') {
      if (asset.url) {
        const extractedSeed = convertSeedValue(asset.metadata?.seed);
        
        console.log('🎯 SEED EXTRACTION FOR IMAGE:', {
          assetId: asset.id,
          rawSeed: asset.metadata?.seed,
          extractedSeed,
          generationTime: asset.metadata?.generation_time,
          negativePrompt: asset.metadata?.negative_prompt
        });

        tiles.push({
          id: asset.id,
          originalAssetId: asset.id,
          type: 'image',
          url: asset.url,
          prompt: asset.prompt,
          timestamp: asset.createdAt,
          quality: (asset.quality as 'fast' | 'high') || 'fast',
          modelType: asset.metadata?.job_type || asset.modelType,
          enhancedPrompt: asset.enhancedPrompt,
          seed: extractedSeed,
          generationParams: {
            ...asset.metadata,
            seed: extractedSeed,
            generation_time: asset.metadata?.generation_time,
            negative_prompt: asset.metadata?.negative_prompt,
            reference_strength: asset.metadata?.reference_strength
          }
        });
      }
    } else if (asset.type === 'video' && asset.url) {
      const extractedSeed = convertSeedValue(asset.metadata?.seed);
      
      console.log('🎯 SEED EXTRACTION FOR VIDEO:', {
        assetId: asset.id,
        rawSeed: asset.metadata?.seed,
        extractedSeed
      });

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
        seed: extractedSeed,
        generationParams: {
          ...asset.metadata,
          seed: extractedSeed
        }
      });
    }
    
    return tiles;
  }, []);

  // Transform reference images to tiles
  const transformReferenceImageToTiles = useCallback((refImage: WorkspaceReferenceImage): MediaTile => {
    return {
      id: refImage.id,
      originalAssetId: refImage.id,
      type: 'image',
      url: refImage.url,
      prompt: refImage.prompt,
      timestamp: refImage.timestamp,
      quality: refImage.quality,
      modelType: refImage.modelType,
      enhancedPrompt: refImage.enhancedPrompt,
      seed: refImage.seed,
      generationParams: refImage.generationParams,
      isReferenceImage: true
    };
  }, []);

  // Optimized workspace tiles with enhanced caching
  const workspaceTiles = useCallback(() => {
    const completedAssets = assets.filter(asset => 
      asset.status === 'completed' && asset.url
    );
    
    const allTiles: MediaTile[] = [];
    
    // Add database assets
    completedAssets.forEach(asset => {
      const tiles = transformAssetToTiles(asset);
      allTiles.push(...tiles);
    });
    
    // Add reference images
    referenceImages.forEach(refImage => {
      const tile = transformReferenceImageToTiles(refImage);
      allTiles.push(tile);
    });
    
    // Sort by timestamp descending (newest first)
    return allTiles.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [assets, referenceImages, transformAssetToTiles, transformReferenceImageToTiles]);

  // Add to workspace - handles both database assets and reference images
  const addToWorkspace = useCallback((assetIds: string[]) => {
    console.log('➕ Adding assets to workspace:', assetIds);
    const dbAssetIds = assetIds.filter(id => !id.startsWith('ref_'));
    
    if (dbAssetIds.length > 0) {
      setWorkspaceFilter(prev => {
        const newFilter = new Set(prev);
        dbAssetIds.forEach(id => newFilter.add(id));
        return newFilter;
      });
    }
  }, []);

  // Import to workspace - handles both database assets and reference images
  const importToWorkspace = useCallback((importedAssets: UnifiedAsset[]) => {
    console.log('🔄 Adding imported assets to workspace:', importedAssets.length);
    
    const dbAssets = importedAssets.filter(asset => !asset.id.startsWith('ref_'));
    const refImages = importedAssets.filter(asset => asset.id.startsWith('ref_'));
    
    // Add database assets to workspace filter
    if (dbAssets.length > 0) {
      const newFilterIds = dbAssets.map(asset => asset.id);
      const newFilter = new Set([...workspaceFilter, ...newFilterIds]);
      setWorkspaceFilter(newFilter);
    }
    
    // Add reference images to reference images state
    if (refImages.length > 0) {
      const newReferenceImages = refImages.map(asset => ({
        id: asset.id,
        url: asset.url || '',
        prompt: asset.prompt,
        timestamp: asset.createdAt,
        quality: (asset.quality as 'fast' | 'high') || 'fast',
        modelType: asset.modelType,
        enhancedPrompt: asset.enhancedPrompt,
        seed: asset.metadata?.seed || 0,
        generationParams: asset.metadata
      }));
      
      setReferenceImages(prev => [...prev, ...newReferenceImages]);
    }
    
    toast.success(`Added ${importedAssets.length} asset${importedAssets.length !== 1 ? 's' : ''} to workspace`);
  }, [workspaceFilter]);

  // Clear workspace with user-scoped session management
  const clearWorkspace = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    setWorkspaceFilter(new Set());
    setReferenceImages([]);
    
    if (user) {
      const userScopedKey = `workspaceFilter_${user.id}`;
      const referenceImagesKey = `workspaceReferenceImages_${user.id}`;
      const sessionStartKey = `workspaceSessionStart_${user.id}`;
      
      sessionStorage.removeItem(userScopedKey);
      sessionStorage.removeItem(referenceImagesKey);
      sessionStorage.setItem(sessionStartKey, Date.now().toString());
      console.log('🔄 Cleared workspace and reset session for user:', user.id);
    }
    
    toast.success('Workspace cleared');
  }, []);

  // Delete tile - handles both database assets and reference images
  const deleteTile = useCallback(async (tile: MediaTile) => {
    if (deletingTiles.has(tile.id)) return;
    
    console.log('🗑️ Starting workspace tile deletion:', tile.id);
    
    try {
      setDeletingTiles(prev => new Set([...prev, tile.id]));
      
      if (tile.isReferenceImage) {
        // Remove reference image from state
        setReferenceImages(prev => prev.filter(img => img.id !== tile.id));
        toast.success('Reference image removed from workspace');
      } else {
        // Remove from workspace filter first (optimistic update)
        setWorkspaceFilter(prev => {
          const newFilter = new Set(prev);
          newFilter.delete(tile.originalAssetId);
          return newFilter;
        });
        
        // Actual deletion from database
        await AssetService.deleteAsset(tile.originalAssetId, tile.type);
        toast.success(`${tile.type === 'image' ? 'Image' : 'Video'} deleted successfully`);
      }
      
    } catch (error) {
      console.error('❌ Workspace deletion failed:', error);
      
      if (!tile.isReferenceImage) {
        // Restore to workspace filter on error
        setWorkspaceFilter(prev => new Set([...prev, tile.originalAssetId]));
      }
      
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
