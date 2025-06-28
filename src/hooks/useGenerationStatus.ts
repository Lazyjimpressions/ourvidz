
import { useQuery } from '@tanstack/react-query';
import { GenerationService } from '@/lib/services/GenerationService';
import { useToast } from '@/hooks/use-toast';
import type { GenerationFormat } from '@/types/generation';

interface GenerationStatusData {
  status: 'queued' | 'processing' | 'uploading' | 'completed' | 'failed';
  progress?: number;
  estimated_time?: number;
  [key: string]: any;
}

// Phase 2 optimized timing estimates
const getOptimizedEstimatedTime = (format: GenerationFormat, quality: string): number => {
  const timingMap = {
    'image_fast': 60,    // 37% faster with medium resolution
    'image_high': 105,   // High resolution, high quality
    'video_fast': 75,    // 38% faster with medium resolution
    'video_high': 120    // High resolution, high quality
  };
  
  const key = `${format}_${quality}` as keyof typeof timingMap;
  return timingMap[key] || (format === 'image' ? 90 : 120);
};

export const useGenerationStatus = (
  id: string | null,
  format: GenerationFormat,
  enabled: boolean = true
) => {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['generation-status', id, format],
    queryFn: async () => {
      if (!id) return null;
      
      console.log('🔍 Fetching generation status for:', { id, format });
      
      try {
        const result = await GenerationService.getGenerationStatus(id, format);
        console.log('📊 Generation status result:', result);
        
        // Check for URL generation errors and show user feedback
        if (result && 'url_error' in result && result.url_error) {
          console.warn('⚠️ URL generation error detected:', result.url_error);
          toast({
            title: "Image Loading Issue",
            description: "There was a problem loading the image. Please try refreshing.",
            variant: "destructive",
          });
        }
        
        return result;
      } catch (error: any) {
        console.error('❌ Error fetching generation status:', error);
        
        // Don't show toast for expected "no rows" errors (normal for video lookups)
        if (!error.message?.includes('no rows returned')) {
          toast({
            title: "Status Check Error",
            description: "Unable to check generation status. Please try again.",
            variant: "destructive",
          });
        }
        
        throw error;
      }
    },
    enabled: !!id && enabled,
    refetchInterval: (query) => {
      const data = query.state.data as GenerationStatusData | null;
      
      // Stop polling when generation is complete or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        console.log('🛑 Stopping polling for completed/failed generation');
        return false;
      }
      
      // Adaptive polling based on job status - optimized for faster generation
      if (data?.status === 'uploading') {
        console.log('📤 Uploading phase - polling every 500ms');
        return 500; // Very frequent during upload
      } else if (data?.status === 'processing') {
        console.log('⚡ Processing phase - polling every 1 second (optimized)');
        return 1000; // Frequent during generation
      } else {
        console.log('⏳ Queued phase - polling every 2 seconds (faster)');
        return 2000; // More frequent for faster jobs
      }
    },
    retry: (failureCount, error: any) => {
      // Don't retry for expected "no rows" errors
      if (error.message?.includes('no rows returned')) {
        return false;
      }
      
      // Reduced retry attempts for faster failure detection
      if (failureCount < 1) {
        console.log(`🔄 Retrying status check (attempt ${failureCount + 1})`);
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 2000), // Faster retry delays
    staleTime: 0, // Always consider data stale for real-time updates
    gcTime: 30000, // Keep in cache for 30 seconds for smart caching
  });
};
