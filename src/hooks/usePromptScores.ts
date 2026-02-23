import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PromptScore {
  id: string;
  job_id: string;
  user_id: string;
  api_model_id: string | null;
  original_prompt: string;
  enhanced_prompt: string | null;
  system_prompt_used: string | null;
  vision_analysis: VisionAnalysis | null;
  action_match: number | null;
  appearance_match: number | null;
  overall_quality: number | null;
  composite_score: number | null;
  user_action_rating: number | null;
  user_appearance_rating: number | null;
  user_quality_rating: number | null;
  user_rated_at: string | null;
  admin_action_rating: number | null;
  admin_appearance_rating: number | null;
  admin_quality_rating: number | null;
  admin_rated_at: string | null;
  admin_rated_by: string | null;
  feedback_tags: string[];
  admin_comment: string | null;
  preserve_image: boolean;
  preserve_reason: string | null;
  preserved_url: string | null;
  image_deleted: boolean;
  created_at: string;
  updated_at: string;
  scoring_version: string;
}

export interface VisionAnalysis {
  action_match?: number;
  appearance_match?: number;
  overall_quality?: number;
  description?: string;
  elements_present?: string[];
  elements_missing?: string[];
  issues?: string[];
  strengths?: string[];
  analysis_timestamp?: string;
  processing_time_ms?: number;
}

export interface UserRatingInput {
  actionRating?: number;
  appearanceRating?: number;
  qualityRating?: number;
}

export interface AdminRatingInput {
  actionRating?: number;
  appearanceRating?: number;
  qualityRating?: number;
  feedbackTags?: string[];
  comment?: string;
}

export const FEEDBACK_TAGS = {
  positive: [
    'perfect_action',
    'great_appearance',
    'high_quality',
    'matches_intent',
    'good_composition',
  ],
  negative: [
    'wrong_pose',
    'wrong_action',
    'missing_element',
    'wrong_appearance',
    'wrong_body_part',
    'artifact',
    'wrong_style',
    'low_quality',
    'wrong_setting',
  ],
} as const;

export const usePromptScores = (jobId: string | null) => {
  const { user, isAdmin } = useAuth();
  const [score, setScore] = useState<PromptScore | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch score for job
  const fetchScore = useCallback(async () => {
    if (!jobId) {
      setScore(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await (supabase as any)
        .from('prompt_scores')
        .select('*')
        .eq('job_id', jobId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No score exists yet - this is normal
          setScore(null);
        } else {
          throw fetchError;
        }
      } else {
        setScore(data as unknown as PromptScore);
      }
    } catch (err) {
      console.error('❌ Error fetching prompt score:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch score'));
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  // Fetch on mount and when jobId changes
  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  // Submit user rating (1-5 scale)
  const submitUserRating = useCallback(
    async (rating: UserRatingInput) => {
      if (!jobId || !user?.id) {
        toast.error('Cannot submit rating: missing job or user');
        return;
      }

      try {
        const updateData: Record<string, unknown> = {
          user_rated_at: new Date().toISOString(),
        };

        if (rating.actionRating !== undefined) {
          updateData.user_action_rating = rating.actionRating;
        }
        if (rating.appearanceRating !== undefined) {
          updateData.user_appearance_rating = rating.appearanceRating;
        }
        if (rating.qualityRating !== undefined) {
          updateData.user_quality_rating = rating.qualityRating;
        }

        const { error: updateError } = await (supabase as any)
          .from('prompt_scores')
          .update(updateData)
          .eq('job_id', jobId);

        if (updateError) throw updateError;

        // Optimistic update
        setScore((prev) =>
          prev
            ? {
                ...prev,
                ...updateData,
              }
            : null
        );

        toast.success('Rating saved');
      } catch (err) {
        console.error('❌ Error submitting user rating:', err);
        toast.error('Failed to save rating');
      }
    },
    [jobId, user?.id]
  );

  // Submit quick rating (applies same score to all 3 dimensions)
  const submitQuickRating = useCallback(
    async (rating: number) => {
      if (!jobId || !user?.id) {
        toast.error('Cannot submit rating: missing job or user');
        return;
      }

      // Validate rating is 1-5
      const clampedRating = Math.max(1, Math.min(5, Math.round(rating)));

      try {
        const updateData = {
          user_action_rating: clampedRating,
          user_appearance_rating: clampedRating,
          user_quality_rating: clampedRating,
          user_rated_at: new Date().toISOString(),
        };

        const { error: updateError } = await (supabase as any)
          .from('prompt_scores')
          .update(updateData)
          .eq('job_id', jobId);

        if (updateError) throw updateError;

        // Optimistic update
        setScore((prev) =>
          prev
            ? {
                ...prev,
                ...updateData,
              }
            : null
        );

        toast.success(`Rated ${clampedRating}/5`);
      } catch (err) {
        console.error('❌ Error submitting quick rating:', err);
        toast.error('Failed to save rating');
      }
    },
    [jobId, user?.id]
  );

  // Submit admin rating (admin only)
  const submitAdminRating = useCallback(
    async (rating: AdminRatingInput) => {
      if (!jobId || !user?.id || !isAdmin) {
        toast.error('Admin access required');
        return;
      }

      try {
        const updateData: Record<string, unknown> = {
          admin_rated_at: new Date().toISOString(),
          admin_rated_by: user.id,
        };

        if (rating.actionRating !== undefined) {
          updateData.admin_action_rating = rating.actionRating;
        }
        if (rating.appearanceRating !== undefined) {
          updateData.admin_appearance_rating = rating.appearanceRating;
        }
        if (rating.qualityRating !== undefined) {
          updateData.admin_quality_rating = rating.qualityRating;
        }
        if (rating.feedbackTags !== undefined) {
          updateData.feedback_tags = rating.feedbackTags;
        }
        if (rating.comment !== undefined) {
          updateData.admin_comment = rating.comment;
        }

        const { error: updateError } = await (supabase as any)
          .from('prompt_scores')
          .update(updateData)
          .eq('job_id', jobId);

        if (updateError) throw updateError;

        // Optimistic update
        setScore((prev) =>
          prev
            ? {
                ...prev,
                ...updateData,
              }
            : null
        );

        toast.success('Admin rating saved');
      } catch (err) {
        console.error('❌ Error submitting admin rating:', err);
        toast.error('Failed to save admin rating');
      }
    },
    [jobId, user?.id, isAdmin]
  );

  // Toggle image preservation (admin only)
  const togglePreservation = useCallback(
    async (preserve: boolean, reason?: string) => {
      if (!jobId || !isAdmin) {
        toast.error('Admin access required');
        return;
      }

      try {
        const updateData = {
          preserve_image: preserve,
          preserve_reason: preserve ? reason || null : null,
        };

        const { error: updateError } = await (supabase as any)
          .from('prompt_scores')
          .update(updateData)
          .eq('job_id', jobId);

        if (updateError) throw updateError;

        // Optimistic update
        setScore((prev) =>
          prev
            ? {
                ...prev,
                ...updateData,
              }
            : null
        );

        toast.success(preserve ? 'Image marked for preservation' : 'Preservation removed');
      } catch (err) {
        console.error('❌ Error toggling preservation:', err);
        toast.error('Failed to update preservation');
      }
    },
    [jobId, isAdmin]
  );

  // Trigger manual scoring (admin only)
  const triggerScoring = useCallback(async () => {
    if (!jobId || !isAdmin) {
      toast.error('Admin access required');
      return;
    }

    toast.info('Triggering score analysis...');

    try {
      // Get job details
      const { data: job, error: jobError } = await (supabase as any)
        .from('jobs')
        .select('*, workspace_assets(temp_storage_path)')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        throw new Error('Job not found');
      }

      // Get signed URL for the image
      const storagePath = (job.workspace_assets as any)?.[0]?.temp_storage_path;
      if (!storagePath) {
        throw new Error('No image found for job');
      }

      const { data: signedData } = await supabase.storage
        .from('workspace-temp')
        .createSignedUrl(storagePath, 3600);

      if (!signedData?.signedUrl) {
        throw new Error('Could not get image URL');
      }

      // Invoke score-generation (metadata is resolved server-side from jobs table)
      const { error: invokeError } = await supabase.functions.invoke('score-generation', {
        body: {
          jobId: job.id,
          imageUrl: signedData.signedUrl,
          force: true,
        },
      });

      if (invokeError) throw invokeError;

      toast.success('Score analysis triggered');

      // Refresh score after a delay
      setTimeout(fetchScore, 3000);
    } catch (err) {
      console.error('❌ Error triggering scoring:', err);
      toast.error('Failed to trigger scoring');
    }
  }, [jobId, isAdmin, fetchScore]);

  return {
    score,
    isLoading,
    error,
    refetch: fetchScore,
    submitUserRating,
    submitQuickRating,
    submitAdminRating,
    togglePreservation,
    triggerScoring,
    hasScore: !!score,
    hasUserRating: !!(score?.user_action_rating || score?.user_appearance_rating || score?.user_quality_rating),
    hasAdminRating: !!(score?.admin_action_rating || score?.admin_appearance_rating || score?.admin_quality_rating),
  };
};
