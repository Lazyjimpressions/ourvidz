/**
 * useClipGeneration Hook
 *
 * Handles video clip generation for storyboard using WAN 2.1 I2V via fal.ai.
 * Manages generation state, polling, and clip updates.
 */

import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { StoryboardClip, CreateClipInput, UpdateClipInput } from '@/types/storyboard';
import { StoryboardService } from '@/lib/services/StoryboardService';

export interface VideoModel {
  id: string;
  model_key: string;
  display_name: string;
  provider_name: string;
  capabilities?: {
    nsfw?: boolean;
    speed?: string;
    quality?: string;
  };
}

export interface GenerateClipInput {
  sceneId: string;
  prompt: string;
  referenceImageUrl?: string;
  referenceImageSource?: 'extracted_frame' | 'uploaded' | 'generated' | 'character_portrait';
  modelId: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  duration?: number; // seconds
}

export interface GenerationStatus {
  clipId: string;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  jobId?: string;
}

export function useClipGeneration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Track active generations
  const [activeGenerations, setActiveGenerations] = useState<Map<string, GenerationStatus>>(new Map());

  // Load video models (I2V capable)
  const { data: videoModels = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['video-models'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_models')
        .select(`
          id,
          model_key,
          display_name,
          capabilities,
          api_providers!inner(name, display_name)
        `)
        .eq('modality', 'video')
        .eq('is_active', true)
        .order('priority', { ascending: true });

      if (error) throw error;

      return data.map((model) => ({
        id: model.id,
        model_key: model.model_key,
        display_name: model.display_name,
        provider_name: (model.api_providers as { name: string; display_name: string }).name,
        capabilities: model.capabilities as VideoModel['capabilities'],
      })) as VideoModel[];
    },
  });

  // Default to first video model
  const defaultModel = videoModels[0] || null;

  // Generate clip mutation
  const generateMutation = useMutation({
    mutationFn: async (input: GenerateClipInput): Promise<StoryboardClip> => {
      // Create clip record first
      const clipInput: CreateClipInput = {
        scene_id: input.sceneId,
        prompt: input.prompt,
        reference_image_url: input.referenceImageUrl,
        reference_image_source: input.referenceImageSource,
        api_model_id: input.modelId,
      };

      const clip = await StoryboardService.createClip(clipInput);

      // Update status to generating
      await StoryboardService.updateClip(clip.id, { status: 'generating' });

      // Track generation
      setActiveGenerations((prev) => {
        const next = new Map(prev);
        next.set(clip.id, { clipId: clip.id, status: 'queued' });
        return next;
      });

      // Call fal-image edge function
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('fal-image', {
        body: {
          prompt: input.prompt,
          apiModelId: input.modelId,
          modality: 'video',
          job_type: 'video_high',
          input: {
            image_url: input.referenceImageUrl,
          },
          metadata: {
            reference_image_url: input.referenceImageUrl,
            aspectRatio: input.aspectRatio || '16:9',
            duration: input.duration || 5,
            is_wan_i2v: true,
            storyboard_clip_id: clip.id,
          },
        },
      });

      if (response.error) {
        console.error('❌ Generation failed:', response.error);
        await StoryboardService.updateClip(clip.id, { status: 'failed' });
        throw new Error(response.error.message || 'Generation failed');
      }

      const result = response.data;

      // Update generation status
      setActiveGenerations((prev) => {
        const next = new Map(prev);
        next.set(clip.id, {
          clipId: clip.id,
          status: result.status === 'completed' ? 'completed' : 'generating',
          jobId: result.jobId,
        });
        return next;
      });

      // If completed immediately, update clip
      if (result.status === 'completed' && result.resultUrl) {
        await StoryboardService.updateClip(clip.id, {
          status: 'completed',
          video_url: result.resultUrl,
        });

        // Refresh queries
        queryClient.invalidateQueries({ queryKey: ['storyboard-clips'] });
        queryClient.invalidateQueries({ queryKey: ['storyboard-scenes'] });
      }

      // Return updated clip
      const updatedClip = await StoryboardService.getClip(clip.id);
      return updatedClip || clip;
    },
    onError: (error) => {
      console.error('Generation error:', error);
      toast({
        title: 'Generation failed',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSuccess: (clip) => {
      toast({
        title: 'Generation started',
        description: `Generating clip #${clip.clip_order + 1}`,
      });
    },
  });

  // Poll for job status
  const pollJobStatus = useCallback(async (jobId: string, clipId: string) => {
    try {
      const { data: job, error } = await supabase
        .from('jobs')
        .select('status, result_url, error_message')
        .eq('id', jobId)
        .single();

      if (error) throw error;

      if (job.status === 'completed' && job.result_url) {
        // Update clip with result
        await StoryboardService.updateClip(clipId, {
          status: 'completed',
          video_url: job.result_url,
        });

        setActiveGenerations((prev) => {
          const next = new Map(prev);
          next.set(clipId, { clipId, status: 'completed', jobId });
          return next;
        });

        queryClient.invalidateQueries({ queryKey: ['storyboard-clips'] });
        queryClient.invalidateQueries({ queryKey: ['storyboard-scenes'] });

        toast({
          title: 'Clip generated',
          description: 'Your video clip is ready',
        });

        return true; // Done polling
      } else if (job.status === 'failed') {
        await StoryboardService.updateClip(clipId, { status: 'failed' });

        setActiveGenerations((prev) => {
          const next = new Map(prev);
          next.set(clipId, {
            clipId,
            status: 'failed',
            error: job.error_message || 'Generation failed',
            jobId,
          });
          return next;
        });

        toast({
          title: 'Generation failed',
          description: job.error_message || 'Unknown error',
          variant: 'destructive',
        });

        return true; // Done polling
      }

      return false; // Continue polling
    } catch (err) {
      console.error('Poll error:', err);
      return false;
    }
  }, [queryClient, toast]);

  // Auto-poll active generations
  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];

    activeGenerations.forEach((gen) => {
      if (gen.status === 'generating' && gen.jobId) {
        const interval = setInterval(async () => {
          const done = await pollJobStatus(gen.jobId!, gen.clipId);
          if (done) {
            clearInterval(interval);
          }
        }, 3000); // Poll every 3 seconds

        intervals.push(interval);
      }
    });

    return () => {
      intervals.forEach(clearInterval);
    };
  }, [activeGenerations, pollJobStatus]);

  // Retry failed clip
  const retryClip = useCallback(
    async (clip: StoryboardClip, modelId?: string) => {
      if (!clip.reference_image_url) {
        toast({
          title: 'Cannot retry',
          description: 'No reference image available for retry',
          variant: 'destructive',
        });
        return;
      }

      return generateMutation.mutateAsync({
        sceneId: clip.scene_id,
        prompt: clip.prompt,
        referenceImageUrl: clip.reference_image_url,
        referenceImageSource: clip.reference_image_source,
        modelId: modelId || clip.api_model_id || defaultModel?.id || '',
      });
    },
    [generateMutation, defaultModel, toast]
  );

  // Delete clip
  const deleteClipMutation = useMutation({
    mutationFn: async (clipId: string) => {
      await StoryboardService.deleteClip(clipId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storyboard-clips'] });
      queryClient.invalidateQueries({ queryKey: ['storyboard-scenes'] });
      toast({
        title: 'Clip deleted',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete clip',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update clip (for frame extraction)
  const updateClipMutation = useMutation({
    mutationFn: async ({ clipId, updates }: { clipId: string; updates: UpdateClipInput }) => {
      return StoryboardService.updateClip(clipId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storyboard-clips'] });
      queryClient.invalidateQueries({ queryKey: ['storyboard-scenes'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update clip',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    // Models
    videoModels,
    defaultModel,
    modelsLoading,

    // Generation
    generateClip: generateMutation.mutateAsync,
    isGenerating: generateMutation.isPending,
    activeGenerations,

    // Clip management
    retryClip,
    deleteClip: deleteClipMutation.mutateAsync,
    updateClip: updateClipMutation.mutateAsync,
    isDeletingClip: deleteClipMutation.isPending,
    isUpdatingClip: updateClipMutation.isPending,

    // Helpers
    getGenerationStatus: (clipId: string) => activeGenerations.get(clipId),
    isClipGenerating: (clipId: string) => {
      const status = activeGenerations.get(clipId);
      return status?.status === 'generating' || status?.status === 'queued';
    },
  };
}
