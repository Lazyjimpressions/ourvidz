
import { useState, useCallback, useEffect } from 'react';
import { GenerationService } from '@/lib/services/GenerationService';
import { GenerationRequest, GenerationStatus, GenerationFormat, GENERATION_CONFIGS } from '@/types/generation';
import { supabase } from '@/integrations/supabase/client';

export const useGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentJob, setCurrentJob] = useState<GenerationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateContent = useCallback(async (request: GenerationRequest) => {
    try {
      setError(null);
      setIsGenerating(true);
      setGenerationProgress(0);
      
      console.log('🎬 Starting generation with request:', request);
      
      // Queue the generation job
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

      console.log('✅ Job queued successfully:', jobId);
      
    } catch (error) {
      console.error('❌ Generation failed:', error);
      setError(error instanceof Error ? error.message : 'Generation failed');
      setIsGenerating(false);
      setCurrentJob(null);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Poll for job status updates
  useEffect(() => {
    if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'failed') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const jobStatus = await GenerationService.getGenerationStatus(currentJob.id);
        
        setCurrentJob(prev => prev ? {
          ...prev,
          status: jobStatus.status as 'queued' | 'processing' | 'completed' | 'failed',
          progress: jobStatus.status === 'processing' ? 50 : prev.progress,
          error: jobStatus.error_message || undefined
        } : null);

        if (jobStatus.status === 'completed') {
          setIsGenerating(false);
          setGenerationProgress(100);
          console.log('✅ Generation completed:', jobStatus);
        } else if (jobStatus.status === 'failed') {
          setIsGenerating(false);
          setError(jobStatus.error_message || 'Generation failed');
          console.error('❌ Generation failed:', jobStatus.error_message);
        }
        
      } catch (error) {
        console.error('❌ Failed to poll job status:', error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [currentJob]);

  return {
    generateContent,
    isGenerating,
    generationProgress,
    currentJob,
    error,
    clearError
  };
};
