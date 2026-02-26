/**
 * useClipOrchestration Hook
 *
 * V2 clip generation hook with dynamic model selection,
 * prompt template integration, and clip type support.
 *
 * Replaces useClipGeneration with enhanced orchestration capabilities.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  StoryboardClip,
  CreateClipInput,
  ClipType,
  CLIP_TYPE_TASKS,
  CLIP_TYPE_DURATIONS,
  MotionPreset,
} from '@/types/storyboard';
import { StoryboardService } from '@/lib/services/StoryboardService';
import {
  ClipOrchestrationService,
  ResolvedModel,
  VideoPromptTemplate,
  ClipGenerationRequest,
  ClipGenerationResult,
} from '@/lib/services/ClipOrchestrationService';

// ============================================================================
// TYPES
// ============================================================================

export interface OrchestrationState {
  clipId: string;
  status: 'preparing' | 'queued' | 'generating' | 'completed' | 'failed';
  clipType: ClipType;
  resolvedModel?: ResolvedModel;
  promptTemplate?: VideoPromptTemplate;
  enhancedPrompt?: string;
  jobId?: string;
  progress?: number;
  error?: string;
  videoUrl?: string;
}

export interface GenerateClipV2Input {
  sceneId: string;
  prompt: string;
  clipType: ClipType;
  referenceImageUrl?: string;
  referenceImageSource?: 'extracted_frame' | 'uploaded' | 'character_portrait' | 'library';
  referenceVideoUrl?: string;
  motionPresetId?: string;
  endFrameUrl?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  durationSeconds?: number;
  contentMode?: 'sfw' | 'nsfw';
  parentClipId?: string;
}

// ============================================================================
// HOOK
// ============================================================================

export function useClipOrchestration(projectContentMode: 'sfw' | 'nsfw' = 'nsfw') {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Track active orchestrations
  const [orchestrations, setOrchestrations] = useState<Map<string, OrchestrationState>>(new Map());

  // ============================================================================
  // QUERIES
  // ============================================================================

  /**
   * Load all available video models
   */
  const {
    data: videoModels = [],
    isLoading: modelsLoading,
  } = useQuery({
    queryKey: ['video-models-v2'],
    queryFn: () => ClipOrchestrationService.listVideoModels(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  /**
   * Load motion presets
   */
  const {
    data: motionPresets = [],
    isLoading: presetsLoading,
  } = useQuery({
    queryKey: ['motion-presets'],
    queryFn: () => ClipOrchestrationService.listMotionPresets(),
    staleTime: 5 * 60 * 1000,
  });

  /**
   * Group motion presets by category
   */
  const presetsByCategory = useMemo(() => {
    const grouped: Record<string, MotionPreset[]> = {};
    for (const preset of motionPresets) {
      if (!grouped[preset.category]) {
        grouped[preset.category] = [];
      }
      grouped[preset.category].push(preset);
    }
    return grouped;
  }, [motionPresets]);

  // ============================================================================
  // MODEL RESOLUTION
  // ============================================================================

  /**
   * Get recommended model for a clip type
   */
  const getModelForClipType = useCallback(
    async (clipType: ClipType): Promise<ResolvedModel | null> => {
      return ClipOrchestrationService.getModelForClipType(clipType);
    },
    []
  );

  /**
   * Get models that support a specific task
   */
  const getModelsForTask = useCallback(
    (task: string): ResolvedModel[] => {
      return videoModels.filter((m) => m.tasks.includes(task));
    },
    [videoModels]
  );

  /**
   * Get recommended clip type based on context
   */
  const getRecommendedClipType = useCallback(
    (context: {
      isFirstClip: boolean;
      previousClipType?: ClipType;
      sceneMood?: string;
      hasMotionPreset: boolean;
    }): ClipType => {
      return ClipOrchestrationService.getRecommendedClipType(context);
    },
    []
  );

  // ============================================================================
  // GENERATION
  // ============================================================================

  /**
   * Generate a clip with V2 orchestration
   */
  const generateMutation = useMutation({
    mutationFn: async (input: GenerateClipV2Input): Promise<StoryboardClip> => {
      console.log('🎬 [useClipOrchestration] Starting generation:', input.clipType);

      // 1. Create clip record
      const clipInput: CreateClipInput = {
        scene_id: input.sceneId,
        prompt: input.prompt,
        reference_image_url: input.referenceImageUrl,
        reference_image_source: input.referenceImageSource,
        clip_type: input.clipType,
        parent_clip_id: input.parentClipId,
        motion_preset_id: input.motionPresetId,
        end_frame_url: input.endFrameUrl,
      };

      const clip = await StoryboardService.createClip(clipInput);

      // 2. Initialize orchestration state
      setOrchestrations((prev) => {
        const next = new Map(prev);
        next.set(clip.id, {
          clipId: clip.id,
          status: 'preparing',
          clipType: input.clipType,
        });
        return next;
      });

      // 3. Prepare generation request
      const genRequest: ClipGenerationRequest = {
        clipId: clip.id,
        clipType: input.clipType,
        prompt: input.prompt,
        referenceImageUrl: input.referenceImageUrl,
        referenceVideoUrl: input.referenceVideoUrl,
        motionPresetId: input.motionPresetId,
        endFrameUrl: input.endFrameUrl,
        contentMode: input.contentMode || projectContentMode,
        aspectRatio: input.aspectRatio || '16:9',
        durationSeconds: input.durationSeconds || CLIP_TYPE_DURATIONS[input.clipType],
      };

      // 4. Prepare generation (resolve model, template, config)
      const prepared = await ClipOrchestrationService.prepareClipGeneration(genRequest);

      if (!prepared) {
        setOrchestrations((prev) => {
          const next = new Map(prev);
          next.set(clip.id, {
            clipId: clip.id,
            status: 'failed',
            clipType: input.clipType,
            error: 'No model available for this clip type',
          });
          return next;
        });
        throw new Error('No model available for this clip type');
      }

      // 5. Update orchestration state with resolved info
      setOrchestrations((prev) => {
        const next = new Map(prev);
        next.set(clip.id, {
          clipId: clip.id,
          status: 'queued',
          clipType: input.clipType,
          resolvedModel: prepared.model,
          promptTemplate: prepared.template || undefined,
        });
        return next;
      });

      // 6. Update clip with resolved model
      await StoryboardService.updateClip(clip.id, {
        status: 'generating',
        resolved_model_id: prepared.model.id,
        prompt_template_id: prepared.template?.id,
        generation_config: prepared.generationConfig,
      });

      // 7. Execute generation
      const result = await ClipOrchestrationService.generateClip(genRequest);

      // 8. Update orchestration state with result
      setOrchestrations((prev) => {
        const next = new Map(prev);
        next.set(clip.id, {
          clipId: clip.id,
          status: result.success ? (result.videoUrl ? 'completed' : 'generating') : 'failed',
          clipType: input.clipType,
          resolvedModel: prepared.model,
          promptTemplate: prepared.template || undefined,
          enhancedPrompt: result.enhancedPrompt,
          jobId: result.jobId,
          error: result.error,
          videoUrl: result.videoUrl,
        });
        return next;
      });

      // 9. Update clip with result
      if (result.success) {
        if (result.videoUrl) {
          await StoryboardService.updateClip(clip.id, {
            status: 'completed',
            video_url: result.videoUrl,
            enhanced_prompt: result.enhancedPrompt,
          });
        } else {
          // Async job - will be updated via webhook
          await StoryboardService.updateClip(clip.id, {
            enhanced_prompt: result.enhancedPrompt,
          });
        }
      } else {
        await StoryboardService.updateClip(clip.id, {
          status: 'failed',
        });
        throw new Error(result.error || 'Generation failed');
      }

      // 10. Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['storyboard-clips'] });

      return clip;
    },
    onSuccess: (clip) => {
      toast({
        title: 'Generation started',
        description: `Clip is being generated...`,
      });
    },
    onError: (error) => {
      console.error('🎬 [useClipOrchestration] Generation failed:', error);
      toast({
        title: 'Generation failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // ============================================================================
  // POLLING FOR ASYNC JOBS
  // ============================================================================

  /**
   * Poll for async job status by querying the jobs table directly
   */
  useEffect(() => {
    const interval = setInterval(async () => {
      const generating = Array.from(orchestrations.values()).filter(
        (o) => o.status === 'generating' && o.jobId
      );

      if (generating.length === 0) return;

      for (const orch of generating) {
        try {
          // Query job status directly from jobs table
          const { data: job, error } = await supabase
            .from('jobs')
            .select('id, status, metadata, error_message')
            .eq('id', orch.jobId)
            .single();

          if (error) {
            console.error('🎬 [useClipOrchestration] Job query error:', error);
            continue;
          }

          if (job?.status === 'completed') {
            // Extract video URL from job metadata (set by fal-webhook)
            const meta = job.metadata as Record<string, any> | null;
            const videoUrl = meta?.result_url ||
              meta?.fal_response?.video?.url ||
              meta?.original_fal_url;

            if (videoUrl) {
              // Update clip
              await StoryboardService.updateClip(orch.clipId, {
                status: 'completed',
                video_url: videoUrl,
                duration_seconds: meta?.fal_response?.video?.duration ||
                  CLIP_TYPE_DURATIONS[orch.clipType],
              });

              // Update orchestration state
              setOrchestrations((prev) => {
                const next = new Map(prev);
                next.set(orch.clipId, {
                  ...orch,
                  status: 'completed',
                  videoUrl,
                });
                return next;
              });

              queryClient.invalidateQueries({ queryKey: ['storyboard-clips'] });

              toast({
                title: 'Clip ready',
                description: 'Video generation completed',
              });
            }
          } else if (job?.status === 'failed') {
            await StoryboardService.updateClip(orch.clipId, { status: 'failed' });

            setOrchestrations((prev) => {
              const next = new Map(prev);
              next.set(orch.clipId, {
                ...orch,
                status: 'failed',
                error: job.error_message || 'Generation failed',
              });
              return next;
            });

            toast({
              title: 'Generation failed',
              description: job.error_message || 'Video generation failed',
              variant: 'destructive',
            });
          }
          // If status is 'queued' or 'processing', continue polling
        } catch (err) {
          console.error('🎬 [useClipOrchestration] Polling error:', err);
        }
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [orchestrations, queryClient, toast]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Clear orchestration state for a clip
   */
  const clearOrchestration = useCallback((clipId: string) => {
    setOrchestrations((prev) => {
      const next = new Map(prev);
      next.delete(clipId);
      return next;
    });
  }, []);

  /**
   * Get orchestration state for a clip
   */
  const getOrchestration = useCallback(
    (clipId: string): OrchestrationState | undefined => {
      return orchestrations.get(clipId);
    },
    [orchestrations]
  );

  /**
   * Check if any clips are generating
   */
  const isGenerating = useMemo(() => {
    return Array.from(orchestrations.values()).some(
      (o) => o.status === 'preparing' || o.status === 'queued' || o.status === 'generating'
    );
  }, [orchestrations]);

  /**
   * Get all active generations
   */
  const activeGenerations = useMemo(() => {
    return Array.from(orchestrations.values()).filter(
      (o) => o.status === 'preparing' || o.status === 'queued' || o.status === 'generating'
    );
  }, [orchestrations]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Models
    videoModels,
    modelsLoading,
    getModelForClipType,
    getModelsForTask,

    // Motion presets
    motionPresets,
    presetsByCategory,
    presetsLoading,

    // Clip type helpers
    getRecommendedClipType,
    clipTypeTasks: CLIP_TYPE_TASKS,
    clipTypeDurations: CLIP_TYPE_DURATIONS,

    // Generation
    generateClip: generateMutation.mutateAsync,
    isGenerating,
    activeGenerations,

    // State management
    orchestrations,
    getOrchestration,
    clearOrchestration,

    // Mutation state
    generateError: generateMutation.error,
    generatePending: generateMutation.isPending,
  };
}
