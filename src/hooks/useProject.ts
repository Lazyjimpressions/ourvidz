
import { useQuery } from '@tanstack/react-query';
import { assetAPI } from '@/lib/database';

export const useUserVideos = () => {
  return useQuery({
    queryKey: ['user-videos'],
    queryFn: async () => {
      const assets = await assetAPI.getUserLibrary();
      return assets.filter(asset => asset.asset_type.includes('video'));
    },
  });
};
