
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NewWorkspaceAssetService, type WorkspaceAsset } from '@/lib/services/NewWorkspaceAssetService';
import { toast } from 'sonner';

const WORKSPACE_ASSETS_QUERY_KEY = ['new-workspace-assets'];

/**
 * Hook for fetching workspace assets (new architecture)
 */
export function useNewWorkspaceAssets() {
  return useQuery({
    queryKey: WORKSPACE_ASSETS_QUERY_KEY,
    queryFn: NewWorkspaceAssetService.getUserWorkspaceAssets,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2
  });
}

/**
 * Hook for generating signed URLs for workspace assets
 */
export function useNewWorkspaceAssetUrl(asset: WorkspaceAsset | null) {
  return useQuery({
    queryKey: ['new-workspace-asset-url', asset?.id],
    queryFn: async () => {
      if (!asset) return null;
      return NewWorkspaceAssetService.generateSignedUrl(asset);
    },
    enabled: !!asset,
    staleTime: 300000, // 5 minutes
    gcTime: 600000 // 10 minutes
  });
}

/**
 * Hook for saving workspace asset to library
 */
export function useNewSaveToLibrary() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      assetId,
      options
    }: {
      assetId: string;
      options?: {
        customTitle?: string;
        collectionId?: string;
        tags?: string[];
      };
    }) => NewWorkspaceAssetService.saveToLibrary(assetId, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACE_ASSETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['library-assets'] });
      toast.success('Asset saved to library');
    },
    onError: (error) => {
      console.error('Error saving to library:', error);
      toast.error('Failed to save asset to library');
    }
  });
}

/**
 * Hook for discarding workspace asset
 */
export function useNewDiscardAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (assetId: string) => NewWorkspaceAssetService.discardAsset(assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACE_ASSETS_QUERY_KEY });
      toast.success('Asset discarded');
    },
    onError: (error) => {
      console.error('Error discarding asset:', error);
      toast.error('Failed to discard asset');
    }
  });
}

/**
 * Hook for queueing generation jobs
 */
export function useNewQueueJob() {
  return useMutation({
    mutationFn: NewWorkspaceAssetService.queueJob,
    onSuccess: (data) => {
      toast.success(`Job queued successfully (${data.queueName})`);
    },
    onError: (error) => {
      console.error('Error queueing job:', error);
      toast.error('Failed to queue job');
    }
  });
}

/**
 * Hook for getting system metrics (admin only)
 */
export function useNewSystemMetrics() {
  return useQuery({
    queryKey: ['new-system-metrics'],
    queryFn: NewWorkspaceAssetService.getSystemMetrics,
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 5000, // 5 seconds
    retry: 2
  });
}
