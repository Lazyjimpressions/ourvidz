import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AssetService, UnifiedAsset } from '@/lib/services/AssetService';
import { useToast } from '@/hooks/use-toast';

export const ASSETS_QUERY_KEY = ['assets'] as const;

export const useAssets = (sessionOnly: boolean = true) => {
  const { toast } = useToast();

  return useQuery({
    queryKey: [...ASSETS_QUERY_KEY, sessionOnly],
    queryFn: async (): Promise<UnifiedAsset[]> => {
      try {
        console.log('🔄 React Query: Fetching assets...', { sessionOnly });
        const assets = await AssetService.getUserAssets(sessionOnly);
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
    staleTime: 30 * 1000, // 30 seconds for faster updates
    gcTime: 45 * 60 * 1000, // Keep in cache for 45 minutes 
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
};

export const useInvalidateAssets = () => {
  const queryClient = useQueryClient();
  
  return () => {
    console.log('🔄 React Query: Invalidating and refetching assets cache');
    queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY });
    queryClient.refetchQueries({ queryKey: ASSETS_QUERY_KEY });
  };
};
