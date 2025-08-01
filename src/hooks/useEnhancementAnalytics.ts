import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnhancementMetrics {
  originalPrompt: string;
  enhancedPrompt: string;
  enhancementStrategy: string;
  enhancementTimeMs: number;
  jobType: string;
  tokenOptimization?: {
    originalTokens: number;
    enhancedTokens: number;
    finalTokens: number;
    compressionApplied: boolean;
  };
  qualityImprovement?: number;
}

export const useEnhancementAnalytics = () => {
  const trackEnhancement = useCallback(async (metrics: EnhancementMetrics) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Store in jobs table directly (views are temporarily unavailable)
      const { error: jobAnalysisError } = await supabase
        .from('jobs')
        .update({
          enhancement_time_ms: metrics.enhancementTimeMs,
          quality_improvement: metrics.qualityImprovement,
        })
        .eq('user_id', user.id)
        .eq('original_prompt', metrics.originalPrompt)
        .eq('enhanced_prompt', metrics.enhancedPrompt);

      if (jobAnalysisError) {
        console.error('❌ Failed to store job enhancement analysis:', jobAnalysisError);
      }

      // Store in appropriate base table based on job type
      if (metrics.jobType.includes('image') || metrics.jobType.includes('sdxl')) {
        const { error: imageAnalysisError } = await supabase
          .from('images')
          .update({
            enhancement_time_ms: metrics.enhancementTimeMs,
            quality_improvement: metrics.qualityImprovement,
            qwen_expansion_percentage: metrics.tokenOptimization ? 
              Math.min(((metrics.tokenOptimization.enhancedTokens - metrics.tokenOptimization.originalTokens) / metrics.tokenOptimization.originalTokens) * 100, 99999.99) : 
              null,
          })
          .eq('user_id', user.id)
          .eq('prompt', metrics.originalPrompt)
          .eq('enhanced_prompt', metrics.enhancedPrompt);

        if (imageAnalysisError) {
          console.error('❌ Failed to store image enhancement analysis:', imageAnalysisError);
        }
      } else if (metrics.jobType.includes('video')) {
        const { error: videoAnalysisError } = await supabase
          .from('videos')
          .update({
            enhancement_time_ms: metrics.enhancementTimeMs,
            quality_improvement: metrics.qualityImprovement,
            qwen_expansion_percentage: metrics.tokenOptimization ? 
              Math.min(((metrics.tokenOptimization.enhancedTokens - metrics.tokenOptimization.originalTokens) / metrics.tokenOptimization.originalTokens) * 100, 99999.99) : 
              null,
          })
          .eq('user_id', user.id)
          .eq('original_prompt', metrics.originalPrompt)
          .eq('enhanced_prompt', metrics.enhancedPrompt);

        if (videoAnalysisError) {
          console.error('❌ Failed to store video enhancement analysis:', videoAnalysisError);
        }
      }

      // Log user activity
      const { error: activityError } = await supabase
        .from('user_activity_log')
        .insert({
          user_id: user.id,
          action: 'prompt_enhancement',
          resource_type: 'enhancement',
          metadata: {
            job_type: metrics.jobType,
            enhancement_strategy: metrics.enhancementStrategy,
            token_optimization: metrics.tokenOptimization,
            enhancement_time_ms: metrics.enhancementTimeMs
          }
        });

      if (activityError) {
        console.error('❌ Failed to log enhancement activity:', activityError);
      }

      console.log('✅ Enhancement analytics tracked successfully:', {
        jobType: metrics.jobType,
        strategy: metrics.enhancementStrategy,
        timeMs: metrics.enhancementTimeMs
      });

    } catch (error) {
      console.error('❌ Enhancement analytics tracking failed:', error);
    }
  }, []);

  const trackEnhancementEffectiveness = useCallback(async (
    enhancementId: string,
    userRating: number,
    qualityMetrics?: {
      tokenEfficiency: number;
      promptCoherence: number;
      generationSuccess: boolean;
    }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update enhancement effectiveness in existing records
      const { error } = await supabase
        .from('jobs')
        .update({
          quality_rating: Math.min(userRating, 99999.99),
          quality_improvement: Math.min(qualityMetrics?.tokenEfficiency || 0, 99999.99)
        })
        .eq('id', enhancementId);

      if (error) {
        console.error('❌ Failed to update enhancement effectiveness:', error);
      } else {
        console.log('✅ Enhancement effectiveness updated:', { enhancementId, rating: userRating });
      }
    } catch (error) {
      console.error('❌ Enhancement effectiveness tracking failed:', error);
    }
  }, []);

  return {
    trackEnhancement,
    trackEnhancementEffectiveness
  };
};