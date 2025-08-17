import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWorkspaceAssets } from './useWorkspaceAssets';
import type { MediaTile } from '@/types/workspace';
import { WorkspaceAssetService } from '@/lib/services/WorkspaceAssetService';

/**
 * Hook for real-time workspace updates and state
 */
export function useRealtimeWorkspace() {
  const queryClient = useQueryClient();

  // Fetch assets
  const { data: assets = [], isLoading } = useWorkspaceAssets();

  // Local UI state for actions
  const [deletingTiles, setDeletingTiles] = useState<Set<string>>(new Set());
  
  // Signed URL cache for tiles
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());

  // Build tiles for the UI
  const tiles: MediaTile[] = useMemo(() => {
    return assets.map((asset, idx) => ({
      id: asset.id,
      originalAssetId: asset.id,
      type: asset.assetType,
      url: signedUrls.get(asset.id), // Use signed URL from cache
      prompt: asset.originalPrompt,
      timestamp: new Date(asset.createdAt),
      quality: 'high',
      modelType: asset.modelUsed,
      duration: asset.durationSeconds,
      thumbnailUrl: undefined,
      isUrlLoaded: false,
      isVisible: true,
      virtualIndex: idx,
      enhancedPrompt: undefined,
      seed: asset.generationSeed,
      generationParams: asset.generationSettings
    }));
  }, [assets, signedUrls]);

  // Generate signed URLs for workspace assets
  useEffect(() => {
    let mounted = true;
    
    const generateUrls = async () => {
      const newUrls = new Map<string, string>();
      
      for (const asset of assets) {
        if (!signedUrls.has(asset.id)) {
          try {
            const signedUrl = await WorkspaceAssetService.generateSignedUrl({
              id: asset.id,
              temp_storage_path: asset.tempStoragePath
            });
            if (signedUrl && mounted) {
              newUrls.set(asset.id, signedUrl);
            }
          } catch (error) {
            console.error('Failed to generate signed URL for asset:', asset.id, error);
          }
        }
      }
      
      if (mounted && newUrls.size > 0) {
        setSignedUrls(prev => new Map([...prev, ...newUrls]));
      }
    };

    if (assets.length > 0) {
      generateUrls();
    }

    return () => {
      mounted = false;
    };
  }, [assets, signedUrls]);

  const deleteTile = useCallback(async (tile: MediaTile) => {
    setDeletingTiles(prev => new Set(prev).add(tile.id));
    try {
      await WorkspaceAssetService.discardAsset(tile.id);
      queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
      toast.success('Asset discarded');
    } catch (error) {
      console.error('Error discarding asset:', error);
      toast.error('Failed to discard asset');
    } finally {
      setDeletingTiles(prev => {
        const next = new Set(prev);
        next.delete(tile.id);
        return next;
      });
    }
  }, [queryClient]);

  const clearWorkspace = useCallback(async () => {
    if (assets.length === 0) return;
    setDeletingTiles(new Set(assets.map(a => a.id)));
    try {
      await Promise.all(assets.map(a => WorkspaceAssetService.discardAsset(a.id)));
      queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
      toast.success('Workspace cleared');
    } catch (error) {
      console.error('Error clearing workspace:', error);
      toast.error('Failed to clear workspace');
    } finally {
      setDeletingTiles(new Set());
    }
  }, [assets, queryClient]);

  const addToWorkspace = useCallback((assetIds: string[]) => {
    console.log('ℹ️ Import to workspace requested (not yet implemented):', assetIds);
    toast.message('Import from library coming soon');
  }, []);

  // Keep existing real-time subscriptions (refresh query on inserts and job failures)
  useEffect(() => {
    console.log('🔄 Setting up real-time workspace updates');

    // Listen to workspace_assets table changes
    const channel = supabase
      .channel('workspace-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workspace_assets'
        },
        (payload) => {
          console.log('🔄 New workspace asset detected:', payload.new);
          
          // Invalidate workspace assets query to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
          
          // Show success notification
          const asset = payload.new as any;
          if (asset.asset_type === 'image') {
            toast.success('New images generated!', {
              description: 'Your SDXL images are now available in the workspace'
            });
          } else {
            toast.success('New video generated!', {
              description: 'Your video is now available in the workspace'
            });
          }

          // Note: Legacy custom event dispatch removed - relying on Supabase Realtime only
        }
      )
      .subscribe();

    // Listen for job status updates
    const jobChannel = supabase
      .channel('jobs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs'
        },
        (payload) => {
          const job = payload.new as any;
          console.log('🔄 Job status update:', job.status, job.id);
          
          if (job.status === 'failed') {
            toast.error('Generation failed', {
              description: job.error_message || 'Unknown error occurred'
            });
          } else if (job.status === 'completed') {
            // Resilient fallback: invalidate workspace assets immediately and after 1s
            console.log('🔄 Job completed, invalidating workspace assets as fallback');
            queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
            
            // Second invalidation after 1s to handle any lag
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
            }, 1000);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up real-time workspace subscriptions');
      supabase.removeChannel(channel);
      supabase.removeChannel(jobChannel);
    };
  }, [queryClient]);

  return {
    tiles,
    isLoading: !!isLoading,
    deletingTiles,
    addToWorkspace,
    clearWorkspace,
    deleteTile,
  };
}
