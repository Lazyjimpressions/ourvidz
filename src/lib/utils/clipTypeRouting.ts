/**
 * Clip Type Routing Utilities
 *
 * Provides utilities for routing clip generation based on clip type,
 * determining reference requirements, and building generation configs.
 */

import {
  ClipType,
  CLIP_TYPE_TASKS,
  CLIP_TYPE_DURATIONS,
  ReferenceImageSource,
  MotionPreset,
  StoryboardClip,
} from '@/types/storyboard';

// ============================================================================
// CLIP TYPE METADATA
// ============================================================================

export interface ClipTypeMetadata {
  type: ClipType;
  label: string;
  description: string;
  icon: string;
  primaryTask: string;
  defaultDuration: number;
  requiresReferenceImage: boolean;
  requiresReferenceVideo: boolean;
  supportsMotionPreset: boolean;
  supportsEndFrame: boolean;
}

/**
 * Full metadata for each clip type
 */
export const CLIP_TYPE_METADATA: Record<ClipType, ClipTypeMetadata> = {
  quick: {
    type: 'quick',
    label: 'Quick (5s)',
    description: 'Fast I2V from single keyframe',
    icon: 'Zap',
    primaryTask: 'i2v',
    defaultDuration: 5,
    requiresReferenceImage: true,
    requiresReferenceVideo: false,
    supportsMotionPreset: false,
    supportsEndFrame: false,
  },
  extended: {
    type: 'extended',
    label: 'Extended (10s)',
    description: 'Continue from previous clip',
    icon: 'ArrowRight',
    primaryTask: 'extend',
    defaultDuration: 10,
    requiresReferenceImage: false,
    requiresReferenceVideo: true,
    supportsMotionPreset: false,
    supportsEndFrame: false,
  },
  controlled: {
    type: 'controlled',
    label: 'Controlled (5s)',
    description: 'Identity + motion reference',
    icon: 'Sliders',
    primaryTask: 'multi',
    defaultDuration: 5,
    requiresReferenceImage: true,
    requiresReferenceVideo: false,
    supportsMotionPreset: true,
    supportsEndFrame: false,
  },
  long: {
    type: 'long',
    label: 'Long (15-20s)',
    description: 'Auto-chain I2V + extends',
    icon: 'Film',
    primaryTask: 'i2v',
    defaultDuration: 15,
    requiresReferenceImage: true,
    requiresReferenceVideo: false,
    supportsMotionPreset: false,
    supportsEndFrame: false,
  },
  keyframed: {
    type: 'keyframed',
    label: 'Keyframed (5s)',
    description: 'Start/end pose defined',
    icon: 'Frame',
    primaryTask: 'i2i_multi',
    defaultDuration: 5,
    requiresReferenceImage: true,
    requiresReferenceVideo: false,
    supportsMotionPreset: false,
    supportsEndFrame: true,
  },
};

// ============================================================================
// VALIDATION
// ============================================================================

export interface ClipTypeValidation {
  isValid: boolean;
  missingRequirements: string[];
  warnings: string[];
}

/**
 * Validate if a clip type can be used with given inputs
 */
export function validateClipTypeInputs(
  clipType: ClipType,
  inputs: {
    referenceImageUrl?: string;
    referenceVideoUrl?: string;
    motionPresetId?: string;
    endFrameUrl?: string;
    previousClip?: StoryboardClip;
  }
): ClipTypeValidation {
  const metadata = CLIP_TYPE_METADATA[clipType];
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check reference image requirement
  if (metadata.requiresReferenceImage && !inputs.referenceImageUrl) {
    missing.push('Reference image');
  }

  // Check reference video requirement (for extended)
  if (metadata.requiresReferenceVideo) {
    if (!inputs.referenceVideoUrl && !inputs.previousClip?.video_url) {
      missing.push('Previous clip video');
    }
  }

  // Check end frame requirement (for keyframed)
  if (metadata.supportsEndFrame && clipType === 'keyframed' && !inputs.endFrameUrl) {
    missing.push('End frame image');
  }

  // Warnings for optional features
  if (metadata.supportsMotionPreset && !inputs.motionPresetId) {
    warnings.push('Motion preset recommended for controlled clips');
  }

  return {
    isValid: missing.length === 0,
    missingRequirements: missing,
    warnings,
  };
}

// ============================================================================
// REFERENCE RESOLUTION
// ============================================================================

export interface ResolvedReferences {
  referenceImageUrl?: string;
  referenceImageSource?: ReferenceImageSource;
  referenceVideoUrl?: string;
  motionVideoUrl?: string;
  endFrameUrl?: string;
}

/**
 * Resolve references for a clip based on type and inputs
 */
export function resolveClipReferences(
  clipType: ClipType,
  inputs: {
    referenceImageUrl?: string;
    referenceImageSource?: ReferenceImageSource;
    previousClip?: StoryboardClip;
    motionPreset?: MotionPreset;
    endFrameUrl?: string;
    characterCanonUrl?: string;
  }
): ResolvedReferences {
  const references: ResolvedReferences = {};

  switch (clipType) {
    case 'quick':
      // Uses single reference image
      references.referenceImageUrl = inputs.referenceImageUrl || inputs.characterCanonUrl;
      references.referenceImageSource = inputs.referenceImageSource || 'character_portrait';
      break;

    case 'extended':
      // Uses previous clip video
      references.referenceVideoUrl = inputs.previousClip?.video_url;
      // Also need starting frame for context
      references.referenceImageUrl = inputs.previousClip?.extracted_frame_url;
      references.referenceImageSource = 'extracted_frame';
      break;

    case 'controlled':
      // Uses reference image + motion preset
      references.referenceImageUrl = inputs.referenceImageUrl || inputs.characterCanonUrl;
      references.referenceImageSource = inputs.referenceImageSource || 'character_portrait';
      if (inputs.motionPreset) {
        references.motionVideoUrl = inputs.motionPreset.video_url;
      }
      break;

    case 'long':
      // Starts with I2V, then auto-extends
      references.referenceImageUrl = inputs.referenceImageUrl || inputs.characterCanonUrl;
      references.referenceImageSource = inputs.referenceImageSource || 'character_portrait';
      break;

    case 'keyframed':
      // Start and end frames
      references.referenceImageUrl = inputs.referenceImageUrl || inputs.characterCanonUrl;
      references.referenceImageSource = inputs.referenceImageSource || 'character_portrait';
      references.endFrameUrl = inputs.endFrameUrl;
      break;
  }

  return references;
}

// ============================================================================
// CLIP TYPE SELECTION HELPERS
// ============================================================================

/**
 * Get available clip types based on context
 */
export function getAvailableClipTypes(context: {
  isFirstClip: boolean;
  hasPreviousClip: boolean;
  previousClipHasVideo: boolean;
  hasCharacterCanon: boolean;
}): ClipType[] {
  const available: ClipType[] = [];

  // Quick is always available if we have a reference image
  if (context.hasCharacterCanon || context.hasPreviousClip) {
    available.push('quick');
  }

  // Extended requires previous clip with video
  if (context.hasPreviousClip && context.previousClipHasVideo) {
    available.push('extended');
  }

  // Controlled requires reference image
  if (context.hasCharacterCanon || context.hasPreviousClip) {
    available.push('controlled');
  }

  // Long is available with reference image (creates multi-step internally)
  if (context.hasCharacterCanon || context.hasPreviousClip) {
    available.push('long');
  }

  // Keyframed requires reference image (end frame can be generated)
  if (context.hasCharacterCanon || context.hasPreviousClip) {
    available.push('keyframed');
  }

  return available;
}

/**
 * Get recommended clip type for a position
 */
export function getRecommendedClipTypeForPosition(
  position: 'first' | 'middle' | 'last',
  context: {
    previousClipType?: ClipType;
    hasMotionPreset: boolean;
    sceneActionLevel?: 'low' | 'medium' | 'high';
  }
): ClipType {
  // First clip should establish the character
  if (position === 'first') {
    return 'quick';
  }

  // Last clip often benefits from controlled ending
  if (position === 'last') {
    return context.hasMotionPreset ? 'controlled' : 'quick';
  }

  // Middle clips depend on context
  if (context.hasMotionPreset) {
    return 'controlled';
  }

  if (context.previousClipType === 'quick') {
    return 'extended'; // Good for continuity
  }

  // High action scenes might benefit from longer clips
  if (context.sceneActionLevel === 'high') {
    return 'long';
  }

  return 'extended';
}

// ============================================================================
// PROMPT GUIDANCE
// ============================================================================

/**
 * Get prompt guidance for a clip type
 */
export function getPromptGuidanceForClipType(clipType: ClipType): {
  guidance: string;
  examples: string[];
  maxLength: number;
} {
  switch (clipType) {
    case 'quick':
      return {
        guidance: 'Describe the motion you want. For first clips, include character details. For chain clips, focus on motion only.',
        examples: [
          'subtle breathing, gentle smile forming',
          'slowly turns head to the right, hair follows',
          'takes a small step forward, natural movement',
        ],
        maxLength: 500,
      };

    case 'extended':
      return {
        guidance: 'Describe how the motion should continue. Keep it simple - the model will extrapolate from the previous clip.',
        examples: [
          'continues walking forward naturally',
          'motion continues, slight turn to face camera',
          'keeps the same pace, subtle expression change',
        ],
        maxLength: 300,
      };

    case 'controlled':
      return {
        guidance: 'Describe the desired motion. The motion preset provides the movement style - focus on what should happen.',
        examples: [
          'peaceful expression, looking at horizon',
          'confident stance, slight smile',
          'thoughtful pose, gentle movements',
        ],
        maxLength: 400,
      };

    case 'long':
      return {
        guidance: 'Describe the complete action sequence. The system will break this into multiple segments.',
        examples: [
          'walks from the door to the window, looks outside, turns back with a smile',
          'sits down gracefully, adjusts position, looks up at camera',
        ],
        maxLength: 600,
      };

    case 'keyframed':
      return {
        guidance: 'Describe how to transition from start pose to end pose. Both frames are defined.',
        examples: [
          'smooth transition from standing to seated',
          'graceful turn from profile to front-facing',
        ],
        maxLength: 400,
      };

    default:
      return {
        guidance: 'Describe the desired motion or action.',
        examples: [],
        maxLength: 500,
      };
  }
}

// ============================================================================
// DURATION HELPERS
// ============================================================================

/**
 * Get valid duration options for a clip type
 */
export function getDurationOptionsForClipType(clipType: ClipType): number[] {
  switch (clipType) {
    case 'quick':
      return [3, 5, 7];
    case 'extended':
      return [5, 10, 15];
    case 'controlled':
      return [3, 5, 7];
    case 'long':
      return [15, 20, 25, 30];
    case 'keyframed':
      return [3, 5];
    default:
      return [5];
  }
}

/**
 * Estimate total generation time for a clip type
 */
export function estimateGenerationTime(
  clipType: ClipType,
  durationSeconds: number
): { minSeconds: number; maxSeconds: number } {
  // Base times vary by clip type complexity
  const baseMultipliers: Record<ClipType, number> = {
    quick: 30,      // ~30s per second of video
    extended: 20,   // Faster as it builds on existing
    controlled: 40, // More processing for motion reference
    long: 60,       // Multiple steps
    keyframed: 50,  // Two-stage process
  };

  const multiplier = baseMultipliers[clipType];
  const base = durationSeconds * multiplier;

  return {
    minSeconds: Math.round(base * 0.7),
    maxSeconds: Math.round(base * 1.5),
  };
}

// ============================================================================
// CHAIN COMPATIBILITY
// ============================================================================

/**
 * Check if two clip types can be chained together smoothly
 */
export function canChainClipTypes(fromType: ClipType, toType: ClipType): {
  canChain: boolean;
  recommendation: string;
} {
  // Extended can follow any type that produces video
  if (toType === 'extended') {
    return {
      canChain: true,
      recommendation: 'Extended clips work well after any clip type with video output.',
    };
  }

  // Quick clips can follow anything with a frame
  if (toType === 'quick') {
    return {
      canChain: true,
      recommendation: 'Use the previous clip\'s extracted frame as reference.',
    };
  }

  // Controlled requires extracted frame
  if (toType === 'controlled') {
    return {
      canChain: true,
      recommendation: 'Select a motion preset that matches the scene mood.',
    };
  }

  // Long clips typically start fresh
  if (toType === 'long') {
    if (fromType === 'long') {
      return {
        canChain: false,
        recommendation: 'Avoid chaining long clips - use quick or extended for continuity.',
      };
    }
    return {
      canChain: true,
      recommendation: 'Long clips work best at scene transitions.',
    };
  }

  // Keyframed needs start frame
  if (toType === 'keyframed') {
    return {
      canChain: true,
      recommendation: 'Use the previous clip\'s end frame as the start frame.',
    };
  }

  return {
    canChain: true,
    recommendation: '',
  };
}
