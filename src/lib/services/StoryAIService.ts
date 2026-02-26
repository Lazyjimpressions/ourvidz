/**
 * StoryAIService
 *
 * Static service class for AI-powered storyboard assistance.
 * Wraps the storyboard-ai-assist edge function with typed interfaces.
 *
 * Use this service directly when you need AI assistance outside of React components,
 * or use the useStoryboardAI hook for React integration.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  ClipType,
  AIStoryPlan,
  AIStoryBeat,
  AISceneBreakdown,
  StoryboardProject,
  StoryboardScene,
} from '@/types/storyboard';

// ============================================================================
// TYPES
// ============================================================================

export interface StoryPlanRequest {
  projectDescription: string;
  targetDuration: number;
  characterIds?: string[];
  contentMode: 'sfw' | 'nsfw';
}

export interface StoryPlanResponse {
  success: boolean;
  storyBeats: AIStoryBeat[];
  sceneBreakdown: AISceneBreakdown[];
  generatedAt: string;
  modelUsed: string;
  error?: string;
}

export interface PromptSuggestion {
  prompt: string;
  intensity: 'subtle' | 'medium' | 'dynamic';
  description: string;
}

export interface PromptSuggestionsResponse {
  success: boolean;
  suggestions: PromptSuggestion[];
  modelUsed: string;
  error?: string;
}

export interface ClipTypeRecommendationResponse {
  success: boolean;
  recommended: ClipType;
  reason: string;
  alternatives: Array<{ type: ClipType; description: string }>;
  error?: string;
}

export interface EnhancePromptResponse {
  success: boolean;
  enhancedPrompt: string;
  originalPrompt: string;
  modelUsed: string;
  error?: string;
}

// ============================================================================
// SERVICE
// ============================================================================

export class StoryAIService {
  // ============================================================================
  // STORY PLANNING
  // ============================================================================

  /**
   * Generate a story plan with beats and scenes from project description
   */
  static async generateStoryPlan(request: StoryPlanRequest): Promise<StoryPlanResponse> {
    console.log('🎬 [StoryAIService] Generating story plan...');

    try {
      const { data, error } = await supabase.functions.invoke('storyboard-ai-assist', {
        body: {
          action: 'story_plan',
          projectDescription: request.projectDescription,
          targetDuration: request.targetDuration,
          characterIds: request.characterIds,
          contentMode: request.contentMode,
        },
      });

      if (error) {
        console.error('❌ [StoryAIService] Edge function error:', error);
        return {
          success: false,
          storyBeats: [],
          sceneBreakdown: [],
          generatedAt: new Date().toISOString(),
          modelUsed: 'none',
          error: error.message,
        };
      }

      if (!data?.success) {
        return {
          success: false,
          storyBeats: [],
          sceneBreakdown: [],
          generatedAt: new Date().toISOString(),
          modelUsed: 'none',
          error: data?.error || 'Unknown error',
        };
      }

      console.log('✅ [StoryAIService] Story plan generated:', {
        beats: data.storyBeats?.length,
        scenes: data.sceneBreakdown?.length,
      });

      return {
        success: true,
        storyBeats: data.storyBeats || [],
        sceneBreakdown: data.sceneBreakdown || [],
        generatedAt: data.generatedAt || new Date().toISOString(),
        modelUsed: data.modelUsed || 'unknown',
      };
    } catch (err) {
      console.error('❌ [StoryAIService] Story plan failed:', err);
      return {
        success: false,
        storyBeats: [],
        sceneBreakdown: [],
        generatedAt: new Date().toISOString(),
        modelUsed: 'none',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert story plan response to AIStoryPlan format for database storage
   */
  static toAIStoryPlan(response: StoryPlanResponse): AIStoryPlan {
    return {
      storyBeats: response.storyBeats.map((beat) => ({
        beatNumber: beat.beatNumber,
        description: beat.description,
        suggestedDuration: beat.suggestedDuration,
        mood: beat.mood,
        suggestedClipType: beat.suggestedClipType as ClipType,
      })),
      sceneBreakdown: response.sceneBreakdown.map((scene) => ({
        sceneNumber: scene.sceneNumber,
        title: scene.title,
        description: scene.description,
        beats: scene.beats,
        targetDuration: scene.targetDuration,
      })),
      generatedAt: response.generatedAt,
    };
  }

  // ============================================================================
  // PROMPT SUGGESTIONS
  // ============================================================================

  /**
   * Get motion prompt suggestions based on scene context
   */
  static async suggestPrompts(
    sceneId: string,
    context: {
      sceneMood?: string;
      sceneSetting?: string;
      previousClipPrompt?: string;
      clipType: ClipType;
      contentMode: 'sfw' | 'nsfw';
    }
  ): Promise<PromptSuggestionsResponse> {
    console.log('🎬 [StoryAIService] Getting prompt suggestions...');

    try {
      const { data, error } = await supabase.functions.invoke('storyboard-ai-assist', {
        body: {
          action: 'suggest_prompts',
          sceneId,
          sceneMood: context.sceneMood,
          sceneSetting: context.sceneSetting,
          previousClipPrompt: context.previousClipPrompt,
          clipType: context.clipType,
          contentMode: context.contentMode,
        },
      });

      if (error) {
        console.error('❌ [StoryAIService] Suggestions error:', error);
        return this.getDefaultPromptSuggestions();
      }

      if (!data?.success) {
        return this.getDefaultPromptSuggestions();
      }

      console.log('✅ [StoryAIService] Got', data.suggestions?.length, 'suggestions');

      return {
        success: true,
        suggestions: data.suggestions || [],
        modelUsed: data.modelUsed || 'unknown',
      };
    } catch (err) {
      console.error('❌ [StoryAIService] Suggestions failed:', err);
      return this.getDefaultPromptSuggestions();
    }
  }

  /**
   * Get default prompt suggestions when AI fails
   */
  private static getDefaultPromptSuggestions(): PromptSuggestionsResponse {
    return {
      success: true,
      suggestions: [
        {
          prompt: 'subtle breathing, gentle natural movement, same scene',
          intensity: 'subtle',
          description: 'Safe default for any clip',
        },
        {
          prompt: 'slowly turns head to the side, soft expression change',
          intensity: 'medium',
          description: 'Adds visual interest without major motion',
        },
        {
          prompt: 'takes a confident step forward, natural body movement',
          intensity: 'dynamic',
          description: 'For action-oriented scenes',
        },
      ],
      modelUsed: 'fallback',
    };
  }

  // ============================================================================
  // CLIP TYPE RECOMMENDATION
  // ============================================================================

  /**
   * Get recommended clip type based on position and context
   */
  static async recommendClipType(context: {
    position: 'first' | 'middle' | 'last';
    previousClipType?: ClipType;
    sceneMood?: string;
    hasMotionPreset: boolean;
  }): Promise<ClipTypeRecommendationResponse> {
    console.log('🎬 [StoryAIService] Getting clip type recommendation...');

    try {
      const { data, error } = await supabase.functions.invoke('storyboard-ai-assist', {
        body: {
          action: 'recommend_clip_type',
          position: context.position,
          previousClipType: context.previousClipType,
          sceneMood: context.sceneMood,
          hasMotionPreset: context.hasMotionPreset,
        },
      });

      if (error) {
        console.error('❌ [StoryAIService] Recommendation error:', error);
        return this.getFallbackClipTypeRecommendation(context);
      }

      if (!data?.success) {
        return this.getFallbackClipTypeRecommendation(context);
      }

      console.log('✅ [StoryAIService] Recommended:', data.recommended);

      return {
        success: true,
        recommended: data.recommended as ClipType,
        reason: data.reason || '',
        alternatives: (data.alternatives || []).map((alt: { type: string; description: string }) => ({
          type: alt.type as ClipType,
          description: alt.description,
        })),
      };
    } catch (err) {
      console.error('❌ [StoryAIService] Recommendation failed:', err);
      return this.getFallbackClipTypeRecommendation(context);
    }
  }

  /**
   * Get fallback clip type recommendation when AI fails
   */
  private static getFallbackClipTypeRecommendation(context: {
    position: 'first' | 'middle' | 'last';
    hasMotionPreset: boolean;
    previousClipType?: ClipType;
  }): ClipTypeRecommendationResponse {
    let recommended: ClipType;
    let reason: string;

    if (context.position === 'first') {
      recommended = 'quick';
      reason = 'First clip should establish the character with I2V';
    } else if (context.hasMotionPreset) {
      recommended = 'controlled';
      reason = 'Motion preset selected - use controlled clip type';
    } else if (context.previousClipType === 'quick') {
      recommended = 'extended';
      reason = 'Extended maintains continuity from quick clip';
    } else {
      recommended = 'extended';
      reason = 'Extended is safe for middle clips';
    }

    return {
      success: true,
      recommended,
      reason,
      alternatives: [],
    };
  }

  // ============================================================================
  // PROMPT ENHANCEMENT
  // ============================================================================

  /**
   * Enhance a user prompt for better video generation
   */
  static async enhancePrompt(
    prompt: string,
    context: {
      clipType: ClipType;
      templateId?: string;
      contentMode: 'sfw' | 'nsfw';
    }
  ): Promise<EnhancePromptResponse> {
    if (!prompt.trim()) {
      return {
        success: true,
        enhancedPrompt: prompt,
        originalPrompt: prompt,
        modelUsed: 'none',
      };
    }

    console.log('🎬 [StoryAIService] Enhancing prompt...');

    try {
      const { data, error } = await supabase.functions.invoke('storyboard-ai-assist', {
        body: {
          action: 'enhance_prompt',
          prompt,
          clipType: context.clipType,
          templateId: context.templateId,
          contentMode: context.contentMode,
        },
      });

      if (error) {
        console.error('❌ [StoryAIService] Enhancement error:', error);
        return {
          success: true,
          enhancedPrompt: prompt,
          originalPrompt: prompt,
          modelUsed: 'fallback',
        };
      }

      if (!data?.success) {
        return {
          success: true,
          enhancedPrompt: prompt,
          originalPrompt: prompt,
          modelUsed: 'fallback',
        };
      }

      console.log('✅ [StoryAIService] Prompt enhanced');

      return {
        success: true,
        enhancedPrompt: data.enhancedPrompt || prompt,
        originalPrompt: data.originalPrompt || prompt,
        modelUsed: data.modelUsed || 'unknown',
      };
    } catch (err) {
      console.error('❌ [StoryAIService] Enhancement failed:', err);
      return {
        success: true,
        enhancedPrompt: prompt,
        originalPrompt: prompt,
        modelUsed: 'fallback',
      };
    }
  }

  // ============================================================================
  // HIGH-LEVEL HELPERS
  // ============================================================================

  /**
   * Generate a complete story plan and return it in database-ready format
   */
  static async generateAndFormatStoryPlan(
    project: Pick<StoryboardProject, 'description' | 'target_duration_seconds' | 'primary_character_id' | 'content_mode'>
  ): Promise<AIStoryPlan | null> {
    const response = await this.generateStoryPlan({
      projectDescription: project.description || 'A short video',
      targetDuration: project.target_duration_seconds || 30,
      characterIds: project.primary_character_id ? [project.primary_character_id] : [],
      contentMode: project.content_mode || 'nsfw',
    });

    if (!response.success) {
      return null;
    }

    return this.toAIStoryPlan(response);
  }

  /**
   * Get context-aware prompt suggestions for a scene
   */
  static async getScenePromptSuggestions(
    scene: Pick<StoryboardScene, 'id' | 'mood' | 'setting'>,
    clipType: ClipType,
    contentMode: 'sfw' | 'nsfw',
    previousClipPrompt?: string
  ): Promise<PromptSuggestion[]> {
    const response = await this.suggestPrompts(scene.id, {
      sceneMood: scene.mood,
      sceneSetting: scene.setting,
      previousClipPrompt,
      clipType,
      contentMode,
    });

    return response.suggestions;
  }

  /**
   * Get smart clip type based on scene position
   */
  static async getSmartClipType(
    sceneClipIndex: number,
    totalClipsInScene: number,
    context: {
      previousClipType?: ClipType;
      sceneMood?: string;
      hasMotionPreset: boolean;
    }
  ): Promise<ClipType> {
    const position: 'first' | 'middle' | 'last' =
      sceneClipIndex === 0
        ? 'first'
        : sceneClipIndex === totalClipsInScene - 1
        ? 'last'
        : 'middle';

    const response = await this.recommendClipType({
      position,
      previousClipType: context.previousClipType,
      sceneMood: context.sceneMood,
      hasMotionPreset: context.hasMotionPreset,
    });

    return response.recommended;
  }
}
