
import { useQuery } from '@tanstack/react-query';
import { videoAPI } from '@/lib/database';

export const useUserVideos = () => {
  return useQuery({
    queryKey: ['user-videos'],
    queryFn: videoAPI.getByUser,
  });
};
