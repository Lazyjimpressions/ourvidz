import { supabase } from '@/integrations/supabase/client';

/**
 * Lightweight service for prompt scoring operations.
 * Designed for write-heavy, read-light usage patterns:
 * - QuickRating on tiles: write-only (no per-tile DB reads)
 * - Lightbox details: single read when user opens details
 * - Manual scoring: admin-triggered vision analysis
 */
export class PromptScoringService {
  /**
   * Upsert a quick rating for a job. Creates the prompt_scores row if it doesn't exist.
   * Sets all 3 user dimensions to the same value (quick rating shortcut).
   */
  static async upsertQuickRating(
    jobId: string,
    userId: string,
    rating: number
  ): Promise<{ success: boolean; error?: string }> {
    const clampedRating = Math.max(1, Math.min(5, Math.round(rating)));

    try {
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('original_prompt, enhanced_prompt, api_model_id, user_id')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        return { success: false, error: 'Job not found' };
      }

      const { error: upsertError } = await (supabase as any)
        .from('prompt_scores')
        .upsert(
          {
            job_id: jobId,
            user_id: userId,
            api_model_id: job.api_model_id || null,
            original_prompt: job.original_prompt || '',
            enhanced_prompt: job.enhanced_prompt || null,
            user_action_rating: clampedRating,
            user_appearance_rating: clampedRating,
            user_quality_rating: clampedRating,
            user_rated_at: new Date().toISOString(),
            scoring_version: 'v1',
          },
          { onConflict: 'job_id' }
        );

      if (upsertError) {
        console.error('❌ upsertQuickRating error:', upsertError);
        return { success: false, error: upsertError.message };
      }

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ upsertQuickRating exception:', msg);
      return { success: false, error: msg };
    }
  }

  /**
   * Update a single user rating dimension. Used in lightbox per-dimension stars.
   */
  static async updateIndividualRating(
    jobId: string,
    userId: string,
    dimension: 'user_action_rating' | 'user_appearance_rating' | 'user_quality_rating',
    value: number
  ): Promise<{ success: boolean; error?: string }> {
    const clamped = Math.max(1, Math.min(5, Math.round(value)));

    try {
      // Check if row exists
      const { data: existing } = await (supabase as any)
        .from('prompt_scores')
        .select('id')
        .eq('job_id', jobId)
        .single();

      if (!existing) {
        // Create row first via upsertQuickRating with the value, then update the single dimension
        const result = await this.upsertQuickRating(jobId, userId, clamped);
        if (!result.success) return result;
        // Now update just the one dimension (the upsert set all 3 to the same value)
        // Only need to do this if we want different values — but since we just created with clamped,
        // the target dimension already has the right value. Done.
        return { success: true };
      }

      const { error } = await (supabase as any)
        .from('prompt_scores')
        .update({
          [dimension]: clamped,
          user_rated_at: new Date().toISOString(),
        })
        .eq('job_id', jobId);

      if (error) {
        console.error('❌ updateIndividualRating error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: msg };
    }
  }

  /**
   * Update scoring metadata (feedback tags, comment, preserve status).
   * Ratings are handled separately via updateIndividualRating/upsertQuickRating.
   */
  static async updateScoringMetadata(
    jobId: string,
    userId: string,
    data: {
      feedback_tags?: string[];
      comment?: string;
      preserve_image?: boolean;
      preserve_reason?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updatePayload: Record<string, any> = {
        admin_rated_by: userId,
        admin_rated_at: new Date().toISOString(),
      };

      if (data.feedback_tags !== undefined) {
        updatePayload.feedback_tags = data.feedback_tags;
      }
      if (data.comment !== undefined) {
        updatePayload.admin_comment = data.comment;
      }
      if (data.preserve_image !== undefined) {
        updatePayload.preserve_image = data.preserve_image;
      }
      if (data.preserve_reason !== undefined) {
        updatePayload.preserve_reason = data.preserve_reason;
      }

      const { error } = await (supabase as any)
        .from('prompt_scores')
        .update(updatePayload)
        .eq('job_id', jobId);

      if (error) {
        console.error('❌ updateScoringMetadata error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: msg };
    }
  }

  /**
   * Get a signed image URL for a job's workspace asset.
   * Used to pass a valid URL to score-generation (since fal.ai URLs expire).
   */
  static async getSignedImageUrl(
    jobId: string
  ): Promise<{ url: string | null; error?: string }> {
    try {
      const { data: wsAsset, error: wsError } = await supabase
        .from('workspace_assets')
        .select('temp_storage_path')
        .eq('job_id', jobId)
        .limit(1)
        .single();

      if (wsError || !wsAsset?.temp_storage_path) {
        return { url: null, error: 'No workspace asset found for job' };
      }

      const { data: signedData, error: signError } = await supabase
        .storage
        .from('workspace-temp')
        .createSignedUrl(wsAsset.temp_storage_path, 3600);

      if (signError || !signedData?.signedUrl) {
        return { url: null, error: signError?.message || 'Failed to create signed URL' };
      }

      return { url: signedData.signedUrl };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return { url: null, error: msg };
    }
  }

  /**
   * Fetch the prompt score for a specific job. Used in lightbox details only.
   */
  static async fetchScoreForJob(jobId: string) {
    const { data, error } = await (supabase as any)
      .from('prompt_scores')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ fetchScoreForJob error:', error);
      return null;
    }

    return data || null;
  }

  /**
   * Trigger vision scoring for a job via the score-generation edge function.
   * Metadata (prompt, model, template) is resolved server-side from the jobs table.
   */
  static async triggerVisionScoring(
    jobId: string,
    imageUrl: string,
    force = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.functions.invoke('score-generation', {
        body: { jobId, imageUrl, force },
      });

      if (error) {
        console.error('❌ triggerVisionScoring error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: msg };
    }
  }
}
