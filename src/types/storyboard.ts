// Storyboard system types
// Supports frame chaining architecture for WAN 2.1 I2V

import { Character, UserCharacter } from './roleplay';

// ============================================================================
// PROJECT TYPES
// ============================================================================

export type ProjectStatus = 'draft' | 'in_progress' | 'rendering' | 'completed' | 'archived';
export type AspectRatio = '16:9' | '9:16' | '1:1';
export type QualityPreset = 'fast' | 'high';
export type ContentTier = 'sfw' | 'nsfw';
export type AIAssistanceLevel = 'none' | 'suggestions' | 'full';

export interface StoryBeat {
  id: string;
  order: number;
  title: string;
  description: string;
  mood?: string;
  suggestedDuration?: number;
  characters?: string[];
}

export interface StoryboardProject {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: ProjectStatus;

  // Project settings
  target_duration_seconds: number;
  aspect_ratio: AspectRatio;
  quality_preset: QualityPreset;
  content_tier: ContentTier;

  // AI assistance
  ai_assistance_level: AIAssistanceLevel;
  story_summary?: string;
  story_beats: StoryBeat[];

  // Character references
  primary_character_id?: string;
  primary_character?: Character;
  secondary_characters: string[];

  // Final output
  final_video_url?: string;
  final_video_duration_seconds?: number;

  // Roleplay integration
  source_conversation_id?: string;

  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SCENE TYPES
// ============================================================================

export type SceneStatus = 'planned' | 'generating' | 'has_clips' | 'approved' | 'failed';

export interface SceneCharacterRef {
  character_id: string;
  name: string;
  role?: string;
}

export interface StoryboardScene {
  id: string;
  project_id: string;
  scene_order: number;

  title?: string;
  description?: string;
  setting?: string;
  mood?: string;

  characters: SceneCharacterRef[];
  narrative_context?: string;
  suggested_prompts: string[];

  status: SceneStatus;
  target_duration_seconds: number;
  actual_duration_seconds?: number;

  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;

  // Populated relations
  clips?: StoryboardClip[];
}

// ============================================================================
// CLIP TYPES
// ============================================================================

export type ClipStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'approved';
export type ReferenceImageSource = 'extracted_frame' | 'uploaded' | 'generated' | 'character_portrait';

export interface StoryboardClip {
  id: string;
  scene_id: string;
  clip_order: number;

  prompt: string;
  model_used?: string;
  job_id?: string;
  api_model_id?: string;

  // Frame chaining
  reference_image_url?: string;
  reference_image_source?: ReferenceImageSource;

  // Output
  video_url?: string;
  thumbnail_url?: string;
  duration_seconds?: number;

  // Extracted frame for chaining to next clip
  extracted_frame_url?: string;
  extraction_percentage?: number;
  extraction_timestamp_ms?: number;

  status: ClipStatus;

  generation_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;

  // Populated relations
  frames?: StoryboardFrame[];
}

// ============================================================================
// FRAME TYPES
// ============================================================================

export type ExtractionMethod = 'percentage' | 'manual' | 'ai_selected';

export interface StoryboardFrame {
  id: string;
  clip_id: string;

  timestamp_ms: number;
  frame_url: string;
  thumbnail_url?: string;

  extraction_method: ExtractionMethod;
  quality_score?: number;

  is_chain_frame: boolean;
  used_in_clip_id?: string;

  metadata: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// RENDER TYPES
// ============================================================================

export type RenderQuality = 'preview' | 'standard' | 'high';
export type RenderStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type TransitionStyle = 'crossfade' | 'cut' | 'fade';

export interface StoryboardRender {
  id: string;
  project_id: string;

  render_quality: RenderQuality;
  include_transitions: boolean;
  transition_style: TransitionStyle;

  output_url?: string;
  output_duration_seconds?: number;
  file_size_bytes?: number;

  status: RenderStatus;
  progress_percentage: number;
  error_message?: string;

  started_at?: string;
  completed_at?: string;
  created_at: string;
}

// ============================================================================
// FRAME EXTRACTION RULES
// ============================================================================

/**
 * Frame extraction timing rules based on clip duration
 * Avoids first/last frames which are often unstable or motion-blurred
 */
export const FRAME_EXTRACTION_RULES: Record<string, { min: number; max: number; default: number }> = {
  '3-4': { min: 40, max: 55, default: 48 },
  '5-6': { min: 45, max: 60, default: 52 },
  '8-10': { min: 50, max: 65, default: 58 },
};

/**
 * Get optimal frame extraction percentage based on clip duration
 */
export function getOptimalExtractionPercentage(durationSeconds: number): { min: number; max: number; default: number } {
  if (durationSeconds <= 4) return FRAME_EXTRACTION_RULES['3-4'];
  if (durationSeconds <= 6) return FRAME_EXTRACTION_RULES['5-6'];
  return FRAME_EXTRACTION_RULES['8-10'];
}

// ============================================================================
// SERVICE INPUT/OUTPUT TYPES
// ============================================================================

export interface CreateProjectInput {
  title: string;
  description?: string;
  target_duration_seconds?: number;
  aspect_ratio?: AspectRatio;
  quality_preset?: QualityPreset;
  content_tier?: ContentTier;
  ai_assistance_level?: AIAssistanceLevel;
  primary_character_id?: string;
  source_conversation_id?: string;
}

export interface UpdateProjectInput {
  title?: string;
  description?: string;
  status?: ProjectStatus;
  target_duration_seconds?: number;
  aspect_ratio?: AspectRatio;
  quality_preset?: QualityPreset;
  content_tier?: ContentTier;
  ai_assistance_level?: AIAssistanceLevel;
  story_summary?: string;
  story_beats?: StoryBeat[];
  primary_character_id?: string;
  secondary_characters?: string[];
}

export interface CreateSceneInput {
  project_id: string;
  title?: string;
  description?: string;
  setting?: string;
  mood?: string;
  characters?: SceneCharacterRef[];
  target_duration_seconds?: number;
}

export interface UpdateSceneInput {
  title?: string;
  description?: string;
  setting?: string;
  mood?: string;
  characters?: SceneCharacterRef[];
  narrative_context?: string;
  suggested_prompts?: string[];
  status?: SceneStatus;
  target_duration_seconds?: number;
}

export interface CreateClipInput {
  scene_id: string;
  prompt: string;
  reference_image_url?: string;
  reference_image_source?: ReferenceImageSource;
  api_model_id?: string;
}

export interface UpdateClipInput {
  prompt?: string;
  status?: ClipStatus;
  video_url?: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  extracted_frame_url?: string;
  extraction_percentage?: number;
  extraction_timestamp_ms?: number;
}

export interface CreateRenderInput {
  project_id: string;
  render_quality?: RenderQuality;
  include_transitions?: boolean;
  transition_style?: TransitionStyle;
}

// ============================================================================
// AI ASSISTANCE TYPES
// ============================================================================

export interface StoryBeatGenerationRequest {
  project_description: string;
  target_scenes: number;
  characters: Array<{
    name: string;
    description?: string;
  }>;
  content_tier: ContentTier;
}

export interface SceneSuggestion {
  title: string;
  description: string;
  setting: string;
  mood: string;
  characters: string[];
  suggested_prompts: string[];
}

export interface ClipPromptSuggestion {
  initial_prompt: string;
  followup_prompt: string;
  motion_intent: string;
}

// ============================================================================
// ASSEMBLY TYPES
// ============================================================================

export interface AssemblyClip {
  id: string;
  order: number;
  video_url: string;
  duration_seconds: number;
  scene_id: string;
  scene_title?: string;
}

export interface ProjectAssembly {
  project_id: string;
  project_title: string;
  clips: AssemblyClip[];
  total_duration_seconds: number;
  aspect_ratio: AspectRatio;
  ready_for_render: boolean;
  missing_clips_count: number;
}
