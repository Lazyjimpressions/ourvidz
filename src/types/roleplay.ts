// Shared types for roleplay system

export interface Character {
  id: string;
  name: string;
  description: string;
  image_url: string;
  preview_image_url?: string;
  category?: string;
  consistency_method?: string;
  base_prompt?: string;
  quick_start?: boolean;
  content_rating?: string;
  // Additional database fields
  traits?: string;
  appearance_tags?: string[];
  persona?: string;
  system_prompt?: string;
  voice_tone?: string;
  mood?: string;
  creator_id?: string;
  likes_count?: number;
  interaction_count?: number;
  reference_image_url?: string;
  is_public?: boolean;
  gender?: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  // New voice-related fields
  voice_examples?: string[];
  forbidden_phrases?: string[];
  scene_behavior_rules?: any;
  // Character consistency fields
  seed_locked?: number;
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'character';
  timestamp: string;
  scene_image?: string;
  consistency_method?: string;
  job_id?: string;
  metadata?: {
    scene_generated?: boolean;
    image_url?: string;
    raw_image_path?: string;
    consistency_method?: string;
    job_id?: string;
    needsRetry?: boolean;
    isError?: boolean;
    sceneError?: boolean;
    canRetryScene?: boolean;
  };
}

export interface CharacterScene {
  id: string;
  character_id: string;
  conversation_id?: string;
  image_url?: string;
  scene_prompt: string;
  system_prompt?: string;
  generation_metadata?: any;
  job_id?: string;
  created_at: string;
  updated_at: string;
  // New scene-related fields
  scene_name?: string;
  scene_description?: string;
  scene_rules?: string;
  scene_starters?: string[];
  priority?: number;
  is_active?: boolean;
}

/**
 * User character representation for roleplay (subset of Character)
 * Used when the user wants to be represented in the conversation
 */
export interface UserCharacter {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  appearance_tags: string[];
  persona?: string;
  image_url?: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  character_id: string;
  conversation_type: string;
  title: string;
  status: string;
  memory_tier: 'conversation' | 'character' | 'profile';
  created_at: string;
  updated_at: string;
  messages?: Message[];
  // User character linkage
  user_character_id?: string;
  user_character?: UserCharacter;
}

/**
 * Scene style options for image generation
 * - character_only: Only show the AI character (default, current behavior)
 * - pov: First-person view from user's perspective
 * - both_characters: Show both AI character and user character in scene
 */
export type SceneStyle = 'character_only' | 'pov' | 'both_characters';

export interface RoleplaySettings {
  memoryTier: 'conversation' | 'character' | 'profile';
  modelProvider: 'chat_worker' | 'openrouter' | 'claude' | 'gpt';
  contentTier: 'sfw' | 'nsfw';
  sceneGeneration: boolean;
  sceneStyle?: SceneStyle;
}

export interface ConsistencySettings {
  method: 'hybrid' | 'i2i_reference' | 'seed_locked';
  reference_strength: number;
  denoise_strength: number;
  modify_strength: number;
}
