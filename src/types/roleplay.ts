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
  created_by?: string;
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
  /** @deprecated Use metadata.image_url instead. Kept for backward compatibility. */
  scene_image?: string;
  /** @deprecated Use metadata.image_url instead. Kept for backward compatibility. */
  imageUrl?: string;
  consistency_method?: string;
  job_id?: string;
  metadata?: {
    scene_generated?: boolean;
    /** Canonical location for scene image URL */
    image_url?: string;
    raw_image_path?: string;
    consistency_method?: string;
    job_id?: string;
    needsRetry?: boolean;
    isError?: boolean;
    sceneError?: boolean;
    canRetryScene?: boolean;
    usedFallback?: boolean;
    generation_metadata?: any;
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
  gender?: string;
  appearance_tags?: string[];
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

// ============================================================================
// CHARACTER CREATION TYPES (Phase 3)
// ============================================================================

/**
 * Content rating for characters and scenarios
 * Default: 'nsfw' - All new content defaults to NSFW
 */
export type ContentRating = 'sfw' | 'nsfw';

/**
 * Age group for character identity (always adult)
 */
export type AgeGroup = 'adult' | 'mature';

/**
 * Character type/species
 */
export type CharacterType = 'human' | 'android' | 'fantasy' | 'alien' | 'other';

/**
 * Emotional baseline options
 */
export type EmotionalBaseline = 'warm' | 'reserved' | 'intense' | 'calm' | 'playful';

/**
 * Social style options
 */
export type SocialStyle = 'confident' | 'shy' | 'teasing' | 'formal' | 'dominant' | 'nurturing';

/**
 * Temperament options
 */
export type Temperament = 'calm' | 'impulsive' | 'disciplined' | 'passionate' | 'analytical';

/**
 * Voice tone options
 */
export type VoiceTone = 'warm' | 'direct' | 'teasing' | 'formal' | 'soft-spoken' | 'confident' | 'playful';

/**
 * Emotional arc progression types
 */
export type EmotionalArc = 'slow_trust' | 'gradual_openness' | 'stable' | 'guarded_to_open';

/**
 * Character role types
 */
export type CharacterRole = 'companion' | 'romantic_interest' | 'mentor' | 'rival' | 'authority' | 'equal_partner';

/**
 * 6-Layer Character Structure stored in scene_behavior_rules jsonb
 */
export interface CharacterLayers {
  identity: {
    ageGroup: AgeGroup;
    characterType: CharacterType;
    pronouns?: string;
  };
  personality: {
    emotionalBaseline: EmotionalBaseline;
    socialStyle: SocialStyle;
    temperament?: Temperament;
    values?: string[];  // e.g., ['loyal', 'curious', 'independent']
  };
  appearance?: {
    hairDescription?: string;
    clothingStyle?: string;
    bodyType?: string;
    distinctiveFeatures?: string[];
    visualPromptBridge?: string;  // For image generation: "When generating images, depict as..."
  };
  voice: {
    tone: VoiceTone;
    verbosity?: 'concise' | 'balanced' | 'expressive';
    dialogueStyle?: string;
    emotionalOpenness?: 'guarded' | 'balanced' | 'transparent';
    usesHumor?: boolean;
    usesInternalThoughts?: boolean;
    leadsConversations?: boolean;
  };
  role: {
    type: CharacterRole;
    relationshipContext?: 'stranger' | 'acquaintance' | 'established' | 'fictional';
    backstoryPoints?: string[];  // 2-5 bullet points
  };
  constraints: {
    behavioralLimits?: string[];  // e.g., ['avoids cruelty', 'respects boundaries']
    emotionalLimits?: string[];   // e.g., ['slow to trust', 'guarded about past']
    contentLimits?: string[];     // platform-specific
    forbiddenBehaviors?: string[];
  };
  advanced?: {
    emotionalArc?: EmotionalArc;
    memoryAnchors?: string[];  // Key facts never to forget
  };
}

/**
 * Wizard step types for character creation
 */
export type CharacterCreationStep =
  | 'identity'
  | 'personality'
  | 'appearance'
  | 'voice'
  | 'role'
  | 'review';

/**
 * Character creation wizard state
 */
export interface CharacterCreationState {
  currentStep: CharacterCreationStep;
  isDetailedMode: boolean;
  contentRating: ContentRating;  // Default: 'nsfw'
  // Basic fields (existing character table columns)
  name: string;
  description: string;
  gender: string;
  traits: string;
  persona: string;
  appearance_tags: string[];
  voice_tone: string;
  mood: string;
  role: string;
  voice_examples: string[];
  forbidden_phrases: string[];
  image_url?: string;
  // Structured layers (stored in scene_behavior_rules)
  layers: Partial<CharacterLayers>;
}

/**
 * AI suggestion request for character creation "sprinkle" feature
 */
export interface AISuggestionRequest {
  type: 'traits' | 'voice' | 'appearance' | 'backstory' | 'voice_examples' | 'all';
  characterName?: string;
  existingTraits?: string[];
  existingPersonality?: Partial<CharacterLayers['personality']>;
  existingRole?: Partial<CharacterLayers['role']>;
  contentRating: ContentRating;
}

/**
 * AI suggestion response for character creation
 */
export interface AISuggestionResponse {
  suggestedTraits?: string[];
  suggestedVoiceTone?: VoiceTone;
  suggestedAppearance?: string[];
  suggestedBackstory?: string[];
  suggestedVoiceExamples?: string[];
  suggestedPersona?: string;
  suggestedForbiddenPhrases?: string[];
}

// ============================================================================
// SCENARIO SETUP TYPES (Phase 4)
// ============================================================================

/**
 * Scenario type categories
 */
export type ScenarioType =
  | 'stranger'         // Stranger Encounter
  | 'relationship'     // Established Relationship
  | 'power_dynamic'    // Power Dynamic (consensual)
  | 'fantasy'          // Fantasy World
  | 'slow_burn';       // Slow Burn / Emotional Tension

/**
 * Scenario intensity levels
 */
export type ScenarioIntensity = 'gentle' | 'moderate' | 'intense';

/**
 * Scenario pacing options
 */
export type ScenarioPacing = 'slow' | 'balanced' | 'fast';

/**
 * Writing perspective options
 */
export type WritingPerspective = 'first' | 'third' | 'mixed';

/**
 * Message length options
 */
export type MessageLength = 'short' | 'medium' | 'long';

/**
 * Dialogue weight options
 */
export type DialogueWeight = 'dialogue_heavy' | 'balanced' | 'narration_heavy';

/**
 * Initiator options
 */
export type ConversationInitiator = 'user' | 'partner' | 'alternating';

/**
 * Scenario hook templates
 */
export type ScenarioHookTemplate =
  | 'misunderstanding'
  | 'reunion'
  | 'secret'
  | 'challenge'
  | 'confession'
  | 'custom';

/**
 * Scenario goal options
 */
export type ScenarioGoal =
  | 'reconnect'
  | 'tease'
  | 'resolve_tension'
  | 'explore_dynamic'
  | 'story_chapter';

/**
 * Character role in scenario
 */
export interface ScenarioCharacterRole {
  id?: string;
  name: string;
  traits?: string[];
  voice?: string;
}

/**
 * Scenario setting configuration
 */
export interface ScenarioSetting {
  location: string;
  timeOfDay?: 'morning' | 'afternoon' | 'night';
  realism?: boolean;
  cinematic?: boolean;
}

/**
 * Scenario atmosphere sliders (0-100)
 */
export interface ScenarioAtmosphere {
  romance: number;
  playfulness: number;
  tension: number;
  drama: number;
}

/**
 * Scenario consent and boundaries configuration
 */
export interface ScenarioConsent {
  adultOnlyConfirmed: boolean;
  fictionalConfirmed: boolean;
  intensity: ScenarioIntensity;
  pacing: ScenarioPacing;
  limits: {
    hard: string[];
    soft: string[];
  };
  safeStop?: {
    enabled: boolean;
    phrase?: string;
  };
}

/**
 * Scenario interaction style configuration
 */
export interface ScenarioStyle {
  perspective: WritingPerspective;
  messageLength: MessageLength;
  dialogueWeight: DialogueWeight;
  innerThoughts?: boolean;
  initiator: ConversationInitiator;
}

/**
 * Scenario hook configuration
 */
export interface ScenarioHook {
  templateId?: ScenarioHookTemplate;
  customText?: string;
  goal?: ScenarioGoal;
}

/**
 * Complete Scenario Session Payload (per wireframe spec)
 * This is the final output of the Scenario Setup Wizard
 */
export interface ScenarioSessionPayload {
  type: ScenarioType;
  characters: {
    userRole?: ScenarioCharacterRole;
    partnerRole: ScenarioCharacterRole;
    extras?: ScenarioCharacterRole[];
  };
  relationshipContext: string;
  setting: ScenarioSetting;
  atmosphere: ScenarioAtmosphere;
  consent: ScenarioConsent;
  style: ScenarioStyle;
  hook: ScenarioHook;
  ui?: {
    showTips?: boolean;
    saveAsTemplate?: boolean;
    templateName?: string;
  };
  contentTier: ContentRating;  // Default: 'nsfw'
  aiCharacterId?: string;  // ID of the selected AI character
}

/**
 * Wizard step types for scenario setup
 */
export type ScenarioWizardStep =
  | 'mode_select'
  | 'age_gate'
  | 'scenario_type'
  | 'characters'
  | 'setting'
  | 'consent'
  | 'style'
  | 'hook'
  | 'review';

/**
 * Scenario wizard state
 */
export interface ScenarioWizardState {
  currentStep: ScenarioWizardStep;
  isQuickStart: boolean;
  payload: Partial<ScenarioSessionPayload>;
  validation: {
    [key in ScenarioWizardStep]?: boolean;
  };
}

/**
 * Scenario type metadata for UI display
 */
export interface ScenarioTypeMetadata {
  type: ScenarioType;
  label: string;
  description: string;
  pacing: 'slow' | 'medium' | 'fast';
  toneRange: string;  // e.g., "Soft → Intense"
  bestFor: string;    // e.g., "Dialogue / Story / Dynamic"
  defaultRelationshipContext: string;
}

/**
 * Predefined scenario type metadata
 */
export const SCENARIO_TYPE_METADATA: Record<ScenarioType, ScenarioTypeMetadata> = {
  stranger: {
    type: 'stranger',
    label: 'Stranger Encounter',
    description: 'First meeting with unknown chemistry',
    pacing: 'fast',
    toneRange: 'Light → Intense',
    bestFor: 'Tension / Discovery',
    defaultRelationshipContext: 'Just met'
  },
  relationship: {
    type: 'relationship',
    label: 'Established Relationship',
    description: 'Partners with history and comfort',
    pacing: 'medium',
    toneRange: 'Warm → Passionate',
    bestFor: 'Intimacy / Connection',
    defaultRelationshipContext: 'Partners'
  },
  power_dynamic: {
    type: 'power_dynamic',
    label: 'Power Dynamic',
    description: 'Consensual role-based dynamics',
    pacing: 'medium',
    toneRange: 'Controlled → Intense',
    bestFor: 'Dynamic Exploration',
    defaultRelationshipContext: 'Role-based dynamic'
  },
  fantasy: {
    type: 'fantasy',
    label: 'Fantasy World',
    description: 'Otherworldly settings and scenarios',
    pacing: 'slow',
    toneRange: 'Magical → Epic',
    bestFor: 'Story / World-building',
    defaultRelationshipContext: 'World-dependent'
  },
  slow_burn: {
    type: 'slow_burn',
    label: 'Slow Burn',
    description: 'Building tension over time',
    pacing: 'slow',
    toneRange: 'Subtle → Simmering',
    bestFor: 'Emotional Tension',
    defaultRelationshipContext: 'Unspoken tension'
  }
};

/**
 * Scenario hook template metadata
 */
export const SCENARIO_HOOK_TEMPLATES: Record<ScenarioHookTemplate, { label: string; description: string }> = {
  misunderstanding: {
    label: 'A small misunderstanding',
    description: 'Something was said or done that needs clarification'
  },
  reunion: {
    label: 'A long-awaited reunion',
    description: 'Coming together after time apart'
  },
  secret: {
    label: 'A risky secret',
    description: 'Something hidden that wants to come out'
  },
  challenge: {
    label: 'A playful challenge',
    description: 'A bet, dare, or game between characters'
  },
  confession: {
    label: 'A quiet confession',
    description: 'Admitting something important or vulnerable'
  },
  custom: {
    label: 'Custom',
    description: 'Write your own opening hook'
  }
};

// ============================================================================
// SCENE GALLERY TYPES (Phase 3)
// ============================================================================

/**
 * Scene atmosphere settings (0-100 sliders)
 * Maps to ScenarioAtmosphere in ScenarioSetupWizard
 */
export interface SceneAtmosphere {
  romance: number;
  playfulness: number;
  tension: number;
  drama: number;
}

/**
 * Scene template for the Scene Gallery
 * Global templates that can be populated with any character(s)
 * Different from CharacterScene which is tied to a specific character
 */
export interface SceneTemplate {
  id: string;
  name: string;
  description?: string;
  creator_id?: string;

  // Maps to ScenarioSetupWizard fields
  scenario_type?: ScenarioType;
  setting?: string;
  atmosphere?: SceneAtmosphere;
  time_of_day?: 'morning' | 'afternoon' | 'night';

  // Character config
  min_characters: number;
  max_characters: number;
  suggested_user_role?: string;

  // Content & discovery
  content_rating: ContentRating;
  tags: string[];
  is_public: boolean;
  usage_count: number;

  // Visual & starters
  preview_image_url?: string;
  scene_starters: string[];
  scene_prompt?: string;

  created_at: string;
  updated_at: string;
}

/**
 * Scene template filter options for gallery
 */
export type SceneTemplateFilter = 'all' | 'sfw' | 'nsfw' | 'popular' | 'recent';
