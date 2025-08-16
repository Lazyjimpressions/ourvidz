
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
      
      const { data, error } = await supabase.functions.invoke('queue-job', {
        body: {
          prompt: params.originalPrompt || 'Default video prompt',
          job_type: params.jobType as 'sdxl_image_fast' | 'sdxl_image_high' | 'video_fast' | 'video_high',
          quality: params.jobType?.includes('high') ? 'high' : 'fast',
          format: params.jobType?.includes('video') ? 'mp4' : 'png',
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
