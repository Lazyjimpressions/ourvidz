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
   * Fetches job metadata to populate required fields on insert.
   */
  static async upsertQuickRating(
    jobId: string,
    userId: string,
    rating: number
  ): Promise<{ success: boolean; error?: string }> {
    const clampedRating = Math.max(1, Math.min(5, Math.round(rating)));

    try {
      // Fetch job metadata for required fields on insert
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('original_prompt, enhanced_prompt, api_model_id, user_id')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        return { success: false, error: 'Job not found' };
      }

      // Upsert: insert if missing, update ratings if exists
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
   * Fire-and-forget pattern - returns immediately.
   */
  static async triggerVisionScoring(
    jobId: string,
    imageUrl: string,
    originalPrompt: string,
    options?: {
      enhancedPrompt?: string;
      apiModelId?: string;
      userId?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.functions.invoke('score-generation', {
        body: {
          jobId,
          imageUrl,
          originalPrompt,
          enhancedPrompt: options?.enhancedPrompt,
          apiModelId: options?.apiModelId,
          userId: options?.userId,
        },
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
