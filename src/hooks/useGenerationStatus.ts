
import { useQuery } from '@tanstack/react-query';
import { GenerationService } from '@/lib/services/GenerationService';
import { useToast } from '@/hooks/use-toast';
import type { GenerationFormat } from '@/types/generation';
import { useRef } from 'react';

interface GenerationStatusData {
  status: 'queued' | 'processing' | 'uploading' | 'completed' | 'failed';
  progress?: number;
  estimated_time?: number;
  image_url?: string;
  image_urls?: string[];
  video_url?: string;
  url_error?: string;
  [key: string]: any;
}

// Phase 2 optimized timing estimates
const getOptimizedEstimatedTime = (format: GenerationFormat, quality: string): number => {
  if (format.startsWith('sdxl_image')) {
    return format.includes('fast') ? 5 : 8; // SDXL ultra-fast times
  } else if (format.startsWith('image')) {
    return format.includes('fast') ? 60 : 105; // WAN image times
  } else if (format.startsWith('video')) {
    return format.includes('fast') ? 75 : 120; // Video times
  }
  return 90; // Default fallback
};

// Helper function to get timeout based on format
const getTimeoutForFormat = (format: GenerationFormat): number => {
  if (format.includes('video')) {
    return 8 * 60 * 1000; // 8 minutes for videos
  } else {
    return 5 * 60 * 1000; // 5 minutes for images
  }
};

export const useGenerationStatus = (
  id: string | null,
  format: GenerationFormat,
  enabled: boolean = true
) => {
  const { toast } = useToast();
  const shownErrorsRef = useRef<Set<string>>(new Set());
  const maxRetriesRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());

  return useQuery({
    queryKey: ['generation-status', id, format],
    queryFn: async () => {
      if (!id) return null;
      
      console.log('🔍 Fetching generation status for:', { id, format });
      
      try {
        const result = await GenerationService.getGenerationStatus(id);
        console.log('📊 Generation status result:', result);
        
        // Handle image URL format consistency - only for image formats
        if (format.includes('image') && result.status === 'completed') {
          // Type guard to ensure we're working with image data
          const imageResult = result as any;
          
          if (imageResult.image_url && !imageResult.image_urls) {
            console.log('🔄 Converting single image_url to image_urls array');
            imageResult.image_urls = [imageResult.image_url];
          } else if (imageResult.image_urls && Array.isArray(imageResult.image_urls) && imageResult.image_urls.length > 0) {
            console.log('✅ Image URLs already in array format:', imageResult.image_urls.length, 'images');
          }
        }
        
        // Check for URL generation errors and show user feedback (with deduplication)
        if (result && 'url_error' in result && result.url_error) {
          const errorKey = `${id}-url-error`;
          if (!shownErrorsRef.current.has(errorKey)) {
            console.warn('⚠️ URL generation error detected:', result.url_error);
            toast({
              title: "Content Loading Issue",
              description: "There was a problem loading your content. This may be temporary - please try refreshing in a moment.",
              variant: "destructive",
            });
            shownErrorsRef.current.add(errorKey);
          }
        }
        
        // Reset retry counter on successful response
        maxRetriesRef.current = 0;
        
        return result;
      } catch (error: any) {
        console.error('❌ Error fetching generation status:', error);
        
        // Increment retry counter
        maxRetriesRef.current++;
        
        // Don't show toast for expected "no rows" errors (normal for video lookups)
        if (!error.message?.includes('no rows returned')) {
          const errorKey = `${id}-status-error`;
          if (!shownErrorsRef.current.has(errorKey)) {
            toast({
              title: "Status Check Error",
              description: "Unable to check generation status. Please try again.",
              variant: "destructive",
            });
            shownErrorsRef.current.add(errorKey);
          }
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
      
      // Stop polling if we have persistent URL errors (after a few attempts)
      if (data && 'url_error' in data && data.url_error && maxRetriesRef.current > 3) {
        console.log('🛑 Stopping polling due to persistent URL errors');
        return false;
      }
      
      // Stop polling after format-specific timeout to prevent infinite loops
      const elapsed = Date.now() - startTimeRef.current;
      const timeout = getTimeoutForFormat(format);
      if (elapsed > timeout) {
        console.log(`🛑 Stopping polling due to timeout (${format.includes('video') ? '8 minutes' : '5 minutes'})`);
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
      
      // Stop retrying after 3 attempts to prevent infinite loops
      if (failureCount >= 3) {
        console.log('🛑 Max retries reached, stopping');
        return false;
      }
      
      console.log(`🔄 Retrying status check (attempt ${failureCount + 1})`);
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff, max 5 seconds
    staleTime: 0, // Always consider data stale for real-time updates
    gcTime: 30000, // Keep in cache for 30 seconds for smart caching
  });
};
