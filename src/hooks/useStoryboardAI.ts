/**
 * useStoryboardAI Hook
 *
 * Provides AI-powered assistance for storyboard creation:
 * - Story planning: Generate story beats and scenes from project description
 * - Prompt suggestions: Context-aware motion prompt recommendations
 * - Clip type recommendations: Intelligent clip type selection
 * - Prompt enhancement: Optimize prompts for video generation
 *
 * Integrates with storyboard-ai-assist edge function.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClipType, AIStoryPlan, AIStoryBeat, AISceneBreakdown } from '@/types/storyboard';

// ============================================================================
// TYPES
// ============================================================================

export interface StoryPlanInput {
  projectDescription: string;
  targetDuration: number;
  characterIds?: string[];
  contentMode: 'sfw' | 'nsfw';
}

export interface StoryPlanResult {
  storyBeats: AIStoryBeat[];
  sceneBreakdown: AISceneBreakdown[];
  generatedAt: string;
  modelUsed: string;
}

export interface PromptSuggestion {
  prompt: string;
  intensity: 'subtle' | 'medium' | 'dynamic';
  description: string;
}

export interface PromptSuggestionsInput {
  sceneId: string;
  sceneMood?: string;
  sceneSetting?: string;
  previousClipPrompt?: string;
  clipType: ClipType;
  contentMode: 'sfw' | 'nsfw';
}

export interface ClipTypeRecommendation {
  recommended: ClipType;
  reason: string;
  alternatives: Array<{ type: ClipType; description: string }>;
}

export interface ClipTypeRecommendationInput {
  position: 'first' | 'middle' | 'last';
  previousClipType?: ClipType;
  sceneMood?: string;
  hasMotionPreset: boolean;
}

export interface EnhancePromptInput {
  prompt: string;
  clipType: ClipType;
  templateId?: string;
  contentMode: 'sfw' | 'nsfw';
}

export interface EnhancePromptResult {
  enhancedPrompt: string;
  originalPrompt: string;
  modelUsed: string;
}

// ============================================================================
// HOOK
// ============================================================================

export function useStoryboardAI() {
  const { toast } = useToast();

  // Loading states
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isSuggestingPrompts, setIsSuggestingPrompts] = useState(false);
  const [isRecommendingClipType, setIsRecommendingClipType] = useState(false);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);

  // ============================================================================
  // STORY PLAN
  // ============================================================================

  /**
   * Generate a story plan with beats and scenes from project description
   */
  const generateStoryPlan = useCallback(
    async (input: StoryPlanInput): Promise<StoryPlanResult | null> => {
      if (!input.projectDescription.trim()) {
        toast({
          title: 'Missing Description',
          description: 'Please provide a project description for story planning.',
          variant: 'destructive',
        });
        return null;
      }

      setIsGeneratingPlan(true);
      console.log('🎬 [useStoryboardAI] Generating story plan...');

      try {
        const { data, error } = await supabase.functions.invoke('storyboard-ai-assist', {
          body: {
            action: 'story_plan',
            projectDescription: input.projectDescription,
            targetDuration: input.targetDuration,
            characterIds: input.characterIds,
            contentMode: input.contentMode,
          },
        });

        if (error) {
          throw error;
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Failed to generate story plan');
        }

        console.log('✅ [useStoryboardAI] Story plan generated:', {
          beats: data.storyBeats?.length,
          scenes: data.sceneBreakdown?.length,
        });

        toast({
          title: 'Story Plan Generated',
          description: `Created ${data.storyBeats?.length || 0} story beats across ${data.sceneBreakdown?.length || 0} scenes.`,
        });

        return {
          storyBeats: data.storyBeats || [],
          sceneBreakdown: data.sceneBreakdown || [],
          generatedAt: data.generatedAt || new Date().toISOString(),
          modelUsed: data.modelUsed || 'unknown',
        };
      } catch (err) {
        console.error('❌ [useStoryboardAI] Story plan failed:', err);
        toast({
          title: 'Story Planning Failed',
          description: err instanceof Error ? err.message : 'Failed to generate story plan',
          variant: 'destructive',
        });
        return null;
      } finally {
        setIsGeneratingPlan(false);
      }
    },
    [toast]
  );

  // ============================================================================
  // PROMPT SUGGESTIONS
  // ============================================================================

  /**
   * Get motion prompt suggestions based on scene context
   */
  const suggestPrompts = useCallback(
    async (input: PromptSuggestionsInput): Promise<PromptSuggestion[]> => {
      setIsSuggestingPrompts(true);
      console.log('🎬 [useStoryboardAI] Suggesting prompts for scene:', input.sceneId);

      try {
        const { data, error } = await supabase.functions.invoke('storyboard-ai-assist', {
          body: {
            action: 'suggest_prompts',
            sceneId: input.sceneId,
            sceneMood: input.sceneMood,
            sceneSetting: input.sceneSetting,
            previousClipPrompt: input.previousClipPrompt,
            clipType: input.clipType,
            contentMode: input.contentMode,
          },
        });

        if (error) {
          throw error;
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Failed to get prompt suggestions');
        }

        console.log('✅ [useStoryboardAI] Got', data.suggestions?.length, 'prompt suggestions');

        return data.suggestions || [];
      } catch (err) {
        console.error('❌ [useStoryboardAI] Prompt suggestions failed:', err);

        // Return fallback suggestions
        return [
          { prompt: 'subtle breathing, gentle natural movement', intensity: 'subtle', description: 'Safe default' },
          { prompt: 'slowly turns head, soft expression', intensity: 'medium', description: 'Visual interest' },
          { prompt: 'takes a step forward, confident stance', intensity: 'dynamic', description: 'Action-oriented' },
        ];
      } finally {
        setIsSuggestingPrompts(false);
      }
    },
    []
  );

  // ============================================================================
  // CLIP TYPE RECOMMENDATION
  // ============================================================================

  /**
   * Get recommended clip type based on position and context
   */
  const recommendClipType = useCallback(
    async (input: ClipTypeRecommendationInput): Promise<ClipTypeRecommendation> => {
      setIsRecommendingClipType(true);
      console.log('🎬 [useStoryboardAI] Recommending clip type for position:', input.position);

      try {
        const { data, error } = await supabase.functions.invoke('storyboard-ai-assist', {
          body: {
            action: 'recommend_clip_type',
            position: input.position,
            previousClipType: input.previousClipType,
            sceneMood: input.sceneMood,
            hasMotionPreset: input.hasMotionPreset,
          },
        });

        if (error) {
          throw error;
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Failed to get clip type recommendation');
        }

        console.log('✅ [useStoryboardAI] Recommended:', data.recommended);

        return {
          recommended: data.recommended as ClipType,
          reason: data.reason || '',
          alternatives: (data.alternatives || []).map((alt: { type: string; description: string }) => ({
            type: alt.type as ClipType,
            description: alt.description,
          })),
        };
      } catch (err) {
        console.error('❌ [useStoryboardAI] Clip type recommendation failed:', err);

        // Return smart fallback based on position
        const fallback: ClipType =
          input.position === 'first'
            ? 'quick'
            : input.hasMotionPreset
            ? 'controlled'
            : 'extended';

        return {
          recommended: fallback,
          reason: 'Fallback recommendation',
          alternatives: [],
        };
      } finally {
        setIsRecommendingClipType(false);
      }
    },
    []
  );

  // ============================================================================
  // PROMPT ENHANCEMENT
  // ============================================================================

  /**
   * Enhance a user prompt for better video generation
   */
  const enhancePrompt = useCallback(
    async (input: EnhancePromptInput): Promise<EnhancePromptResult> => {
      if (!input.prompt.trim()) {
        return {
          enhancedPrompt: input.prompt,
          originalPrompt: input.prompt,
          modelUsed: 'none',
        };
      }

      setIsEnhancingPrompt(true);
      console.log('🎬 [useStoryboardAI] Enhancing prompt:', input.prompt.substring(0, 50) + '...');

      try {
        const { data, error } = await supabase.functions.invoke('storyboard-ai-assist', {
          body: {
            action: 'enhance_prompt',
            prompt: input.prompt,
            clipType: input.clipType,
            templateId: input.templateId,
            contentMode: input.contentMode,
          },
        });

        if (error) {
          throw error;
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Failed to enhance prompt');
        }

        console.log('✅ [useStoryboardAI] Prompt enhanced');

        return {
          enhancedPrompt: data.enhancedPrompt || input.prompt,
          originalPrompt: data.originalPrompt || input.prompt,
          modelUsed: data.modelUsed || 'unknown',
        };
      } catch (err) {
        console.error('❌ [useStoryboardAI] Prompt enhancement failed:', err);

        // Return original prompt on failure
        return {
          enhancedPrompt: input.prompt,
          originalPrompt: input.prompt,
          modelUsed: 'fallback',
        };
      } finally {
        setIsEnhancingPrompt(false);
      }
    },
    []
  );

  // ============================================================================
  // UTILITY: BUILD STORY PLAN FROM RESULT
  // ============================================================================

  /**
   * Convert story plan result to AIStoryPlan format for storage
   */
  const buildAIStoryPlan = useCallback((result: StoryPlanResult): AIStoryPlan => {
    return {
      storyBeats: result.storyBeats.map((beat) => ({
        beatNumber: beat.beatNumber,
        description: beat.description,
        suggestedDuration: beat.suggestedDuration,
        mood: beat.mood,
        suggestedClipType: beat.suggestedClipType as ClipType,
      })),
      sceneBreakdown: result.sceneBreakdown.map((scene) => ({
        sceneNumber: scene.sceneNumber,
        title: scene.title,
        description: scene.description,
        beats: scene.beats,
        targetDuration: scene.targetDuration,
      })),
      generatedAt: result.generatedAt,
    };
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Story planning
    generateStoryPlan,
    isGeneratingPlan,
    buildAIStoryPlan,

    // Prompt suggestions
    suggestPrompts,
    isSuggestingPrompts,

    // Clip type recommendations
    recommendClipType,
    isRecommendingClipType,

    // Prompt enhancement
    enhancePrompt,
    isEnhancingPrompt,

    // Combined loading state
    isLoading: isGeneratingPlan || isSuggestingPrompts || isRecommendingClipType || isEnhancingPrompt,
  };
}
