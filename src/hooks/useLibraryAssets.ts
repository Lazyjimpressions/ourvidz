import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { LibraryAssetService, type UnifiedLibraryAsset, type UserCollection } from '@/lib/services/LibraryAssetService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const LIBRARY_ASSETS_QUERY_KEY = ['library-assets'];
const COLLECTIONS_QUERY_KEY = ['user-collections'];

const PAGE_SIZE = 40;

/**
 * Hook for fetching library assets with infinite scroll pagination
 */
export function useLibraryAssets() {
  return useInfiniteQuery({
    queryKey: LIBRARY_ASSETS_QUERY_KEY,
    queryFn: ({ pageParam = 0 }) =>
      LibraryAssetService.getUserLibraryAssets(PAGE_SIZE, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, p) => n + p.assets.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    initialPageParam: 0,
    staleTime: 60000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    retry: 2
  });
}

/**
 * Hook for generating signed URLs for library assets
 */
export function useLibraryAssetUrl(asset: UnifiedLibraryAsset | null) {
  return useQuery({
    queryKey: ['library-asset-url', asset?.id],
    queryFn: async () => {
      if (!asset) return null;
      
      const { data: libraryAsset } = await supabase
        .from('user_library')
        .select('*')
        .eq('id', asset.id)
        .maybeSingle();
      
      if (!libraryAsset) return null;
      
      return LibraryAssetService.generateSignedUrl(libraryAsset);
    },
    enabled: !!asset,
    staleTime: 300000,
    gcTime: 600000
  });
}

/**
 * Hook for updating library asset
 */
export function useUpdateLibraryAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      assetId,
      updates
    }: {
      assetId: string;
      updates: {
        custom_title?: string;
        tags?: string[];
        is_favorite?: boolean;
        collection_id?: string;
      };
    }) => LibraryAssetService.updateAsset(assetId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIBRARY_ASSETS_QUERY_KEY });
      toast.success('Asset updated');
    },
    onError: (error) => {
      console.error('Error updating asset:', error);
      toast.error('Failed to update asset');
    }
  });
}

/**
 * Hook for deleting library asset
 */
export function useDeleteLibraryAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (assetId: string) => LibraryAssetService.deleteAsset(assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIBRARY_ASSETS_QUERY_KEY });
      toast.success('Asset deleted');
    },
    onError: (error) => {
      console.error('Error deleting asset:', error);
      toast.error('Failed to delete asset');
    }
  });
}

/**
 * Hook for fetching user collections
 */
export function useUserCollections() {
  return useQuery({
    queryKey: COLLECTIONS_QUERY_KEY,
    queryFn: LibraryAssetService.getUserCollections,
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false
  });
}

/**
 * Hook for creating new collection
 */
export function useCreateCollection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) => 
      LibraryAssetService.createCollection(name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
      toast.success('Collection created');
    },
    onError: (error) => {
      console.error('Error creating collection:', error);
      toast.error('Failed to create collection');
    }
  });
}
