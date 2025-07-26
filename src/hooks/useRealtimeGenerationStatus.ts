import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { GenerationService } from '@/lib/services/GenerationService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { GenerationFormat } from '@/types/generation';

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

export const useRealtimeGenerationStatus = (
  jobId: string | null,
  format: GenerationFormat,
  enabled: boolean = true
) => {
  const [data, setData] = useState<GenerationStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const processedEventsRef = useRef<Set<string>>(new Set());
  const initialFetchRef = useRef<boolean>(false);

  // Initial fetch
  useEffect(() => {
    if (!jobId || !enabled || initialFetchRef.current) return;

    const fetchInitialStatus = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('🔍 Initial fetch for job status:', jobId);
        const result = await GenerationService.getGenerationStatus(jobId);
        
        // Handle image URL format consistency
        if (format.includes('image') && result.status === 'completed') {
          if ((result as any).image_url && !(result as any).image_urls) {
            (result as any).image_urls = [(result as any).image_url];
          }
        }
        
        setData(result as GenerationStatusData);
        initialFetchRef.current = true;
        
        // If already completed, emit event
        if (result.status === 'completed') {
          emitCompletionEvent(jobId);
        }
      } catch (err) {
        console.error('❌ Error fetching initial status:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialStatus();
  }, [jobId, format, enabled]);

  // Realtime subscription
  useEffect(() => {
    if (!jobId || !enabled) return;

    console.log('🔔 Setting up realtime subscription for job:', jobId);
    
    const channel = supabase
      .channel('job-status-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${jobId}`
        },
        async (payload) => {
          console.log('🔔 Realtime job update:', payload);
          const newJob = payload.new as any;
          
          if (newJob.status === 'completed') {
            // Fetch complete status with URLs
            try {
              const result = await GenerationService.getGenerationStatus(jobId);
              
              // Handle image URL format consistency
              if (format.includes('image') && result.status === 'completed') {
                if ((result as any).image_url && !(result as any).image_urls) {
                  (result as any).image_urls = [(result as any).image_url];
                }
              }
              
              setData(result as GenerationStatusData);
              emitCompletionEvent(jobId);
              
              toast({
                title: "Generation Complete!",
                description: `Your ${format.includes('video') ? 'video' : 'image'} is ready.`,
              });
            } catch (err) {
              console.error('❌ Error fetching completed status:', err);
            }
          } else {
            // Update with basic job data
            setData(prev => prev ? ({
              ...prev,
              status: newJob.status as any,
              progress: newJob.metadata?.progress
            }) : null);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [jobId, format, enabled, toast]);

  const emitCompletionEvent = async (completedJobId: string) => {
    const eventKey = `generation-completed-${completedJobId}`;
    
    if (!processedEventsRef.current.has(eventKey)) {
      processedEventsRef.current.add(eventKey);
      
      try {
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('image_id, video_id, job_type')
          .eq('id', completedJobId)
          .single();
        
        if (!jobError && jobData) {
          // Handle single asset case (WAN videos, legacy images)
          if (jobData.image_id || jobData.video_id) {
            const assetId = jobData.image_id || jobData.video_id;
            const assetType = jobData.image_id ? 'image' : 'video';
            
            console.log('🎉 Emitting generation completed event for single asset:', { assetId, assetType });
            window.dispatchEvent(new CustomEvent('generation-completed', {
              detail: { assetId, type: assetType, jobId: completedJobId }
            }));
          }
          // PHASE 1 FIX: Enhanced multi-image job handling with retry logic
          else if (jobData.job_type && jobData.job_type.includes('image')) {
            console.log('🔍 PHASE 1: Starting multi-image asset discovery for job:', completedJobId);
            
            // Retry mechanism to handle race conditions with edge function callbacks
            const maxRetries = 3;
            const retryDelay = 1000; // Start with 1 second
            
            for (let attempt = 0; attempt < maxRetries; attempt++) {
              console.log(`🔄 PHASE 1: Asset discovery attempt ${attempt + 1}/${maxRetries} for job:`, completedJobId);
              
              const { data: images, error: imagesError } = await supabase
                .from('images')
                .select('id, status')
                .eq('job_id', completedJobId);
              
              if (!imagesError && images && images.length > 0) {
                const completedImages = images.filter(img => img.status === 'completed');
                const totalImages = images.length;
                
                console.log(`📊 PHASE 1: Found ${completedImages.length}/${totalImages} completed images (attempt ${attempt + 1}):`, {
                  jobId: completedJobId,
                  totalImages,
                  completedImages: completedImages.length,
                  allImages: images.map(img => ({ id: img.id, status: img.status }))
                });
                
                // If we have completed images OR it's the final attempt, emit events
                if (completedImages.length > 0 || attempt === maxRetries - 1) {
                  if (completedImages.length > 0) {
                    console.log(`🎉 PHASE 1: Emitting generation completed events for ${completedImages.length} images from job:`, completedJobId);
                    
                    // Emit individual events for each completed image
                    for (const image of completedImages) {
                      window.dispatchEvent(new CustomEvent('generation-completed', {
                        detail: { assetId: image.id, type: 'image', jobId: completedJobId }
                      }));
                    }
                    
                    // Also emit a batch event for UI coordination
                    window.dispatchEvent(new CustomEvent('generation-batch-completed', {
                      detail: { 
                        assetIds: completedImages.map(img => img.id),
                        type: 'image-batch',
                        jobId: completedJobId,
                        totalCompleted: completedImages.length,
                        totalExpected: totalImages
                      }
                    }));
                  } else {
                    console.warn(`⚠️ PHASE 1: No completed images found after ${maxRetries} attempts for job:`, completedJobId);
                  }
                  break; // Exit retry loop
                }
                
                // Wait before next retry
                if (attempt < maxRetries - 1) {
                  console.log(`⏳ PHASE 1: Waiting ${retryDelay * (attempt + 1)}ms before retry...`);
                  await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
                }
              } else {
                console.error(`❌ PHASE 1: Error querying images (attempt ${attempt + 1}):`, imagesError);
                if (attempt === maxRetries - 1) {
                  console.error('❌ PHASE 1: Failed to find images after all retries for job:', completedJobId);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ PHASE 1: Error in enhanced asset resolution:', error);
      }
      
      // Cleanup
      setTimeout(() => processedEventsRef.current.delete(eventKey), 30000);
    }
  };

  return {
    data,
    isLoading,
    error,
    refetch: async () => {
      if (!jobId) return;
      
      try {
        setIsLoading(true);
        const result = await GenerationService.getGenerationStatus(jobId);
        setData(result as GenerationStatusData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }
  };
};