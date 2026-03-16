import { supabase } from '@/integrations/supabase/client';
import {
  ClipType,
  CLIP_TYPE_TASKS,
  CLIP_TYPE_DURATIONS,
  MotionPreset,
  StoryboardClip,
} from '@/types/storyboard';

/**
 * API Model with provider info for routing
 */
export interface ResolvedModel {
  id: string;
  model_key: string;
  display_name: string;
  modality: string;
  tasks: string[];
  capabilities: Record<string, unknown>;
  input_defaults: Record<string, unknown>;
  endpoint_path: string | null;
  provider: {
    id: string;
    name: string;
    display_name: string;
  };
}

/**
 * Prompt template for video enhancement
 */
export interface VideoPromptTemplate {
  id: string;
  template_name: string;
  system_prompt: string;
  target_model: string;
  use_case: string;
  content_mode: string;
  token_limit: number;
}

/**
 * Generation request for a clip
 */
export interface ClipGenerationRequest {
  clipId: string;
  clipType: ClipType;
  prompt: string;
  referenceImageUrl?: string;
  referenceImageSource?: string; // 'extracted_frame' | 'character_portrait' | 'uploaded' | etc.
  referenceVideoUrl?: string;
  motionPresetId?: string;
  endFrameUrl?: string;
  contentMode: 'sfw' | 'nsfw';
  aspectRatio: '16:9' | '9:16' | '1:1';
  durationSeconds?: number;
  sceneId?: string; // For character injection (Phase 8.1)
}

/**
 * Generation result
 */
export interface ClipGenerationResult {
  success: boolean;
  clipId: string;
  jobId?: string;
  videoUrl?: string;
  error?: string;
  resolvedModelId: string;
  promptTemplateId?: string;
  enhancedPrompt?: string;
}

/**
 * LTX endpoint mapping for prompt templates
 */
const LTX_ENDPOINT_MAP: Record<string, string> = {
  i2v: '/image-to-video',
  extend: '/extend',
  multi: '/multiconditioning',
  t2v: '/text-to-video',
};

/**
 * Result from prompt enhancement
 */
export interface PromptEnhancementResult {
  success: boolean;
  enhancedPrompt: string;
  strategy: string;
  templateName?: string;
  modelUsed?: string;
  error?: string;
}

/**
 * ClipOrchestrationService - Handles dynamic model selection and generation orchestration
 *
 * Key responsibilities:
 * 1. Resolve models dynamically from api_models based on clip type
 * 2. Fetch appropriate prompt templates for enhancement
 * 3. Orchestrate generation through appropriate edge functions
 * 4. Handle multi-step generation flows (e.g., long clips = i2v + extend)
 */
export class ClipOrchestrationService {
  // ============================================================================
  // MODEL RESOLUTION
  // ============================================================================

  /**
   * Get the default model for a specific task
   * Queries api_models WHERE default_for_tasks contains the task
   */
  static async getDefaultModelForTask(task: string): Promise<ResolvedModel | null> {
    console.log('🎬 [ClipOrchestration] Getting default model for task:', task);

    const { data, error } = await supabase
      .from('api_models')
      .select(`
        id,
        model_key,
        display_name,
        modality,
        tasks,
        capabilities,
        input_defaults,
        endpoint_path,
        api_providers!inner(
          id,
          name,
          display_name
        )
      `)
      .eq('modality', 'video')
      .eq('is_active', true)
      .contains('default_for_tasks', [task])
      .order('priority', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.log('🎬 [ClipOrchestration] No default model found, trying fallback');
      return this.getFallbackModelForTask(task);
    }

    return this.mapToResolvedModel(data);
  }

  /**
   * Fallback: Get any active model that supports the task
   */
  static async getFallbackModelForTask(task: string): Promise<ResolvedModel | null> {
    const { data, error } = await supabase
      .from('api_models')
      .select(`
        id,
        model_key,
        display_name,
        modality,
        tasks,
        capabilities,
        input_defaults,
        endpoint_path,
        api_providers!inner(
          id,
          name,
          display_name
        )
      `)
      .eq('modality', 'video')
      .eq('is_active', true)
      .contains('tasks', [task])
      .order('priority', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.error('🎬 [ClipOrchestration] No model found for task:', task);
      return null;
    }

    return this.mapToResolvedModel(data);
  }

  /**
   * Get the appropriate model for a clip type
   * Maps clip type → primary task → model lookup
   */
  static async getModelForClipType(clipType: ClipType): Promise<ResolvedModel | null> {
    const tasks = CLIP_TYPE_TASKS[clipType];
    const primaryTask = tasks[0];

    console.log('🎬 [ClipOrchestration] Resolving model for clip type:', clipType, '→ task:', primaryTask);

    const model = await this.getDefaultModelForTask(primaryTask);

    if (!model) {
      console.error('🎬 [ClipOrchestration] Failed to resolve model for clip type:', clipType);
    }

    return model;
  }

  /**
   * List all available video models
   */
  static async listVideoModels(): Promise<ResolvedModel[]> {
    const { data, error } = await supabase
      .from('api_models')
      .select(`
        id,
        model_key,
        display_name,
        modality,
        tasks,
        capabilities,
        input_defaults,
        endpoint_path,
        api_providers!inner(
          id,
          name,
          display_name
        )
      `)
      .eq('modality', 'video')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error || !data) {
      console.error('🎬 [ClipOrchestration] Failed to list video models:', error);
      return [];
    }

    return data.map(this.mapToResolvedModel);
  }

  // ============================================================================
  // CHARACTER RESOLUTION (Phase 8.1)
  // ============================================================================

  /**
   * Character appearance data for prompt injection
   */
  static CharacterAppearance: {
    name: string;
    gender: string;
    appearance_tags: string[];
    clothing_tags: string[];
  };

  /**
   * Get character IDs from scene, with fallback to project primary_character_id
   */
  static async getSceneCharacters(sceneId: string): Promise<string[]> {
    console.log('🎬 [ClipOrchestration] Getting characters for scene:', sceneId);

    const { data: scene, error } = await supabase
      .from('storyboard_scenes')
      .select('characters, project_id')
      .eq('id', sceneId)
      .single();

    if (error || !scene) {
      console.log('🎬 [ClipOrchestration] Scene not found:', sceneId);
      return [];
    }

    // Check if scene has characters assigned
    const sceneCharacters = scene.characters as string[] | null;
    if (sceneCharacters && sceneCharacters.length > 0) {
      console.log('🎬 [ClipOrchestration] Found scene characters:', sceneCharacters);
      return sceneCharacters;
    }

    // Fallback to project primary_character_id
    const { data: project } = await supabase
      .from('storyboard_projects')
      .select('primary_character_id')
      .eq('id', scene.project_id)
      .single();

    if (project?.primary_character_id) {
      console.log('🎬 [ClipOrchestration] Using project primary character:', project.primary_character_id);
      return [project.primary_character_id];
    }

    console.log('🎬 [ClipOrchestration] No characters found for scene');
    return [];
  }

  /**
   * Get character appearance data for prompt injection
   */
  static async getCharacterAppearance(characterId: string): Promise<{
    name: string;
    gender: string;
    appearance_tags: string[];
    clothing_tags: string[];
  } | null> {
    console.log('🎬 [ClipOrchestration] Getting character appearance:', characterId);

    const { data, error } = await supabase
      .from('characters')
      .select('name, gender, appearance_tags, clothing_tags')
      .eq('id', characterId)
      .single();

    if (error || !data) {
      console.log('🎬 [ClipOrchestration] Character not found:', characterId);
      return null;
    }

    console.log('🎬 [ClipOrchestration] Character appearance:', {
      name: data.name,
      gender: data.gender,
      appearance_tags: data.appearance_tags?.length || 0,
      clothing_tags: data.clothing_tags?.length || 0,
    });

    return {
      name: data.name,
      gender: data.gender || 'unspecified',
      appearance_tags: data.appearance_tags || [],
      clothing_tags: data.clothing_tags || [],
    };
  }

  /**
   * Build prompt with character appearance injection
   *
   * For anchor clips (first clip or new reference): Inject full appearance
   * For chained clips (from extracted frame): Use continuation pattern
   */
  static buildPromptWithCharacter(
    userPrompt: string,
    character: { gender: string; appearance_tags: string[]; clothing_tags: string[] } | null,
    isChainedClip: boolean
  ): string {
    // For chained clips, use continuation pattern to preserve identity
    if (isChainedClip) {
      console.log('🎬 [ClipOrchestration] Using chain continuation prompt');
      return `same character continuing motion, ${userPrompt}`;
    }

    // If no character, return raw prompt
    if (!character) {
      console.log('🎬 [ClipOrchestration] No character data, using raw prompt');
      return userPrompt;
    }

    // Build gender token
    const genderToken = character.gender === 'female' ? 'woman' :
                        character.gender === 'male' ? 'man' : 'person';

    // Build appearance string
    const appearance = character.appearance_tags.length > 0
      ? character.appearance_tags.join(', ')
      : '';

    // Build clothing string
    const clothing = character.clothing_tags.length > 0
      ? `, wearing ${character.clothing_tags.join(', ')}`
      : '';

    // Construct injected prompt
    const injectedPrompt = appearance
      ? `${genderToken}, ${appearance}${clothing}, ${userPrompt}`
      : `${genderToken}${clothing}, ${userPrompt}`;

    console.log('🎬 [ClipOrchestration] Injected character prompt:', {
      genderToken,
      appearanceCount: character.appearance_tags.length,
      clothingCount: character.clothing_tags.length,
      finalLength: injectedPrompt.length,
    });

    return injectedPrompt;
  }

  // ============================================================================
  // PROMPT TEMPLATE RESOLUTION
  // ============================================================================

  /**
   * Get prompt template for video enhancement
   * Matches by target_model (LTX endpoint), use_case, and content_mode
   */
  static async getPromptTemplate(
    task: string,
    contentMode: 'sfw' | 'nsfw'
  ): Promise<VideoPromptTemplate | null> {
    const targetModel = LTX_ENDPOINT_MAP[task] || task;

    console.log('🎬 [ClipOrchestration] Getting prompt template for:', targetModel, contentMode);

    const { data, error } = await supabase
      .from('prompt_templates')
      .select('id, template_name, system_prompt, target_model, use_case, content_mode, token_limit')
      .eq('job_type', 'video')
      .eq('target_model', targetModel)
      .eq('use_case', 'enhancement')
      .eq('content_mode', contentMode)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (error || !data) {
      // Try without content_mode filter
      const { data: fallbackData } = await supabase
        .from('prompt_templates')
        .select('id, template_name, system_prompt, target_model, use_case, content_mode, token_limit')
        .eq('job_type', 'video')
        .eq('target_model', targetModel)
        .eq('use_case', 'enhancement')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (fallbackData) {
        console.log('🎬 [ClipOrchestration] Using fallback template:', fallbackData.template_name);
        return fallbackData as VideoPromptTemplate;
      }

      console.log('🎬 [ClipOrchestration] No prompt template found for:', targetModel);
      return null;
    }

    return data as VideoPromptTemplate;
  }

  // ============================================================================
  // MOTION PRESETS
  // ============================================================================

  /**
   * List all available motion presets (built-in + user's own)
   */
  static async listMotionPresets(): Promise<MotionPreset[]> {
    const { data: userData } = await supabase.auth.getUser();

    let query = supabase
      .from('motion_presets')
      .select('*')
      .eq('is_active', true);

    // Get built-in presets and user's own presets
    if (userData.user) {
      query = query.or(`is_builtin.eq.true,user_id.eq.${userData.user.id}`);
    } else {
      query = query.eq('is_builtin', true);
    }

    const { data, error } = await query.order('category').order('name');

    if (error) {
      console.error('🎬 [ClipOrchestration] Failed to list motion presets:', error);
      return [];
    }

    return (data || []) as MotionPreset[];
  }

  /**
   * Get a single motion preset by ID
   */
  static async getMotionPreset(presetId: string): Promise<MotionPreset | null> {
    const { data, error } = await supabase
      .from('motion_presets')
      .select('*')
      .eq('id', presetId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as MotionPreset;
  }

  /**
   * Create a user motion preset (favorite)
   */
  static async createMotionPreset(
    name: string,
    videoUrl: string,
    category: MotionPreset['category'],
    description?: string
  ): Promise<MotionPreset> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('motion_presets')
      .insert({
        user_id: userData.user.id,
        name,
        description,
        video_url: videoUrl,
        category,
        is_builtin: false,
      })
      .select()
      .single();

    if (error) {
      console.error('🎬 [ClipOrchestration] Failed to create motion preset:', error);
      throw error;
    }

    return data as MotionPreset;
  }

  // ============================================================================
  // PROMPT ENHANCEMENT
  // ============================================================================

  /**
   * Enhance a prompt using the enhance-prompt edge function
   * Uses table-driven templates from prompt_templates table
   */
  static async enhancePrompt(
    prompt: string,
    clipType: ClipType,
    contentMode: 'sfw' | 'nsfw',
    modelId?: string
  ): Promise<PromptEnhancementResult> {
    console.log('🎬 [ClipOrchestration] Enhancing prompt:', {
      clipType,
      contentMode,
      promptLength: prompt.length,
      hasModelId: !!modelId,
    });

    try {
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: {
          prompt,
          jobType: 'video',
          contentType: contentMode,
          model_id: modelId,
          metadata: {
            clip_type: clipType,
            source: 'storyboard',
          },
        },
      });

      if (error) {
        console.error('🎬 [ClipOrchestration] Prompt enhancement failed:', error);
        return {
          success: false,
          enhancedPrompt: prompt,
          strategy: 'error_fallback',
          error: error.message,
        };
      }

      if (data.success && data.enhanced_prompt) {
        console.log('✅ [ClipOrchestration] Prompt enhanced:', {
          originalLength: prompt.length,
          enhancedLength: data.enhanced_prompt.length,
          strategy: data.enhancement_strategy,
          template: data.enhancement_metadata?.template_name,
        });

        return {
          success: true,
          enhancedPrompt: data.enhanced_prompt,
          strategy: data.enhancement_strategy,
          templateName: data.enhancement_metadata?.template_name,
          modelUsed: data.enhancement_metadata?.model_used,
        };
      }

      // Enhancement service returned but with no enhanced prompt
      console.log('⚠️ [ClipOrchestration] Enhancement returned original prompt');
      return {
        success: true,
        enhancedPrompt: prompt,
        strategy: 'passthrough',
      };
    } catch (err) {
      console.error('🎬 [ClipOrchestration] Enhancement error:', err);
      return {
        success: false,
        enhancedPrompt: prompt,
        strategy: 'error_fallback',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // GENERATION ORCHESTRATION
  // ============================================================================

  /**
   * Prepare a clip for generation
   * Resolves model, fetches template, injects character data, returns generation config
   */
  static async prepareClipGeneration(request: ClipGenerationRequest): Promise<{
    model: ResolvedModel;
    template: VideoPromptTemplate | null;
    generationConfig: Record<string, unknown>;
    injectedPrompt: string;
    characterName?: string;
  } | null> {
    // 1. Resolve model for clip type
    const model = await this.getModelForClipType(request.clipType);
    if (!model) {
      console.error('🎬 [ClipOrchestration] Cannot prepare generation - no model found');
      return null;
    }

    // 2. Get prompt template
    const primaryTask = CLIP_TYPE_TASKS[request.clipType][0];
    const template = await this.getPromptTemplate(primaryTask, request.contentMode);

    // 3. Inject character data into prompt (Phase 8.1)
    let injectedPrompt = request.prompt;
    let characterName: string | undefined;

    if (request.sceneId) {
      const characterIds = await this.getSceneCharacters(request.sceneId);
      if (characterIds.length > 0) {
        const character = await this.getCharacterAppearance(characterIds[0]);
        if (character) {
          characterName = character.name;
          const isChainedClip = request.referenceImageSource === 'extracted_frame';
          injectedPrompt = this.buildPromptWithCharacter(request.prompt, character, isChainedClip);
        }
      }
    }

    // 4. Build generation config with injected prompt
    const modifiedRequest = { ...request, prompt: injectedPrompt };
    const generationConfig = this.buildGenerationConfig(modifiedRequest, model);

    console.log('🎬 [ClipOrchestration] Prepared generation:', {
      clipType: request.clipType,
      model: model.display_name,
      template: template?.template_name,
      characterInjected: characterName || 'none',
      promptLength: injectedPrompt.length,
    });

    return { model, template, generationConfig, injectedPrompt, characterName };
  }

  /**
   * Build generation config based on clip type and model
   */
  private static buildGenerationConfig(
    request: ClipGenerationRequest,
    model: ResolvedModel
  ): Record<string, unknown> {
    const defaults = model.input_defaults || {};
    const duration = request.durationSeconds || CLIP_TYPE_DURATIONS[request.clipType];

    const config: Record<string, unknown> = {
      ...defaults,
      duration,
      aspect_ratio: request.aspectRatio,
      clip_type: request.clipType, // Track clip type for metadata
    };

    switch (request.clipType) {
      case 'quick':
        // I2V: Single reference image → video
        // fal-image expects input.image_url
        config.image_url = request.referenceImageUrl;
        break;

      case 'extended':
        // Extend: Previous video → continued video
        // fal-image expects input.video as URL string
        config.video = request.referenceVideoUrl;
        break;

      case 'controlled':
        // MultiCondition: Identity + motion reference
        // fal-image expects input.images array with temporal positions
        // and optionally input.videos for motion reference
        if (request.referenceImageUrl) {
          config.images = [
            { image_url: request.referenceImageUrl, start_frame_num: 0 },
          ];
        }
        // Motion video will be resolved and added by generateClip
        break;

      case 'long':
        // Orchestrated: Will be handled as multiple calls
        config.image_url = request.referenceImageUrl;
        config.is_orchestrated = true;
        break;

      case 'keyframed':
        // Keyframed: Start + end frame positions
        // Uses images array with temporal positions
        config.images = [];
        if (request.referenceImageUrl) {
          (config.images as Array<{ image_url: string; start_frame_num: number }>).push(
            { image_url: request.referenceImageUrl, start_frame_num: 0 }
          );
        }
        if (request.endFrameUrl) {
          // End frame at final position (based on duration and frame rate)
          const frameRate = (defaults as Record<string, number>).frame_rate || 16;
          const endFrameNum = Math.round(duration * frameRate) - 1;
          (config.images as Array<{ image_url: string; start_frame_num: number }>).push(
            { image_url: request.endFrameUrl, start_frame_num: endFrameNum }
          );
        }
        break;
    }

    return config;
  }

  /**
   * Execute clip generation through appropriate edge function
   * Returns job ID for async processing or immediate result
   */
  static async executeGeneration(
    clipId: string,
    model: ResolvedModel,
    prompt: string,
    generationConfig: Record<string, unknown>
  ): Promise<{ jobId?: string; videoUrl?: string; error?: string }> {
    console.log('🎬 [ClipOrchestration] Executing generation:', {
      clipId,
      model: model.model_key,
      provider: model.provider.name,
    });

    try {
      const { data, error } = await supabase.functions.invoke('fal-image', {
        body: {
          prompt,
          apiModelId: model.id,
          modality: 'video',
          input: generationConfig,
          metadata: {
            storyboard_clip_id: clipId,
            clip_type: generationConfig.clip_type,
          },
        },
      });

      if (error) {
        console.error('🎬 [ClipOrchestration] Generation failed:', error);
        return { error: error.message };
      }

      // Check if async (job) or sync (immediate result)
      // fal-image returns camelCase: jobId, resultUrl, status
      if (data.jobId) {
        return { jobId: data.jobId };
      } else if (data.resultUrl || data.video?.url) {
        return { videoUrl: data.resultUrl || data.video?.url };
      }

      return { error: 'Unexpected response from generation' };
    } catch (err) {
      console.error('🎬 [ClipOrchestration] Generation error:', err);
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Full generation flow for a clip
   */
  static async generateClip(request: ClipGenerationRequest): Promise<ClipGenerationResult> {
    // 1. Prepare generation (includes character injection)
    const prepared = await this.prepareClipGeneration(request);
    if (!prepared) {
      return {
        success: false,
        clipId: request.clipId,
        error: 'Failed to prepare generation - no model available',
        resolvedModelId: '',
      };
    }

    const { model, template, generationConfig, injectedPrompt, characterName } = prepared;

    // 2. Enhance prompt via edge function (Phase 8.1: use injected prompt)
    // The enhance-prompt function handles template lookup internally
    const enhancement = await this.enhancePrompt(
      injectedPrompt, // Use injected prompt (with character tags) instead of raw prompt
      request.clipType,
      request.contentMode,
      model.id
    );

    const enhancedPrompt = enhancement.enhancedPrompt;
    console.log('🎬 [ClipOrchestration] Using prompt:', {
      enhanced: enhancement.success,
      strategy: enhancement.strategy,
      templateUsed: enhancement.templateName || template?.template_name,
      characterInjected: characterName || 'none',
    });

    // 3. Resolve motion preset URL if needed (for controlled/multi clips)
    if (request.motionPresetId) {
      const preset = await this.getMotionPreset(request.motionPresetId);
      if (preset) {
        // Add motion video to videos array for MultiCondition
        if (!generationConfig.videos) {
          generationConfig.videos = [];
        }
        (generationConfig.videos as Array<{ video_url: string; start_frame_num: number }>).push({
          video_url: preset.video_url,
          start_frame_num: 0,
        });
        console.log('🎬 [ClipOrchestration] Added motion preset:', preset.name);
      }
    }

    // 4. Execute generation
    const result = await this.executeGeneration(
      request.clipId,
      model,
      enhancedPrompt,
      generationConfig
    );

    return {
      success: !result.error,
      clipId: request.clipId,
      jobId: result.jobId,
      videoUrl: result.videoUrl,
      error: result.error,
      resolvedModelId: model.id,
      promptTemplateId: template?.id,
      enhancedPrompt,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Map raw database row to ResolvedModel
   */
  private static mapToResolvedModel(data: Record<string, unknown>): ResolvedModel {
    const provider = data.api_providers as Record<string, unknown>;

    return {
      id: data.id as string,
      model_key: data.model_key as string,
      display_name: data.display_name as string,
      modality: data.modality as string,
      tasks: (data.tasks as string[]) || [],
      capabilities: (data.capabilities as Record<string, unknown>) || {},
      input_defaults: (data.input_defaults as Record<string, unknown>) || {},
      endpoint_path: data.endpoint_path as string | null,
      provider: {
        id: provider.id as string,
        name: provider.name as string,
        display_name: provider.display_name as string,
      },
    };
  }

  /**
   * Get recommended clip type based on context
   */
  static getRecommendedClipType(context: {
    isFirstClip: boolean;
    previousClipType?: ClipType;
    sceneMood?: string;
    hasMotionPreset: boolean;
  }): ClipType {
    // First clip should establish identity
    if (context.isFirstClip) {
      return 'quick';
    }

    // If motion preset selected, use controlled
    if (context.hasMotionPreset) {
      return 'controlled';
    }

    // After a quick clip, extended is often best for continuity
    if (context.previousClipType === 'quick') {
      return 'extended';
    }

    // Default to extended for continuation
    return 'extended';
  }
}
