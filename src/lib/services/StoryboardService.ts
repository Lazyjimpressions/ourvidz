import { supabase } from '@/integrations/supabase/client';
import {
  StoryboardProject,
  StoryboardScene,
  StoryboardClip,
  StoryboardFrame,
  StoryboardRender,
  CreateProjectInput,
  UpdateProjectInput,
  CreateSceneInput,
  UpdateSceneInput,
  CreateClipInput,
  UpdateClipInput,
  CreateRenderInput,
  ProjectAssembly,
  AssemblyClip,
} from '@/types/storyboard';

/**
 * StoryboardService - Handles all storyboard CRUD operations
 * Uses static methods for consistency with other services in the codebase
 */
export class StoryboardService {
  // ============================================================================
  // PROJECT OPERATIONS
  // ============================================================================

  /**
   * List all projects for the current user
   */
  static async listProjects(): Promise<StoryboardProject[]> {
    const { data, error } = await supabase
      .from('storyboard_projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching storyboard projects:', error);
      throw error;
    }

    return (data || []).map(this.mapProject);
  }

  /**
   * Get a single project by ID with optional relations
   */
  static async getProject(projectId: string, includeScenes = false): Promise<StoryboardProject | null> {
    let query = supabase
      .from('storyboard_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error fetching project:', error);
      throw error;
    }

    const project = this.mapProject(data);

    // Optionally load scenes
    if (includeScenes) {
      const scenes = await this.listScenes(projectId);
      return { ...project, scenes } as StoryboardProject & { scenes: StoryboardScene[] };
    }

    return project;
  }

  /**
   * Create a new project
   */
  static async createProject(input: CreateProjectInput): Promise<StoryboardProject> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('storyboard_projects')
      .insert({
        user_id: userData.user.id,
        title: input.title,
        description: input.description || null,
        target_duration_seconds: input.target_duration_seconds || 30,
        aspect_ratio: input.aspect_ratio || '16:9',
        quality_preset: input.quality_preset || 'high',
        content_tier: input.content_tier || 'nsfw',
        ai_assistance_level: input.ai_assistance_level || 'full',
        primary_character_id: input.primary_character_id || null,
        source_conversation_id: input.source_conversation_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      throw error;
    }

    return this.mapProject(data);
  }

  /**
   * Update a project
   */
  static async updateProject(projectId: string, input: UpdateProjectInput): Promise<StoryboardProject> {
    const updateData: Record<string, unknown> = {};

    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.target_duration_seconds !== undefined) updateData.target_duration_seconds = input.target_duration_seconds;
    if (input.aspect_ratio !== undefined) updateData.aspect_ratio = input.aspect_ratio;
    if (input.quality_preset !== undefined) updateData.quality_preset = input.quality_preset;
    if (input.content_tier !== undefined) updateData.content_tier = input.content_tier;
    if (input.ai_assistance_level !== undefined) updateData.ai_assistance_level = input.ai_assistance_level;
    if (input.story_summary !== undefined) updateData.story_summary = input.story_summary;
    if (input.story_beats !== undefined) updateData.story_beats = input.story_beats;
    if (input.primary_character_id !== undefined) updateData.primary_character_id = input.primary_character_id;
    if (input.secondary_characters !== undefined) updateData.secondary_characters = input.secondary_characters;

    const { data, error } = await supabase
      .from('storyboard_projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      throw error;
    }

    return this.mapProject(data);
  }

  /**
   * Delete a project (cascades to scenes, clips, frames, renders)
   */
  static async deleteProject(projectId: string): Promise<void> {
    const { error } = await supabase
      .from('storyboard_projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  // ============================================================================
  // SCENE OPERATIONS
  // ============================================================================

  /**
   * List all scenes for a project
   * @param projectId - The project ID
   * @param includeClips - Whether to load clips for each scene (default: true)
   */
  static async listScenes(projectId: string, includeClips = true): Promise<StoryboardScene[]> {
    const { data, error } = await supabase
      .from('storyboard_scenes')
      .select('*')
      .eq('project_id', projectId)
      .order('scene_order', { ascending: true });

    if (error) {
      console.error('Error fetching scenes:', error);
      throw error;
    }

    const scenes = (data || []).map(this.mapScene);

    // Optionally load clips for each scene
    if (includeClips) {
      for (const scene of scenes) {
        const clips = await this.listClips(scene.id);
        scene.clips = clips;
      }
    }

    return scenes;
  }

  /**
   * Get a single scene with optional clips
   */
  static async getScene(sceneId: string, includeClips = false): Promise<StoryboardScene | null> {
    const { data, error } = await supabase
      .from('storyboard_scenes')
      .select('*')
      .eq('id', sceneId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching scene:', error);
      throw error;
    }

    const scene = this.mapScene(data);

    if (includeClips) {
      const clips = await this.listClips(sceneId);
      return { ...scene, clips };
    }

    return scene;
  }

  /**
   * Create a new scene
   */
  static async createScene(input: CreateSceneInput): Promise<StoryboardScene> {
    // Get current max order
    const { data: existingScenes } = await supabase
      .from('storyboard_scenes')
      .select('scene_order')
      .eq('project_id', input.project_id)
      .order('scene_order', { ascending: false })
      .limit(1);

    const nextOrder = (existingScenes?.[0]?.scene_order ?? -1) + 1;

    const { data, error } = await supabase
      .from('storyboard_scenes')
      .insert({
        project_id: input.project_id,
        scene_order: nextOrder,
        title: input.title || `Scene ${nextOrder + 1}`,
        description: input.description || null,
        setting: input.setting || null,
        mood: input.mood || null,
        characters: input.characters || [],
        target_duration_seconds: input.target_duration_seconds || 5,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating scene:', error);
      throw error;
    }

    return this.mapScene(data);
  }

  /**
   * Update a scene
   */
  static async updateScene(sceneId: string, input: UpdateSceneInput): Promise<StoryboardScene> {
    const updateData: Record<string, unknown> = {};

    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.setting !== undefined) updateData.setting = input.setting;
    if (input.mood !== undefined) updateData.mood = input.mood;
    if (input.characters !== undefined) updateData.characters = input.characters;
    if (input.narrative_context !== undefined) updateData.narrative_context = input.narrative_context;
    if (input.suggested_prompts !== undefined) updateData.suggested_prompts = input.suggested_prompts;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.target_duration_seconds !== undefined) updateData.target_duration_seconds = input.target_duration_seconds;

    const { data, error } = await supabase
      .from('storyboard_scenes')
      .update(updateData)
      .eq('id', sceneId)
      .select()
      .single();

    if (error) {
      console.error('Error updating scene:', error);
      throw error;
    }

    return this.mapScene(data);
  }

  /**
   * Delete a scene
   */
  static async deleteScene(sceneId: string): Promise<void> {
    const { error } = await supabase
      .from('storyboard_scenes')
      .delete()
      .eq('id', sceneId);

    if (error) {
      console.error('Error deleting scene:', error);
      throw error;
    }
  }

  /**
   * Reorder scenes within a project
   */
  static async reorderScenes(projectId: string, sceneIds: string[]): Promise<void> {
    // Update each scene's order in a batch
    const updates = sceneIds.map((id, index) => ({
      id,
      scene_order: index,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('storyboard_scenes')
        .update({ scene_order: update.scene_order })
        .eq('id', update.id)
        .eq('project_id', projectId);

      if (error) {
        console.error('Error reordering scene:', error);
        throw error;
      }
    }
  }

  // ============================================================================
  // CLIP OPERATIONS
  // ============================================================================

  /**
   * List all clips for a scene
   */
  static async listClips(sceneId: string): Promise<StoryboardClip[]> {
    const { data, error } = await supabase
      .from('storyboard_clips')
      .select('*')
      .eq('scene_id', sceneId)
      .order('clip_order', { ascending: true });

    if (error) {
      console.error('Error fetching clips:', error);
      throw error;
    }

    return (data || []).map(this.mapClip);
  }

  /**
   * Get a single clip
   */
  static async getClip(clipId: string): Promise<StoryboardClip | null> {
    const { data, error } = await supabase
      .from('storyboard_clips')
      .select('*')
      .eq('id', clipId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching clip:', error);
      throw error;
    }

    return this.mapClip(data);
  }

  /**
   * Create a new clip
   */
  static async createClip(input: CreateClipInput): Promise<StoryboardClip> {
    // Get current max order
    const { data: existingClips } = await supabase
      .from('storyboard_clips')
      .select('clip_order')
      .eq('scene_id', input.scene_id)
      .order('clip_order', { ascending: false })
      .limit(1);

    const nextOrder = (existingClips?.[0]?.clip_order ?? -1) + 1;

    const { data, error } = await supabase
      .from('storyboard_clips')
      .insert({
        scene_id: input.scene_id,
        clip_order: nextOrder,
        prompt: input.prompt,
        reference_image_url: input.reference_image_url || null,
        reference_image_source: input.reference_image_source || null,
        api_model_id: input.api_model_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating clip:', error);
      throw error;
    }

    return this.mapClip(data);
  }

  /**
   * Update a clip
   */
  static async updateClip(clipId: string, input: UpdateClipInput): Promise<StoryboardClip> {
    const updateData: Record<string, unknown> = {};

    if (input.prompt !== undefined) updateData.prompt = input.prompt;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.video_url !== undefined) updateData.video_url = input.video_url;
    if (input.thumbnail_url !== undefined) updateData.thumbnail_url = input.thumbnail_url;
    if (input.duration_seconds !== undefined) updateData.duration_seconds = input.duration_seconds;
    if (input.extracted_frame_url !== undefined) updateData.extracted_frame_url = input.extracted_frame_url;
    if (input.extraction_percentage !== undefined) updateData.extraction_percentage = input.extraction_percentage;
    if (input.extraction_timestamp_ms !== undefined) updateData.extraction_timestamp_ms = input.extraction_timestamp_ms;

    const { data, error } = await supabase
      .from('storyboard_clips')
      .update(updateData)
      .eq('id', clipId)
      .select()
      .single();

    if (error) {
      console.error('Error updating clip:', error);
      throw error;
    }

    return this.mapClip(data);
  }

  /**
   * Delete a clip
   */
  static async deleteClip(clipId: string): Promise<void> {
    const { error } = await supabase
      .from('storyboard_clips')
      .delete()
      .eq('id', clipId);

    if (error) {
      console.error('Error deleting clip:', error);
      throw error;
    }
  }

  // ============================================================================
  // FRAME OPERATIONS
  // ============================================================================

  /**
   * List all frames for a clip
   */
  static async listFrames(clipId: string): Promise<StoryboardFrame[]> {
    const { data, error } = await supabase
      .from('storyboard_frames')
      .select('*')
      .eq('clip_id', clipId)
      .order('timestamp_ms', { ascending: true });

    if (error) {
      console.error('Error fetching frames:', error);
      throw error;
    }

    return (data || []).map(this.mapFrame);
  }

  /**
   * Create a frame record
   */
  static async createFrame(
    clipId: string,
    timestampMs: number,
    frameUrl: string,
    extractionMethod: 'percentage' | 'manual' | 'ai_selected' = 'percentage',
    isChainFrame = false
  ): Promise<StoryboardFrame> {
    const { data, error } = await supabase
      .from('storyboard_frames')
      .insert({
        clip_id: clipId,
        timestamp_ms: timestampMs,
        frame_url: frameUrl,
        extraction_method: extractionMethod,
        is_chain_frame: isChainFrame,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating frame:', error);
      throw error;
    }

    return this.mapFrame(data);
  }

  /**
   * Mark a frame as the chain frame for the next clip
   */
  static async setChainFrame(frameId: string, nextClipId: string): Promise<void> {
    const { error } = await supabase
      .from('storyboard_frames')
      .update({
        is_chain_frame: true,
        used_in_clip_id: nextClipId,
      })
      .eq('id', frameId);

    if (error) {
      console.error('Error setting chain frame:', error);
      throw error;
    }
  }

  // ============================================================================
  // RENDER OPERATIONS
  // ============================================================================

  /**
   * List all renders for a project
   */
  static async listRenders(projectId: string): Promise<StoryboardRender[]> {
    const { data, error } = await supabase
      .from('storyboard_renders')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching renders:', error);
      throw error;
    }

    return (data || []).map(this.mapRender);
  }

  /**
   * Create a render job
   */
  static async createRender(input: CreateRenderInput): Promise<StoryboardRender> {
    const { data, error } = await supabase
      .from('storyboard_renders')
      .insert({
        project_id: input.project_id,
        render_quality: input.render_quality || 'high',
        include_transitions: input.include_transitions ?? true,
        transition_style: input.transition_style || 'crossfade',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating render:', error);
      throw error;
    }

    return this.mapRender(data);
  }

  // ============================================================================
  // ASSEMBLY OPERATIONS
  // ============================================================================

  /**
   * Get project assembly data for preview/render
   */
  static async getProjectAssembly(projectId: string): Promise<ProjectAssembly> {
    const project = await this.getProject(projectId);
    if (!project) throw new Error('Project not found');

    const scenes = await this.listScenes(projectId);
    const assemblyClips: AssemblyClip[] = [];
    let missingClips = 0;

    for (const scene of scenes) {
      const clips = await this.listClips(scene.id);
      for (const clip of clips) {
        if (clip.status === 'completed' && clip.video_url) {
          assemblyClips.push({
            id: clip.id,
            order: assemblyClips.length,
            video_url: clip.video_url,
            duration_seconds: clip.duration_seconds || 5,
            scene_id: scene.id,
            scene_title: scene.title,
          });
        } else if (clip.status !== 'completed') {
          missingClips++;
        }
      }
    }

    const totalDuration = assemblyClips.reduce((sum, clip) => sum + clip.duration_seconds, 0);

    return {
      project_id: projectId,
      project_title: project.title,
      clips: assemblyClips,
      total_duration_seconds: totalDuration,
      aspect_ratio: project.aspect_ratio,
      ready_for_render: missingClips === 0 && assemblyClips.length > 0,
      missing_clips_count: missingClips,
    };
  }

  // ============================================================================
  // PRIVATE MAPPING FUNCTIONS
  // ============================================================================

  private static mapProject(data: Record<string, unknown>): StoryboardProject {
    return {
      id: data.id as string,
      user_id: data.user_id as string,
      title: data.title as string,
      description: data.description as string | undefined,
      status: data.status as StoryboardProject['status'],
      target_duration_seconds: data.target_duration_seconds as number,
      aspect_ratio: data.aspect_ratio as StoryboardProject['aspect_ratio'],
      quality_preset: data.quality_preset as StoryboardProject['quality_preset'],
      content_tier: data.content_tier as StoryboardProject['content_tier'],
      ai_assistance_level: data.ai_assistance_level as StoryboardProject['ai_assistance_level'],
      story_summary: data.story_summary as string | undefined,
      story_beats: (data.story_beats as StoryboardProject['story_beats']) || [],
      primary_character_id: data.primary_character_id as string | undefined,
      secondary_characters: (data.secondary_characters as string[]) || [],
      final_video_url: data.final_video_url as string | undefined,
      final_video_duration_seconds: data.final_video_duration_seconds as number | undefined,
      source_conversation_id: data.source_conversation_id as string | undefined,
      metadata: (data.metadata as Record<string, unknown>) || {},
      created_at: data.created_at as string,
      updated_at: data.updated_at as string,
    };
  }

  private static mapScene(data: Record<string, unknown>): StoryboardScene {
    return {
      id: data.id as string,
      project_id: data.project_id as string,
      scene_order: data.scene_order as number,
      title: data.title as string | undefined,
      description: data.description as string | undefined,
      setting: data.setting as string | undefined,
      mood: data.mood as string | undefined,
      characters: (data.characters as StoryboardScene['characters']) || [],
      narrative_context: data.narrative_context as string | undefined,
      suggested_prompts: (data.suggested_prompts as string[]) || [],
      status: data.status as StoryboardScene['status'],
      target_duration_seconds: data.target_duration_seconds as number,
      actual_duration_seconds: data.actual_duration_seconds as number | undefined,
      metadata: (data.metadata as Record<string, unknown>) || {},
      created_at: data.created_at as string,
      updated_at: data.updated_at as string,
    };
  }

  private static mapClip(data: Record<string, unknown>): StoryboardClip {
    return {
      id: data.id as string,
      scene_id: data.scene_id as string,
      clip_order: data.clip_order as number,
      prompt: data.prompt as string,
      model_used: data.model_used as string | undefined,
      job_id: data.job_id as string | undefined,
      api_model_id: data.api_model_id as string | undefined,
      reference_image_url: data.reference_image_url as string | undefined,
      reference_image_source: data.reference_image_source as StoryboardClip['reference_image_source'],
      video_url: data.video_url as string | undefined,
      thumbnail_url: data.thumbnail_url as string | undefined,
      duration_seconds: data.duration_seconds as number | undefined,
      extracted_frame_url: data.extracted_frame_url as string | undefined,
      extraction_percentage: data.extraction_percentage as number | undefined,
      extraction_timestamp_ms: data.extraction_timestamp_ms as number | undefined,
      status: data.status as StoryboardClip['status'],
      generation_metadata: (data.generation_metadata as Record<string, unknown>) || {},
      created_at: data.created_at as string,
      updated_at: data.updated_at as string,
    };
  }

  private static mapFrame(data: Record<string, unknown>): StoryboardFrame {
    return {
      id: data.id as string,
      clip_id: data.clip_id as string,
      timestamp_ms: data.timestamp_ms as number,
      frame_url: data.frame_url as string,
      thumbnail_url: data.thumbnail_url as string | undefined,
      extraction_method: data.extraction_method as StoryboardFrame['extraction_method'],
      quality_score: data.quality_score as number | undefined,
      is_chain_frame: data.is_chain_frame as boolean,
      used_in_clip_id: data.used_in_clip_id as string | undefined,
      metadata: (data.metadata as Record<string, unknown>) || {},
      created_at: data.created_at as string,
    };
  }

  private static mapRender(data: Record<string, unknown>): StoryboardRender {
    return {
      id: data.id as string,
      project_id: data.project_id as string,
      render_quality: data.render_quality as StoryboardRender['render_quality'],
      include_transitions: data.include_transitions as boolean,
      transition_style: data.transition_style as StoryboardRender['transition_style'],
      output_url: data.output_url as string | undefined,
      output_duration_seconds: data.output_duration_seconds as number | undefined,
      file_size_bytes: data.file_size_bytes as number | undefined,
      status: data.status as StoryboardRender['status'],
      progress_percentage: data.progress_percentage as number,
      error_message: data.error_message as string | undefined,
      started_at: data.started_at as string | undefined,
      completed_at: data.completed_at as string | undefined,
      created_at: data.created_at as string,
    };
  }
}
