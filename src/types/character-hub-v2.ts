/**
 * Character Hub V2 Type Extensions
 * 
 * These types extend the base Character interface from roleplay.ts
 * with new fields for Character Hub V2 and Character Studio V2 features.
 */

import { Character, CharacterScene } from './roleplay';

// ============================================================================
// EXTENDED CHARACTER TYPES
// ============================================================================

/**
 * Extended Character interface with V2 fields
 * Includes all fields from the base Character plus new schema additions
 */
export interface CharacterV2 extends Character {
    // Identity extras (from DB but not on base Character)
    bio?: string;
    tagline?: string;
    backstory?: string;
    first_message?: string;
    alternate_greetings?: any;
    default_presets?: any;
    portrait_count?: number;
    scene_count?: number;
    canon_spec?: string;

    // Style and rendering
    style_preset?: StylePreset;
    lighting?: LightingPreset;
    rendering_rules?: RenderingRules;

    // Character consistency - guardrails
    locked_traits?: string[];  // Must-keep traits for visual consistency
    avoid_traits?: string[];   // Traits to avoid in generation

    // Media generation defaults
    media_defaults?: MediaDefaults;

    // Personality data (structured)
    personality_traits?: PersonalityTraits;

    // Physical appearance (structured)
    physical_traits?: PhysicalTraits;

    // Outfit and items
    outfit_defaults?: string;
    signature_items?: string;

    // Relations
    character_anchors?: CharacterAnchor[];
}

// ============================================================================
// CHARACTER ANCHORS
// ============================================================================

/**
 * Anchor type for typed slots
 */
export type AnchorType = 'face' | 'body' | 'style';

/**
 * Character anchor image for visual consistency
 * Renamed from CharacterPortrait to match PRD terminology "anchor-based consistency"
 * Stored in character_anchors table
 */
export interface CharacterAnchor {
    id: string;
    character_id: string;
    image_url: string;
    is_primary: boolean;
    anchor_type?: AnchorType;  // 'face' | 'body' | 'style'
    created_at: string;
    updated_at: string;
}

// ============================================================================
// CHARACTER CANON OUTPUTS
// ============================================================================

/**
 * Pinned canonical outputs for a character
 * Stored in character_canon table
 */
export interface CharacterCanon {
    id: string;
    character_id: string;
    output_url: string;
    output_type: 'image' | 'video';
    is_pinned: boolean;
    metadata?: Record<string, any>;
    created_at: string;
}

// ============================================================================
// STYLE PRESETS
// ============================================================================

/**
 * Available style presets for character rendering
 */
export type StylePreset =
    | 'realistic'
    | 'anime'
    | 'cinematic'
    | '3d'
    | 'sketch'
    | 'custom';

export interface StylePresetOption {
    id: StylePreset;
    label: string;
    description: string;
    thumbnailUrl?: string;
}

export const STYLE_PRESET_OPTIONS: StylePresetOption[] = [
    {
        id: 'realistic',
        label: 'Realistic',
        description: 'Photographic, lifelike rendering'
    },
    {
        id: 'anime',
        label: 'Anime',
        description: 'Japanese anime/manga style'
    },
    {
        id: 'cinematic',
        label: 'Cinematic',
        description: 'Film-like, dramatic lighting'
    },
    {
        id: '3d',
        label: '3D Render',
        description: 'Computer-generated 3D look'
    },
    {
        id: 'sketch',
        label: 'Sketch',
        description: 'Hand-drawn illustration style'
    }
];

// ============================================================================
// LIGHTING PRESETS
// ============================================================================

/**
 * Available lighting presets for character rendering
 */
export type LightingPreset =
    | 'dramatic'
    | 'soft'
    | 'studio'
    | 'natural'
    | 'golden_hour'
    | 'neon';

export interface LightingOption {
    id: LightingPreset;
    label: string;
}

export const LIGHTING_OPTIONS: LightingOption[] = [
    { id: 'dramatic', label: 'Dramatic' },
    { id: 'soft', label: 'Soft' },
    { id: 'studio', label: 'Studio' },
    { id: 'natural', label: 'Natural' },
    { id: 'golden_hour', label: 'Golden Hour' },
    { id: 'neon', label: 'Neon' }
];

// ============================================================================
// MOOD OPTIONS
// ============================================================================

export const MOOD_OPTIONS = [
    'Mysterious',
    'Cheerful',
    'Intense',
    'Romantic',
    'Dark',
    'Ethereal',
    'Playful',
    'Serious'
] as const;

export type MoodPreset = typeof MOOD_OPTIONS[number];

// ============================================================================
// RENDERING RULES
// ============================================================================

/**
 * Rendering rule settings for sharpness, grain, texture
 * Values are 0-100
 */
export interface RenderingRules {
    sharpness: number;  // 0 = soft focus, 100 = sharp
    grain: number;      // 0 = clean, 100 = film grain
    texture: number;    // 0 = smooth, 100 = textured
}

export const DEFAULT_RENDERING_RULES: RenderingRules = {
    sharpness: 50,
    grain: 0,
    texture: 50
};

// ============================================================================
// GENRE OPTIONS
// ============================================================================

export const GENRE_OPTIONS = [
    'Fantasy',
    'Sci-Fi',
    'Modern',
    'Historical',
    'Romance',
    'Adventure'
] as const;

// ============================================================================
// MEDIA DEFAULTS
// ============================================================================

/**
 * Default media generation settings for a character
 * Stored in characters.media_defaults (JSONB)
 */
export interface MediaDefaults {
    // Video settings
    video_framing?: VideoFraming;
    motion_intensity?: number; // 0-100
    loop_safe?: boolean;

    // Voice settings (future)
    voice_id?: string;
    voice_enabled?: boolean;

    // Image settings
    preferred_aspect_ratio?: AspectRatio;
}

export type VideoFraming =
    | 'portrait'
    | 'full_body'
    | 'action_pose'
    | 'outdoor'
    | 'close_up';

export type AspectRatio =
    | '1:1'   // Square
    | '3:4'   // Portrait
    | '4:3'   // Landscape
    | '9:16'  // Vertical video
    | '16:9'; // Horizontal video

// ============================================================================
// PERSONALITY TRAITS
// ============================================================================

/**
 * Personality trait sliders
 * Stored in characters.personality_traits (JSONB)
 * Values range from -100 (left) to +100 (right)
 */
export interface PersonalityTraits {
    // Core personality dimensions
    serious_playful?: number;      // Serious (-100) to Playful (+100)
    bold_cautious?: number;        // Bold (-100) to Cautious (+100)
    warm_cold?: number;            // Warm (-100) to Cold (+100)
    rational_emotional?: number;   // Rational (-100) to Emotional (+100)

    // Additional custom traits
    [key: string]: number | undefined;
}

/**
 * Personality slider configuration
 */
export interface PersonalitySliderConfig {
    id: keyof PersonalityTraits;
    leftLabel: string;
    rightLabel: string;
    defaultValue?: number;
}

export const DEFAULT_PERSONALITY_SLIDERS: PersonalitySliderConfig[] = [
    { id: 'serious_playful', leftLabel: 'Serious', rightLabel: 'Playful', defaultValue: 0 },
    { id: 'bold_cautious', leftLabel: 'Bold', rightLabel: 'Cautious', defaultValue: 0 },
    { id: 'warm_cold', leftLabel: 'Warm', rightLabel: 'Cold', defaultValue: 0 },
    { id: 'rational_emotional', leftLabel: 'Rational', rightLabel: 'Emotional', defaultValue: 0 }
];

// ============================================================================
// PHYSICAL TRAITS
// ============================================================================

/**
 * Structured physical appearance data
 * Stored in characters.physical_traits (JSONB)
 */
export interface PhysicalTraits {
    // Basic physical attributes
    age_bracket?: string;    // e.g., "early 20s", "mid 30s"
    hair?: string;           // Hair description
    eyes?: string;           // Eye description
    build?: string;          // Body type/build
    height?: string;         // Height description
    skin_tone?: string;      // Skin tone description

    // Distinctive features
    distinctive_features?: string[];

    // Custom traits
    [key: string]: string | string[] | undefined;
}

// ============================================================================
// CHARACTER HUB FILTERING
// ============================================================================

/**
 * Genre tags for character filtering
 */
export type CharacterGenre =
    | 'Fantasy'
    | 'Sci-Fi'
    | 'Modern'
    | 'Historical'
    | 'Romance'
    | 'Adventure'
    | 'Other';

/**
 * Filter options for Character Hub
 */
export interface CharacterHubFilters {
    search?: string;
    genres?: CharacterGenre[];
    contentRating?: 'sfw' | 'nsfw' | 'all';
    mediaReady?: boolean; // Has generated media
}

// ============================================================================
// CHARACTER STUDIO V2 STATE
// ============================================================================

/**
 * Active tab in Character Studio V2
 */
export type CharacterStudioTab = 'identity' | 'appearance' | 'style' | 'media';

/**
 * View mode for preview panel
 */
export type PreviewMode = 'single' | 'grid' | 'compare';

/**
 * Media type toggle
 */
export type MediaType = 'image' | 'video' | 'avatar';

/**
 * Character Studio V2 state
 */
export interface CharacterStudioState {
    // Current character
    character: CharacterV2 | null;

    // UI state
    activeTab: CharacterStudioTab;
    previewMode: PreviewMode;
    mediaType: MediaType;

    // Character assets
    anchors: CharacterAnchor[];
    primaryAnchorId: string | null;
    canonOutputs: CharacterCanon[];
    recentScenes: CharacterScene[];

    // Editing state
    isDirty: boolean;
    isSaving: boolean;
    isNewCharacter: boolean;

    // Generation state
    isGenerating: boolean;
    generationProgress?: number;
}

// ============================================================================
// CONSISTENCY CONTROLS
// ============================================================================

/**
 * Consistency settings for generation
 */
export interface ConsistencyControls {
    consistency_mode: boolean;      // ON/OFF
    use_pinned_canon: boolean;      // Use canonical outputs
    variation: number;              // 0-100 (Low to High variation)

    // Advanced
    reference_strength?: number;    // 0-100
    denoise_strength?: number;      // 0-100
}

// ============================================================================
// GENERATION ACTIONS
// ============================================================================

/**
 * Generation batch size
 */
export type BatchSize = 1 | 4 | 9;

/**
 * Generation request for Character Studio V2
 */
export interface CharacterGenerationRequest {
    character_id: string;
    scene_prompt: string;

    // Consistency
    consistency_controls: ConsistencyControls;
    primary_portrait_url?: string;

    // Settings
    style_preset?: StylePreset;
    media_type: 'image' | 'video';
    batch_size: BatchSize;

    // Advanced
    model_id?: string;
    seed?: number;
    negative_prompt?: string;
}
