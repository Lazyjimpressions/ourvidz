import { useState, useCallback, useEffect, useRef } from 'react';
import { GenerationService } from '@/lib/services/GenerationService';
import { GenerationRequest, GenerationStatus, GenerationFormat, GENERATION_CONFIGS } from '@/types/generation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const ACTIVE_JOBS_KEY = 'active-generation-jobs';
const JOB_TIMEOUT_MS = 300000; // 5 minutes

interface PersistedJob extends GenerationStatus {
  startedAt: number;
}

// Helper to persist job to localStorage
const persistJob = (job: GenerationStatus | null) => {
  if (job) {
    const persistedJob: PersistedJob = {
      ...job,
      startedAt: Date.now()
    };
    localStorage.setItem(ACTIVE_JOBS_KEY, JSON.stringify(persistedJob));
  } else {
    localStorage.removeItem(ACTIVE_JOBS_KEY);
  }
};

// Helper to restore job from localStorage
const restoreJob = (): PersistedJob | null => {
  try {
    const stored = localStorage.getItem(ACTIVE_JOBS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    localStorage.removeItem(ACTIVE_JOBS_KEY);
  }
  return null;
};

export const useGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentJob, setCurrentJob] = useState<GenerationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const hasRecovered = useRef(false);

  // Handle job completion (shared between realtime and recovery)
  const handleJobCompleted = useCallback(async (jobId: string, format: GenerationFormat, showToast = true) => {
    console.log('✅ Generation completed:', { jobId, format });
    
    setIsGenerating(false);
    setGenerationProgress(100);
    persistJob(null);
    
    // Resolve asset ID and emit completion event
    try {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('image_id, video_id, job_type')
        .eq('id', jobId)
        .single();
      
      if (!jobError && jobData) {
        const assetId = jobData.image_id || jobData.video_id;
        const assetType = jobData.image_id ? 'image' : 'video';
        
        if (assetId) {
          console.log('🎯 Resolved asset ID:', { jobId, assetId, assetType });
          
          let imageUrl = null;
          if (assetType === 'image') {
            const { data: assetData } = await supabase
              .from('workspace_assets')
              .select('temp_storage_path')
              .eq('job_id', jobId)
              .eq('asset_type', 'image')
              .maybeSingle();
            
            if (assetData?.temp_storage_path) {
              imageUrl = assetData.temp_storage_path;
            }
          }
          
          window.dispatchEvent(new CustomEvent('generation-completed', {
            detail: { assetId, imageUrl, bucket: 'workspace-temp', type: assetType, jobId }
          }));
        }
      }
    } catch (error) {
      console.error('❌ Error resolving asset ID:', error);
    }
    
    // Invalidate workspace assets to refresh the UI
    queryClient.invalidateQueries({ queryKey: ['workspace-assets'] });
    
    if (showToast) {
      toast({
        title: "Generation Complete",
        description: `Your ${GENERATION_CONFIGS[format]?.displayName || 'content'} is ready!`,
      });
    }
    
    setCurrentJob(null);
  }, [toast, queryClient]);

  // Handle job failure
  const handleJobFailed = useCallback((jobId: string, errorMessage: string, showToast = true) => {
    console.error('❌ Generation failed:', { jobId, error: errorMessage });
    
    setIsGenerating(false);
    setError(errorMessage);
    persistJob(null);
    setCurrentJob(null);
    
    if (showToast) {
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Recover job on mount - check if there's a pending job from before
  useEffect(() => {
    if (hasRecovered.current) return;
    hasRecovered.current = true;

    const storedJob = restoreJob();
    if (!storedJob) return;

    console.log('🔄 Found stored job, checking status:', storedJob.id);

    // Check if job has timed out based on original start time
    const elapsed = Date.now() - storedJob.startedAt;
    if (elapsed > JOB_TIMEOUT_MS) {
      console.warn('⏰ Stored job has timed out, clearing');
      persistJob(null);
      return;
    }

    // Verify current job status in database
    const verifyJob = async () => {
      try {
        const { data: job, error: dbError } = await supabase
          .from('jobs')
          .select('status, error_message')
          .eq('id', storedJob.id)
          .single();

        if (dbError || !job) {
          console.warn('⚠️ Stored job not found in database, clearing');
          persistJob(null);
          return;
        }

        if (job.status === 'completed') {
          console.log('🎉 Job completed while away!');
          await handleJobCompleted(storedJob.id, storedJob.format, true);
        } else if (job.status === 'failed' || job.status === 'cancelled') {
          handleJobFailed(storedJob.id, job.error_message || 'Generation failed', true);
        } else {
          // Job still in progress - restore tracking
          console.log('📡 Resuming job tracking:', storedJob.id);
          setCurrentJob(storedJob);
          setIsGenerating(true);
          setGenerationProgress(job.status === 'processing' ? 50 : 10);
          
          // No toast for resume - UI already shows generating state
        }
      } catch (error) {
        console.error('❌ Failed to verify stored job:', error);
        persistJob(null);
      }
    };

    verifyJob();
  }, [handleJobCompleted, handleJobFailed, toast]);

  // Realtime subscription for job status updates
  useEffect(() => {
    if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'failed') {
      return;
    }

    console.log('📡 Setting up realtime subscription for job:', currentJob.id);

    const channelName = `job-status-${currentJob.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${currentJob.id}`
        },
        async (payload) => {
          const newJob = payload.new as any;
          console.log('📊 Realtime job update:', { jobId: currentJob.id, status: newJob.status });

          if (newJob.status === 'processing') {
            setGenerationProgress(50);
            setCurrentJob(prev => prev ? { ...prev, status: 'processing', progress: 50 } : null);
          } else if (newJob.status === 'completed') {
            await handleJobCompleted(currentJob.id, currentJob.format);
          } else if (newJob.status === 'failed' || newJob.status === 'cancelled') {
            handleJobFailed(currentJob.id, newJob.error_message || 'Generation failed');
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
      });

    // Fallback polling in case realtime misses an update (every 10s instead of 2s)
    const fallbackPoll = setInterval(async () => {
      try {
        const jobStatus = await GenerationService.getGenerationStatus(currentJob.id);
        
        if (jobStatus.status === 'completed') {
          console.log('🔄 Fallback poll detected completion');
          await handleJobCompleted(currentJob.id, currentJob.format);
        } else if (jobStatus.status === 'failed') {
          handleJobFailed(currentJob.id, jobStatus.error_message || 'Generation failed');
        }
      } catch (error) {
        console.error('❌ Fallback poll error:', error);
      }
    }, 10000);

    // Timeout based on stored start time
    const storedJob = restoreJob();
    const elapsed = storedJob ? Date.now() - storedJob.startedAt : 0;
    const remainingTime = Math.max(JOB_TIMEOUT_MS - elapsed, 10000);

    const timeout = setTimeout(() => {
      console.warn('⏰ Generation timeout reached');
      setIsGenerating(false);
      setCurrentJob(null);
      persistJob(null);
      setError('Generation took too long - this may indicate a server issue');
      toast({
        title: "Generation Timeout",
        description: "This is taking longer than expected. Please try again.",
        variant: "destructive",
      });
    }, remainingTime);

    return () => {
      console.log('🧹 Cleaning up realtime subscription');
      supabase.removeChannel(channel);
      clearInterval(fallbackPoll);
      clearTimeout(timeout);
    };
  }, [currentJob?.id, currentJob?.status, currentJob?.format, handleJobCompleted, handleJobFailed, toast]);

  const generateContent = useCallback(async (request: GenerationRequest) => {
    try {
      setError(null);
      setIsGenerating(true);
      setGenerationProgress(0);
      
      console.log('🎬 Starting generation:', request);
      
      const jobId = await GenerationService.queueGeneration(request);
      const config = GENERATION_CONFIGS[request.format];
      
      const newJob: GenerationStatus = {
        id: jobId,
        status: 'queued',
        format: request.format,
        progress: 0,
        estimatedTimeRemaining: parseInt(config.estimatedTime)
      };
      
      setCurrentJob(newJob);
      persistJob(newJob);

      console.log('✅ Job queued:', { jobId, format: request.format });

      // No toast for generation start - UI already shows generating state
      
    } catch (error) {
      console.error('❌ Generation failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      setError(errorMessage);
      setIsGenerating(false);
      setCurrentJob(null);
      persistJob(null);

      if (errorMessage.includes('503') || errorMessage.includes('SDXL_DISABLED')) {
        toast({
          title: "SDXL Workers Unavailable",
          description: "SDXL is currently offline. Try switching to Replicate models in settings.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Generation Failed",
          description: errorMessage.includes('Edge Function') 
            ? "Server communication error. Please try again."
            : errorMessage,
          variant: "destructive",
        });
      }
    }
  }, [toast]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const cancelGeneration = useCallback(async () => {
    if (!currentJob?.id) return;
    
    try {
      await GenerationService.cancelGeneration(currentJob.id);
      setIsGenerating(false);
      setCurrentJob(null);
      persistJob(null);
      
      toast({
        title: "Generation Cancelled",
        description: "Your generation has been cancelled.",
      });
    } catch (error) {
      console.error('Failed to cancel generation:', error);
      toast({
        title: "Cancel Failed",
        description: "Could not cancel the generation. It may have already completed.",
        variant: "destructive",
      });
    }
  }, [currentJob?.id, toast]);

  return {
    generateContent,
    isGenerating,
    generationProgress,
    currentJob,
    error,
    clearError,
    cancelGeneration
  };
};
