import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { SceneTemplate, ContentRating } from '@/types/roleplay';

/**
 * Form data for scene creation
 */
export interface SceneFormData {
  name: string;
  description: string;
  content_rating: ContentRating;
  scenario_type: string | null;
  tags: string[];
  is_public: boolean;
  scene_prompt: string | null;
  preview_image_url: string | null;
  scene_starters: string[];
}

/**
 * Options for AI operations
 */
export interface SceneAIOptions {
  chatModel?: string;      // Model key for text enhancement
  imageModel?: string;     // Model ID for image generation
}

/**
 * Data returned from AI enhancement
 */
export interface EnhancedSceneData {
  enhanced_description: string;
  scene_prompt: string;
  suggested_tags: string[];
  suggested_scenario_type: string | null;
}

/**
 * Scene creation hook result
 */
export interface UseSceneCreationResult {
  // Enhancement
  enhanceScene: (description: string, contentRating: ContentRating, options?: SceneAIOptions) => Promise<EnhancedSceneData | null>;
  isEnhancing: boolean;
  enhancedData: EnhancedSceneData | null;
  originalDescription: string | null;
  undoEnhancement: () => void;

  // Preview generation
  generatePreview: (scenePrompt: string, contentRating: ContentRating, options?: SceneAIOptions) => Promise<string | null>;
  isGeneratingPreview: boolean;

  // Conversation starters generation
  generateStarters: (description: string, contentRating: ContentRating, options?: SceneAIOptions) => Promise<string[] | null>;
  isGeneratingStarters: boolean;

  // Scene creation/update
  createScene: (formData: SceneFormData) => Promise<SceneTemplate | null>;
  updateScene: (sceneId: string, formData: SceneFormData) => Promise<SceneTemplate | null>;
  isCreating: boolean;

  // Reset
  reset: () => void;
}

/**
 * Hook for creating scene templates with AI enhancement and preview generation
 */
export const useSceneCreation = (): UseSceneCreationResult => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  // Enhancement state
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedData, setEnhancedData] = useState<EnhancedSceneData | null>(null);
  const [originalDescription, setOriginalDescription] = useState<string | null>(null);

  // Preview generation state
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Conversation starters generation state
  const [isGeneratingStarters, setIsGeneratingStarters] = useState(false);

  // Scene creation state
  const [isCreating, setIsCreating] = useState(false);

  /**
   * Enhance scene description with AI
   * Generates optimized description, image prompt, tags, and scenario type
   */
  const enhanceScene = useCallback(async (
    description: string,
    contentRating: ContentRating,
    options?: SceneAIOptions
  ): Promise<EnhancedSceneData | null> => {
    if (!description.trim()) {
      toast({
        title: "No Description",
        description: "Please enter a scene description first.",
        variant: "destructive",
      });
      return null;
    }

    setIsEnhancing(true);
    setOriginalDescription(description);

    try {
      console.log('🎬 Enhancing scene description:', {
        descriptionLength: description.length,
        contentRating,
        chatModel: options?.chatModel || 'default'
      });

      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: {
          prompt: description,
          contentType: 'scene_creation',
          contentRating: contentRating,
          jobType: 'text_enhancement',
          selectedModel: options?.chatModel, // Pass selected chat model
          metadata: {
            content_rating: contentRating,
            enhance_for: 'scene_template'
          }
        },
      });

      if (error) {
        throw error;
      }

      // Parse the enhanced data
      // The edge function returns structured data for scene creation
      let result: EnhancedSceneData;

      if (data?.enhanced_description && data?.scene_prompt) {
        // Direct response from scene_creation content type (fields at top level)
        result = {
          enhanced_description: data.enhanced_description,
          scene_prompt: data.scene_prompt,
          suggested_tags: data.suggested_tags || [],
          suggested_scenario_type: data.suggested_scenario_type || null
        };
      } else if (data?.scene_creation_data) {
        // Legacy nested response format
        result = {
          enhanced_description: data.scene_creation_data.enhanced_description || data.enhanced_prompt,
          scene_prompt: data.scene_creation_data.scene_prompt || data.enhanced_prompt,
          suggested_tags: data.scene_creation_data.suggested_tags || [],
          suggested_scenario_type: data.scene_creation_data.suggested_scenario_type || null
        };
      } else if (data?.enhanced_prompt) {
        // Fallback: use enhanced_prompt for both description and scene_prompt
        // Extract keywords as tags
        const keywords = extractKeywords(data.enhanced_prompt);
        const scenarioType = inferScenarioType(data.enhanced_prompt);

        result = {
          enhanced_description: data.enhanced_prompt,
          scene_prompt: generateImagePrompt(data.enhanced_prompt, contentRating),
          suggested_tags: keywords.slice(0, 5),
          suggested_scenario_type: scenarioType
        };
      } else {
        throw new Error('No enhancement data returned');
      }

      console.log('✅ Scene enhanced:', {
        descriptionLength: result.enhanced_description.length,
        promptLength: result.scene_prompt.length,
        tags: result.suggested_tags,
        scenarioType: result.suggested_scenario_type
      });

      setEnhancedData(result);

      toast({
        title: "Scene Enhanced",
        description: "AI has optimized your scene for roleplay and image generation.",
      });

      return result;
    } catch (error) {
      console.error('❌ Scene enhancement failed:', error);
      toast({
        title: "Enhancement Failed",
        description: error instanceof Error ? error.message : "Failed to enhance scene. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsEnhancing(false);
    }
  }, [toast]);

  /**
   * Undo AI enhancement and restore original description
   */
  const undoEnhancement = useCallback(() => {
    setEnhancedData(null);
    toast({
      title: "Enhancement Undone",
      description: "Restored original description.",
    });
  }, [toast]);

  /**
   * Generate preview thumbnail image for the scene
   */
  const generatePreview = useCallback(async (
    scenePrompt: string,
    contentRating: ContentRating,
    options?: SceneAIOptions
  ): Promise<string | null> => {
    if (!scenePrompt.trim()) {
      toast({
        title: "No Scene Prompt",
        description: "Please enhance your scene first to generate a prompt.",
        variant: "destructive",
      });
      return null;
    }

    setIsGeneratingPreview(true);

    try {
      console.log('🖼️ Generating scene preview:', {
        promptLength: scenePrompt.length,
        contentRating,
        imageModel: options?.imageModel || 'default'
      });

      const { data, error } = await supabase.functions.invoke('fal-image', {
        body: {
          prompt: scenePrompt,
          quality: 'fast',
          apiModelId: options?.imageModel, // Pass selected image model UUID
          input: {
            image_size: { width: 512, height: 512 }
          },
          metadata: {
            contentType: contentRating,
            destination: 'scene_preview',
            user_id: user?.id
          }
        },
      });

      if (error) {
        throw error;
      }

      // The fal-image function returns the result URL
      const previewUrl = data?.resultUrl || data?.result_url || data?.image_url;

      if (!previewUrl) {
        throw new Error('No preview image URL returned');
      }

      console.log('✅ Preview generated:', previewUrl.substring(0, 60) + '...');

      toast({
        title: "Preview Generated",
        description: "Scene thumbnail is ready.",
      });

      return previewUrl;
    } catch (error) {
      console.error('❌ Preview generation failed:', error);
      toast({
        title: "Preview Failed",
        description: error instanceof Error ? error.message : "Failed to generate preview. You can still create the scene.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [user?.id, toast]);

  /**
   * Generate conversation starters using AI
   */
  const generateStarters = useCallback(async (
    description: string,
    contentRating: ContentRating,
    options?: SceneAIOptions
  ): Promise<string[] | null> => {
    if (!description.trim()) {
      toast({
        title: "No Description",
        description: "Please enter a scene description first.",
        variant: "destructive",
      });
      return null;
    }

    setIsGeneratingStarters(true);

    try {
      console.log('💬 Generating conversation starters:', {
        descriptionLength: description.length,
        contentRating,
        chatModel: options?.chatModel || 'default'
      });

      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: {
          prompt: description,
          contentType: 'scene_starters',
          contentRating: contentRating,
          jobType: 'text_enhancement',
          selectedModel: options?.chatModel,
          metadata: {
            content_rating: contentRating,
            generate_count: 3
          }
        },
      });

      if (error) {
        throw error;
      }

      // Parse the starters from the response
      let starters: string[] = [];

      if (Array.isArray(data?.starters)) {
        starters = data.starters;
      } else if (data?.enhanced_prompt) {
        // Try to parse starters from text
        const lines = data.enhanced_prompt.split('\n').filter((line: string) => line.trim());
        starters = lines.slice(0, 3).map((line: string) =>
          line.replace(/^[\d\.\-\*]+\s*/, '').trim()
        );
      }

      if (starters.length === 0) {
        // Generate default starters based on scene description
        starters = [
          `*The scene unfolds as described...*`,
          `*You find yourself in this moment...*`,
          `*The atmosphere is charged with anticipation...*`
        ];
      }

      console.log('✅ Starters generated:', starters.length);

      toast({
        title: "Starters Generated",
        description: `Generated ${starters.length} conversation starters.`,
      });

      return starters;
    } catch (error) {
      console.error('❌ Starters generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate starters. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGeneratingStarters(false);
    }
  }, [toast]);

  /**
   * Create the scene in the database
   */
  const createScene = useCallback(async (
    formData: SceneFormData
  ): Promise<SceneTemplate | null> => {
    if (!user?.id) {
      toast({
        title: "Not Logged In",
        description: "You must be logged in to create scenes.",
        variant: "destructive",
      });
      return null;
    }

    if (!formData.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a scene name.",
        variant: "destructive",
      });
      return null;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Description Required",
        description: "Please enter a scene description.",
        variant: "destructive",
      });
      return null;
    }

    setIsCreating(true);

    try {
      console.log('💾 Creating scene:', {
        name: formData.name,
        hasPreview: !!formData.preview_image_url,
        isPublic: formData.is_public
      });

      const { data, error } = await supabase
        .from('scenes')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim(),
          creator_id: user.id,
          scenario_type: formData.scenario_type,
          content_rating: formData.content_rating,
          tags: formData.tags,
          is_public: formData.is_public,
          scene_prompt: formData.scene_prompt,
          preview_image_url: formData.preview_image_url,
          scene_starters: formData.scene_starters,
          usage_count: 0
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      const newScene: SceneTemplate = {
        id: data.id,
        name: data.name,
        description: data.description,
        creator_id: data.creator_id,
        scenario_type: data.scenario_type,
        setting: data.setting,
        atmosphere: data.atmosphere,
        time_of_day: data.time_of_day,
        min_characters: data.min_characters ?? 1,
        max_characters: data.max_characters ?? 2,
        suggested_user_role: data.suggested_user_role,
        content_rating: data.content_rating || 'sfw',
        tags: data.tags || [],
        is_public: data.is_public ?? true,
        usage_count: 0,
        preview_image_url: data.preview_image_url,
        scene_starters: data.scene_starters || [],
        scene_prompt: data.scene_prompt,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      console.log('✅ Scene created:', newScene.id);

      toast({
        title: "Scene Created",
        description: `"${newScene.name}" is now available in your gallery.`,
      });

      return newScene;
    } catch (error) {
      console.error('❌ Scene creation failed:', error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create scene. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [user?.id, toast]);

  /**
   * Update an existing scene in the database
   */
  const updateScene = useCallback(async (
    sceneId: string,
    formData: SceneFormData
  ): Promise<SceneTemplate | null> => {
    if (!user?.id) {
      toast({
        title: "Not Logged In",
        description: "You must be logged in to update scenes.",
        variant: "destructive",
      });
      return null;
    }

    if (!formData.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a scene name.",
        variant: "destructive",
      });
      return null;
    }

    setIsCreating(true);

    try {
      console.log('💾 Updating scene:', {
        id: sceneId,
        name: formData.name,
        hasPreview: !!formData.preview_image_url
      });

      // Build query with conditional creator_id check (admins can edit any scene)
      let query = supabase
        .from('scenes')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim(),
          scenario_type: formData.scenario_type,
          content_rating: formData.content_rating,
          tags: formData.tags,
          is_public: formData.is_public,
          scene_prompt: formData.scene_prompt,
          preview_image_url: formData.preview_image_url,
          scene_starters: formData.scene_starters
        })
        .eq('id', sceneId);

      // Only check creator_id if not admin
      if (!isAdmin) {
        query = query.eq('creator_id', user.id);
      }

      const { data, error } = await query.select().single();

      if (error) {
        throw error;
      }

      const updatedScene: SceneTemplate = {
        id: data.id,
        name: data.name,
        description: data.description,
        creator_id: data.creator_id,
        scenario_type: data.scenario_type,
        setting: data.setting,
        atmosphere: data.atmosphere,
        time_of_day: data.time_of_day,
        min_characters: data.min_characters ?? 1,
        max_characters: data.max_characters ?? 2,
        suggested_user_role: data.suggested_user_role,
        content_rating: data.content_rating || 'sfw',
        tags: data.tags || [],
        is_public: data.is_public ?? true,
        usage_count: data.usage_count || 0,
        preview_image_url: data.preview_image_url,
        scene_starters: data.scene_starters || [],
        scene_prompt: data.scene_prompt,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      console.log('✅ Scene updated:', updatedScene.id);

      toast({
        title: "Scene Updated",
        description: `"${updatedScene.name}" has been updated.`,
      });

      return updatedScene;
    } catch (error) {
      console.error('❌ Scene update failed:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update scene. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [user?.id, isAdmin, toast]);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setEnhancedData(null);
    setOriginalDescription(null);
    setIsEnhancing(false);
    setIsGeneratingPreview(false);
    setIsGeneratingStarters(false);
    setIsCreating(false);
  }, []);

  return {
    // Enhancement
    enhanceScene,
    isEnhancing,
    enhancedData,
    originalDescription,
    undoEnhancement,

    // Preview generation
    generatePreview,
    isGeneratingPreview,

    // Conversation starters
    generateStarters,
    isGeneratingStarters,

    // Scene creation/update
    createScene,
    updateScene,
    isCreating,

    // Reset
    reset
  };
};

/**
 * Extract keywords from text for tag suggestions
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that', 'these',
    'those', 'it', 'its', 'they', 'their', 'them', 'he', 'she', 'him', 'her',
    'his', 'hers', 'we', 'us', 'our', 'you', 'your', 'i', 'me', 'my'
  ]);

  const words = text.toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Count frequency
  const freq: Record<string, number> = {};
  words.forEach(word => {
    freq[word] = (freq[word] || 0) + 1;
  });

  // Sort by frequency and return unique words
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 10);
}

/**
 * Infer scenario type from description
 */
function inferScenarioType(text: string): string | null {
  const lower = text.toLowerCase();

  if (lower.includes('stranger') || lower.includes('first meeting') || lower.includes('just met')) {
    return 'stranger';
  }
  if (lower.includes('relationship') || lower.includes('couple') || lower.includes('partner') || lower.includes('boyfriend') || lower.includes('girlfriend')) {
    return 'relationship';
  }
  if (lower.includes('power') || lower.includes('boss') || lower.includes('authority') || lower.includes('control')) {
    return 'power_dynamic';
  }
  if (lower.includes('fantasy') || lower.includes('magic') || lower.includes('supernatural') || lower.includes('dream')) {
    return 'fantasy';
  }
  if (lower.includes('slow') || lower.includes('tension') || lower.includes('building') || lower.includes('anticipation')) {
    return 'slow_burn';
  }

  return null;
}

/**
 * Generate an image-optimized prompt from description
 */
function generateImagePrompt(description: string, contentRating: ContentRating): string {
  // Extract visual elements from description
  const visual = description
    .replace(/\b(feel|feeling|emotion|think|thought|want|need|desire)\b/gi, '')
    .trim();

  // Add quality tags based on content rating
  const qualityTags = contentRating === 'nsfw'
    ? 'masterpiece, best quality, detailed, intimate atmosphere, sensual lighting'
    : 'masterpiece, best quality, detailed, artistic composition, professional lighting';

  return `${qualityTags}, ${visual}`.substring(0, 500);
}

export default useSceneCreation;
