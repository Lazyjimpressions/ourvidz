
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WorkspaceAssetService, type UnifiedWorkspaceAsset } from '@/lib/services/WorkspaceAssetService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const WORKSPACE_ASSETS_QUERY_KEY = ['workspace-assets'];

/**
 * Hook for fetching workspace assets
 */
export function useWorkspaceAssets() {
  return useQuery({
    queryKey: WORKSPACE_ASSETS_QUERY_KEY,
    queryFn: WorkspaceAssetService.getUserWorkspaceAssets,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2
  });
}

/**
 * Hook for generating signed URLs for workspace assets
 */
export function useWorkspaceAssetUrl(asset: UnifiedWorkspaceAsset | null) {
  return useQuery({
    queryKey: ['workspace-asset-url', asset?.id],
    queryFn: async () => {
      if (!asset) return null;
      
      // Get the raw workspace asset data
      const { data: workspaceAsset } = await supabase
        .from('workspace_assets')
        .select('*')
        .eq('id', asset.id)
        .single();
      
      if (!workspaceAsset) return null;
      
      return WorkspaceAssetService.generateSignedUrl(workspaceAsset);
    },
    enabled: !!asset,
    staleTime: 300000, // 5 minutes
    gcTime: 600000 // 10 minutes
  });
}

/**
 * Hook for saving workspace asset to library
 */
export function useSaveToLibrary() {
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
    }) => WorkspaceAssetService.saveToLibrary(assetId, options),
    onSuccess: () => {
      // Invalidate both workspace and library queries
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
export function useDiscardAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (assetId: string) => WorkspaceAssetService.discardAsset(assetId),
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
 * Hook for invalidating workspace assets cache
 */
export function useInvalidateWorkspaceAssets() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: WORKSPACE_ASSETS_QUERY_KEY });
  };
}

/**
 * Hook for real-time workspace updates
 */
export function useWorkspaceRealtimeUpdates() {
  const queryClient = useQueryClient();
  
  // Listen for generation completion events
  useEffect(() => {
    const handleGenerationComplete = (event: CustomEvent) => {
      console.log('🔄 Generation complete event received, refreshing workspace');
      queryClient.invalidateQueries({ queryKey: WORKSPACE_ASSETS_QUERY_KEY });
    };

    window.addEventListener('generation-completed', handleGenerationComplete as EventListener);
    
    return () => {
      window.removeEventListener('generation-completed', handleGenerationComplete as EventListener);
    };
  }, [queryClient]);
}
