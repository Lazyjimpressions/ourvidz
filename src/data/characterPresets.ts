// Character Visual Presets - Used for portrait generation
// These presets inject tags into the character prompt builder

export interface Preset {
  icon: string;
  tags: string[];
  label: string;
}

export const POSE_PRESETS: Record<string, Preset> = {
  standing: { icon: '🧍', tags: ['standing', 'upright posture'], label: 'Standing' },
  sitting: { icon: '🪑', tags: ['sitting', 'seated', 'relaxed pose'], label: 'Sitting' },
  leaning: { icon: '📐', tags: ['leaning against wall', 'casual stance'], label: 'Leaning' },
  closeup: { icon: '👤', tags: ['close-up portrait', 'face focus', 'headshot'], label: 'Close-up' },
  upperbody: { icon: '👔', tags: ['upper body', 'waist up', 'torso visible'], label: 'Upper Body' },
  action: { icon: '🏃', tags: ['dynamic pose', 'mid-motion', 'action shot'], label: 'Action' },
  kneeling: { icon: '🧎', tags: ['kneeling', 'on knees', 'low position'], label: 'Kneeling' },
  lying: { icon: '🛋️', tags: ['lying down', 'reclined', 'horizontal pose'], label: 'Lying' },
} as const;

export const EXPRESSION_PRESETS: Record<string, Preset> = {
  happy: { icon: '😊', tags: ['happy expression', 'warm smile', 'bright eyes'], label: 'Happy' },
  confident: { icon: '😏', tags: ['confident expression', 'assured gaze', 'slight smirk'], label: 'Confident' },
  shy: { icon: '🙈', tags: ['shy expression', 'looking away', 'soft blush'], label: 'Shy' },
  seductive: { icon: '😈', tags: ['seductive expression', 'sultry gaze', 'parted lips'], label: 'Seductive' },
  sad: { icon: '😢', tags: ['sad expression', 'downcast eyes', 'melancholic'], label: 'Sad' },
  surprised: { icon: '😮', tags: ['surprised expression', 'wide eyes', 'open mouth'], label: 'Surprised' },
  angry: { icon: '😠', tags: ['angry expression', 'furrowed brow', 'intense stare'], label: 'Angry' },
  neutral: { icon: '😐', tags: ['neutral expression', 'calm gaze', 'composed'], label: 'Neutral' },
} as const;

export const OUTFIT_PRESETS: Record<string, Preset> = {
  casual: { icon: '👕', tags: ['casual outfit', 'jeans', 't-shirt', 'relaxed attire'], label: 'Casual' },
  formal: { icon: '👔', tags: ['formal attire', 'business suit', 'professional wear'], label: 'Formal' },
  athletic: { icon: '🏋️', tags: ['athletic wear', 'sports outfit', 'workout clothes'], label: 'Athletic' },
  swimwear: { icon: '👙', tags: ['swimsuit', 'bikini', 'beachwear'], label: 'Swimwear' },
  fantasy: { icon: '⚔️', tags: ['fantasy costume', 'elaborate outfit', 'medieval style'], label: 'Fantasy' },
  evening: { icon: '👗', tags: ['evening gown', 'elegant dress', 'formal wear'], label: 'Evening' },
  lingerie: { icon: '🩱', tags: ['lingerie', 'intimate apparel', 'lace'], label: 'Lingerie' },
  uniform: { icon: '👮', tags: ['uniform', 'professional uniform', 'occupational attire'], label: 'Uniform' },
} as const;

export const CAMERA_PRESETS: Record<string, Preset> = {
  portrait: { icon: '🖼️', tags: ['portrait shot', 'head and shoulders', 'face focus'], label: 'Portrait' },
  full: { icon: '📷', tags: ['full body shot', 'entire figure visible'], label: 'Full Body' },
  cinematic: { icon: '🎬', tags: ['cinematic framing', 'dramatic angle', 'movie still'], label: 'Cinematic' },
  lowangle: { icon: '⬆️', tags: ['low angle shot', 'looking up', 'powerful perspective'], label: 'Low Angle' },
  highangle: { icon: '⬇️', tags: ['high angle shot', 'looking down', 'vulnerable perspective'], label: 'High Angle' },
  dutch: { icon: '↗️', tags: ['dutch angle', 'tilted frame', 'dynamic composition'], label: 'Dutch Angle' },
} as const;

export type PosePresetKey = keyof typeof POSE_PRESETS;
export type ExpressionPresetKey = keyof typeof EXPRESSION_PRESETS;
export type OutfitPresetKey = keyof typeof OUTFIT_PRESETS;
export type CameraPresetKey = keyof typeof CAMERA_PRESETS;

export interface SelectedPresets {
  pose?: PosePresetKey;
  expression?: ExpressionPresetKey;
  outfit?: OutfitPresetKey;
  camera?: CameraPresetKey;
}

// Get all tags from selected presets
export const getPresetTags = (presets: SelectedPresets): string[] => {
  const tags: string[] = [];
  
  if (presets.pose && POSE_PRESETS[presets.pose]) {
    tags.push(...POSE_PRESETS[presets.pose].tags);
  }
  if (presets.expression && EXPRESSION_PRESETS[presets.expression]) {
    tags.push(...EXPRESSION_PRESETS[presets.expression].tags);
  }
  if (presets.outfit && OUTFIT_PRESETS[presets.outfit]) {
    tags.push(...OUTFIT_PRESETS[presets.outfit].tags);
  }
  if (presets.camera && CAMERA_PRESETS[presets.camera]) {
    tags.push(...CAMERA_PRESETS[presets.camera].tags);
  }
  
  return tags;
};
