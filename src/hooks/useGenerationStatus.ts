
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
      } catch (error) {
        console.error('❌ Error fetching generation status:', error);
        toast({
          title: "Status Check Failed",
          description: "Unable to check generation status. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    enabled: !!id && enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      
      // Stop polling when generation is complete or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      
      // Continue polling while processing
      return 3000; // Poll every 3 seconds
    },
    retry: (failureCount, error) => {
      // Retry up to 3 times for network errors
      if (failureCount < 3) {
        console.log(`🔄 Retrying status check (attempt ${failureCount + 1})`);
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};
