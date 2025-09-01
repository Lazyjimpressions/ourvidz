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
}

export interface RoleplaySettings {
  memoryTier: 'conversation' | 'character' | 'profile';
  modelProvider: 'chat_worker' | 'openrouter' | 'claude' | 'gpt';
  contentTier: 'sfw' | 'nsfw';
  sceneGeneration: boolean;
}

export interface ConsistencySettings {
  method: 'hybrid' | 'i2i_reference' | 'seed_locked';
  reference_strength: number;
  denoise_strength: number;
  modify_strength: number;
}
