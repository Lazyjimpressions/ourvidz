import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GenerationService } from '@/lib/services/GenerationService';
import { useToast } from '@/hooks/use-toast';
import type { GenerationFormat } from '@/types/generation';
import { useRef } from 'react';
import { ASSETS_QUERY_KEY } from '@/hooks/useAssets';
import { supabase } from '@/integrations/supabase/client';

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
  const queryClient = useQueryClient();
  const shownErrorsRef = useRef<Set<string>>(new Set());
  const maxRetriesRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const processedEventsRef = useRef<Set<string>>(new Set()); // OPTIMIZATION: Local event deduplication

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
        
        // OPTIMIZATION: Smart cache invalidation and completion handling
        if (result.status === 'completed') {
          console.log('🎉 Generation completed');
          
          // OPTIMIZATION: Only invalidate assets cache, not refetch immediately
          // Background refresh will handle the update
          queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY });
          
          // Emit completion event with asset ID resolution for workspace auto-population
          try {
            const { data: jobData, error: jobError } = await supabase
              .from('jobs')
              .select('image_id, video_id, job_type')
              .eq('id', id)
              .single();
            
            if (!jobError && jobData) {
              const assetId = jobData.image_id || jobData.video_id;
              const assetType = jobData.image_id ? 'image' : 'video';
              
              if (assetId) {
                // OPTIMIZATION: Debounced event emission to prevent duplicates
                const eventKey = `generation-completed-${id}`;
                
                if (!processedEventsRef.current.has(eventKey)) {
                  processedEventsRef.current.add(eventKey);
                  
                  // Clean up old events (prevent memory leaks)
                  setTimeout(() => processedEventsRef.current.delete(eventKey), 30000);
                  
                  window.dispatchEvent(new CustomEvent('generation-completed', {
                    detail: { assetId, type: assetType, jobId: id }
                  }));
                }
              }
            }
          } catch (error) {
            console.error('❌ Error resolving asset ID:', error);
          }
        }
        
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
    // OPTIMIZATION: No more polling - rely on realtime subscriptions for updates
    refetchInterval: false,
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
