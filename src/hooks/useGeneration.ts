
import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { GenerationService } from '@/lib/services/GenerationService';
import { useGenerationStatus } from '@/hooks/useGenerationStatus';
import { useToast } from '@/hooks/use-toast';
import type { GenerationRequest, GenerationFormat, GenerationQuality } from '@/types/generation';

interface UseGenerationProps {
  onSuccess?: (data: { id: string; jobId?: string }) => void;
  onError?: (error: Error) => void;
}

export const useGeneration = ({ onSuccess, onError }: UseGenerationProps = {}) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async (request: GenerationRequest) => {
      console.log('🚀 Starting generation with functional approach:', request);
      return await GenerationService.generate(request);
    },
    onSuccess: (data) => {
      console.log('✅ Generation started successfully:', data);
      setIsProcessing(true);
      toast({
        title: "Generation Started",
        description: "Your content is being generated. You'll be notified when it's ready.",
      });
      onSuccess?.(data);
    },
    onError: (error: Error) => {
      console.error('❌ Generation failed:', error);
      setIsProcessing(false);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to start generation. Please try again.",
        variant: "destructive",
      });
      onError?.(error);
    },
  });

  const generate = useCallback((request: GenerationRequest) => {
    generateMutation.mutate(request);
  }, [generateMutation]);

  const getEstimatedCredits = useCallback((format: GenerationFormat, quality: GenerationQuality) => {
    return GenerationService.getEstimatedCredits(format, quality);
  }, []);

  return {
    generate,
    isGenerating: generateMutation.isPending,
    isProcessing,
    setIsProcessing,
    useGenerationStatus: useGenerationStatus,
    getEstimatedCredits,
    error: generateMutation.error,
  };
};
