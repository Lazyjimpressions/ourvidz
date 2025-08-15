
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QueueJobParams {
  jobType: string;
  metadata?: any;
  projectId?: string;
  videoId?: string;
  originalPrompt?: string;
  enhancedPrompt?: string;
  isPromptEnhanced?: boolean;
}

export const useJobQueue = () => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const queueJobMutation = useMutation({
    mutationFn: async (params: QueueJobParams) => {
      console.log('Queuing job:', params);
      
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          prompt: params.originalPrompt || 'Default video prompt',
          model: 'video',
          quantity: 1,
          enhance_prompt: params.isPromptEnhanced !== false,
          metadata: params.metadata
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      console.log('Job queued successfully:', data);
      setIsProcessing(true);
      toast({
        title: "Job Queued",
        description: "Your video generation has been queued for processing.",
      });
    },
    onError: (error) => {
      console.error('Failed to queue job:', error);
      toast({
        title: "Error",
        description: "Failed to queue job for processing.",
        variant: "destructive",
      });
    },
  });

  const queueJob = (params: QueueJobParams) => {
    queueJobMutation.mutate(params);
  };

  return {
    queueJob,
    isQueueing: queueJobMutation.isPending,
    isProcessing,
    setIsProcessing,
  };
};
