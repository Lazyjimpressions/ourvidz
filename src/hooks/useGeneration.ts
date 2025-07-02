
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

  // Enhanced polling for job status updates
  useEffect(() => {
    if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'failed') {
      return;
    }

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
          console.log('✅ Generation completed with enhanced status:', {
            jobId: currentJob.id,
            format: currentJob.format,
            completedAt: new Date().toISOString()
          });
          
          toast({
            title: "Generation Complete",
            description: `Your ${GENERATION_CONFIGS[currentJob.format].displayName} is ready!`,
          });
          
        } else if (jobStatus.status === 'failed') {
          setIsGenerating(false);
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

    return () => clearInterval(pollInterval);
  }, [currentJob, toast]);

  return {
    generateContent,
    isGenerating,
    generationProgress,
    currentJob,
    error,
    clearError
  };
};
