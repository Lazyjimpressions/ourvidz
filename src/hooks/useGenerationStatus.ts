
import { useQuery } from '@tanstack/react-query';
import { GenerationService } from '@/lib/services/GenerationService';
import { useToast } from '@/hooks/use-toast';
import type { GenerationFormat } from '@/types/generation';

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
      const data = query.state.data;
      
      // Stop polling when generation is complete or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        console.log('🛑 Stopping polling for completed/failed generation');
        return false;
      }
      
      // Continue polling while processing
      return 3000; // Poll every 3 seconds
    },
    retry: (failureCount, error: any) => {
      // Don't retry for expected "no rows" errors
      if (error.message?.includes('no rows returned')) {
        return false;
      }
      
      // Retry up to 2 times for other errors
      if (failureCount < 2) {
        console.log(`🔄 Retrying status check (attempt ${failureCount + 1})`);
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff, max 10s
  });
};
