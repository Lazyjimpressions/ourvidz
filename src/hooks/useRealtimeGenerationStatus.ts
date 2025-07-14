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
          // Handle multi-image case (SDXL, enhanced models)
          else if (jobData.job_type && jobData.job_type.includes('image')) {
            console.log('🔍 Looking for multiple images linked to job:', completedJobId);
            
            const { data: images, error: imagesError } = await supabase
              .from('images')
              .select('id')
              .eq('job_id', completedJobId)
              .eq('status', 'completed');
            
            if (!imagesError && images && images.length > 0) {
              console.log(`🎉 Emitting generation completed events for ${images.length} images from job:`, completedJobId);
              
              // Emit individual events for each image
              for (const image of images) {
                window.dispatchEvent(new CustomEvent('generation-completed', {
                  detail: { assetId: image.id, type: 'image', jobId: completedJobId }
                }));
              }
            } else {
              console.warn('⚠️ No completed images found for job:', completedJobId);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error resolving asset ID:', error);
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