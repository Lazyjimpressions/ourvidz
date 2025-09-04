import { useState, useCallback, useEffect } from 'react';
import { GenerationService } from '@/lib/services/GenerationService';
import { GenerationRequest, GenerationStatus, GenerationFormat, GENERATION_CONFIGS } from '@/types/generation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentJob, setCurrentJob] = useState<GenerationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const generateContent = useCallback(async (request: GenerationRequest) => {
    try {
      setError(null);
      setIsGenerating(true);
      setGenerationProgress(0);
      
      console.log('🎬 Starting generation with enhanced request:', request);
      
      // Queue the generation job with enhanced error handling
      const jobId = await GenerationService.queueGeneration(request);
      
      const config = GENERATION_CONFIGS[request.format];
      
      // Set initial job status
      setCurrentJob({
        id: jobId,
        status: 'queued',
        format: request.format,
        progress: 0,
        estimatedTimeRemaining: parseInt(config.estimatedTime)
      });

      console.log('✅ Job queued successfully with enhanced logging:', {
        jobId,
        format: request.format,
        isSDXL: config.isSDXL,
        estimatedTime: config.estimatedTime
      });

      // Show success toast for SDXL jobs
      if (config.isSDXL) {
        toast({
          title: "SDXL Generation Started",
          description: `Ultra-fast ${config.displayName} generation queued (${config.estimatedTime})`,
        });
      }
      
    } catch (error) {
      console.error('❌ Generation failed with enhanced error details:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        request,
        timestamp: new Date().toISOString()
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      setError(errorMessage);
      setIsGenerating(false);
      setCurrentJob(null);

      // Show detailed error toast
      toast({
        title: "Generation Failed",
        description: errorMessage.includes('Edge Function') 
          ? "Server communication error. Please try again."
          : errorMessage,
        variant: "destructive",
      });
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
      
      // Clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }
      
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
  }, [currentJob?.id, timeoutId, toast]);

  // Enhanced polling for job status updates with completion event emission and timeout handling
  useEffect(() => {
    if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'failed') {
      return;
    }

    // Set timeout for stuck jobs (5 minutes) 
    const timeout = setTimeout(() => {
      console.warn('⏰ Generation timeout reached, stopping processing');
      setIsGenerating(false);
      setCurrentJob(null);
      setError('Generation took too long - this may indicate a server issue');
      toast({
        title: "Generation Timeout", 
        description: "This is taking longer than expected. The system may be overloaded. Please try again.",
        variant: "destructive",
      });
    }, 300000);
    
    setTimeoutId(timeout);

    const pollInterval = setInterval(async () => {
      try {
        const jobStatus = await GenerationService.getGenerationStatus(currentJob.id);
        
        console.log('📊 Enhanced job status poll:', {
          jobId: currentJob.id,
          status: jobStatus.status,
          format: currentJob.format,
          timestamp: new Date().toISOString()
        });

        setCurrentJob(prev => prev ? {
          ...prev,
          status: jobStatus.status as 'queued' | 'processing' | 'completed' | 'failed',
          progress: jobStatus.status === 'processing' ? 50 : 
                   jobStatus.status === 'completed' ? 100 : prev.progress,
          error: jobStatus.error_message || undefined
        } : null);

        if (jobStatus.status === 'completed') {
          setIsGenerating(false);
          setGenerationProgress(100);
          
          // Clear timeout
          if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
          }
          
          console.log('✅ Generation completed with enhanced status:', {
            jobId: currentJob.id,
            format: currentJob.format,
            completedAt: new Date().toISOString()
          });
          
          // Emit completion event with asset ID and image URL resolution
          try {
            console.log('🎉 Generation completed, resolving asset ID and image URL');
            
            const { data: jobData, error: jobError } = await supabase
              .from('jobs')
              .select('image_id, video_id, job_type')
              .eq('id', currentJob.id)
              .single();
            
            if (!jobError && jobData) {
              const assetId = jobData.image_id || jobData.video_id;
              const assetType = jobData.image_id ? 'image' : 'video';
              
              if (assetId) {
                console.log('🎯 Resolved asset ID from completed job:', { 
                  jobId: currentJob.id, 
                  assetId, 
                  assetType,
                  jobType: jobData.job_type 
                });
                
                // Get asset URL from workspace_assets for recent generations
                let imageUrl = null;
                let bucket = null;
                if (assetType === 'image') {
                  const { data: assetData, error: assetError } = await supabase
                    .from('workspace_assets')
                    .select('temp_storage_path, generation_settings')
                    .eq('job_id', currentJob.id)
                    .eq('asset_type', 'image')
                    .maybeSingle();
                  
                  if (!assetError && assetData?.temp_storage_path) {
                    imageUrl = assetData.temp_storage_path;
                    
                    // Extract bucket from generation settings or job type
                    if (jobData.job_type?.includes('sdxl_image_high')) {
                      bucket = 'workspace-temp';
                    } else if (jobData.job_type?.includes('sdxl_image_fast')) {
                      bucket = 'workspace-temp';
                    } else if (assetData.generation_settings && typeof assetData.generation_settings === 'object') {
                      bucket = 'workspace-temp'; // All new assets go to workspace-temp
                    }
                    
                    console.log('🖼️ Resolved asset URL and bucket:', { imageUrl, bucket });
                  }
                }
                
                // Emit event with asset ID, image URL, and bucket
                window.dispatchEvent(new CustomEvent('generation-completed', {
                  detail: { 
                    assetId, 
                    imageUrl,
                    bucket,
                    type: assetType, 
                    jobId: currentJob.id 
                  }
                }));
              } else {
                console.warn('⚠️ No asset ID found for completed job:', currentJob.id);
              }
            } else {
              console.error('❌ Failed to resolve asset ID for job:', currentJob.id, jobError);
            }
          } catch (error) {
            console.error('❌ Error resolving asset ID from job:', error);
          }
          
          toast({
            title: "Generation Complete",
            description: `Your ${GENERATION_CONFIGS[currentJob.format].displayName} is ready!`,
          });
          
        } else if (jobStatus.status === 'failed') {
          setIsGenerating(false);
          
          // Clear timeout
          if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
          }
          
          const errorMsg = jobStatus.error_message || 'Generation failed';
          setError(errorMsg);
          console.error('❌ Generation failed with enhanced error tracking:', {
            jobId: currentJob.id,
            format: currentJob.format,
            error: errorMsg,
            failedAt: new Date().toISOString()
          });
          
          toast({
            title: "Generation Failed",
            description: errorMsg,
            variant: "destructive",
          });
        }
        
      } catch (error) {
        console.error('❌ Failed to poll job status with enhanced error tracking:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          jobId: currentJob.id,
          timestamp: new Date().toISOString()
        });
      }
    }, 2000);

    return () => {
      clearInterval(pollInterval);
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [currentJob, toast, timeoutId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

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
