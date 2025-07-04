import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AssetService, UnifiedAsset } from '@/lib/services/AssetService';
import { useToast } from '@/hooks/use-toast';

export const ASSETS_QUERY_KEY = ['assets'] as const;

export const useAssets = () => {
  const { toast } = useToast();

  return useQuery({
    queryKey: ASSETS_QUERY_KEY,
    queryFn: async (): Promise<UnifiedAsset[]> => {
      try {
        console.log('🔄 React Query: Fetching assets...');
        const assets = await AssetService.getUserAssets();
        console.log('✅ React Query: Assets fetched:', assets.length);
        return assets;
      } catch (error) {
        console.error('❌ React Query: Failed to fetch assets:', error);
        toast({
          title: "Failed to load media",
          description: "Unable to load your content. Please try refreshing.",
          variant: "destructive",
        });
        throw error;
      }
    },
    staleTime: 1000, // Consider data stale after 1 second
    gcTime: 30000, // Keep in cache for 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
};

export const useInvalidateAssets = () => {
  const queryClient = useQueryClient();
  
  return () => {
    console.log('🔄 React Query: Invalidating assets cache');
    queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY });
  };
};