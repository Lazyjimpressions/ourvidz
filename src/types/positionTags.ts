/**
 * Canon Tag Groups — Grouped tag definitions for canon reference assets.
 * Tags are stored as a flat text[] in the DB; grouping is UI-only.
 */

/** Position-specific tag groups */
export const POSITION_TAG_GROUPS = {
  composition: {
    label: 'Composition',
    tags: ['solo', 'duo', 'group'],
  },
  framing: {
    label: 'Framing',
    tags: ['full-body', 'half-body', 'close-up', 'bust', 'overhead'],
  },
  angle: {
    label: 'Angle',
    tags: ['front', 'side', 'rear', '3/4', 'low-angle', 'birds-eye'],
  },
  body: {
    label: 'Body',
    tags: ['standing', 'sitting', 'lying', 'kneeling', 'leaning', 'crouching'],
  },
  action: {
    label: 'Action',
    tags: ['hugging', 'holding-hands', 'carrying', 'piggyback', 'dancing', 'fighting', 'running', 'massage', 'feeding', 'lifting'],
  },
  intimate: {
    label: 'Intimate',
    tags: ['kissing', 'kissing-deeply', 'cuddling', 'spooning', 'lap-sitting', 'forehead-touch', 'nuzzling', 'embracing'],
  },
  mood: {
    label: 'Mood',
    tags: ['tender', 'playful', 'passionate', 'dramatic', 'casual', 'intense'],
  },
} as const;

/** Clothing-specific tag groups */
export const CLOTHING_TAG_GROUPS = {
  clothingStyle: {
    label: 'Style',
    tags: ['casual', 'formal', 'fantasy', 'uniform', 'athletic', 'sleepwear', 'swimwear', 'armor', 'lingerie', 'costume'],
  },
  season: {
    label: 'Season',
    tags: ['summer', 'winter', 'spring', 'autumn'],
  },
  coverage: {
    label: 'Coverage',
    tags: ['full', 'partial', 'minimal', 'layered'],
  },
} as const;

/** Scene-specific tag groups */
export const SCENE_TAG_GROUPS = {
  setting: {
    label: 'Setting',
    tags: ['indoor', 'outdoor', 'urban', 'nature', 'fantasy-setting', 'studio'],
  },
  timeOfDay: {
    label: 'Time',
    tags: ['day', 'night', 'sunset', 'sunrise', 'twilight'],
  },
  sceneMood: {
    label: 'Mood',
    tags: ['cozy', 'dramatic', 'romantic', 'eerie', 'serene', 'vibrant'],
  },
} as const;

/** Character / identity tag groups (reuses framing & angle from position) */
export const CHARACTER_TAG_GROUPS = {
  framing: POSITION_TAG_GROUPS.framing,
  angle: POSITION_TAG_GROUPS.angle,
} as const;

/** Style reference tag groups */
export const STYLE_TAG_GROUPS = {
  medium: {
    label: 'Medium',
    tags: ['watercolor', 'digital', 'photo', 'oil-painting', 'pencil', 'ink'],
  },
  aesthetic: {
    label: 'Aesthetic',
    tags: ['anime', 'realistic', 'painterly', 'cel-shade', 'comic', 'retro'],
  },
} as const;

/** Mapping from output_type → relevant tag groups */
export const TAG_GROUPS_BY_OUTPUT_TYPE: Record<string, Record<string, { label: string; tags: readonly string[] }>> = {
  position: POSITION_TAG_GROUPS,
  clothing: CLOTHING_TAG_GROUPS,
  scene: SCENE_TAG_GROUPS,
  character: CHARACTER_TAG_GROUPS,
  style: STYLE_TAG_GROUPS,
};

/**
 * ALL tag groups organized by category label for the unified tag editor.
 * Each entry has a `category` (top-level collapsible header) and nested `groups`.
 */
export const ALL_TAG_CATEGORIES = [
  { category: 'Position', key: 'position', groups: POSITION_TAG_GROUPS },
  { category: 'Clothing', key: 'clothing', groups: CLOTHING_TAG_GROUPS },
  { category: 'Scene', key: 'scene', groups: SCENE_TAG_GROUPS },
  { category: 'Style', key: 'style', groups: STYLE_TAG_GROUPS },
] as const;

/**
 * Maps each filter value to the full set of tags that should surface an asset
 * under that filter — regardless of its output_type.
 */
export const FILTER_TAG_VOCABULARY: Record<string, string[]> = {
  character: [
    ...CHARACTER_TAG_GROUPS.framing.tags,
    ...CHARACTER_TAG_GROUPS.angle.tags,
  ],
  position: Object.values(POSITION_TAG_GROUPS).flatMap(g => [...g.tags]),
  clothing: Object.values(CLOTHING_TAG_GROUPS).flatMap(g => [...g.tags]),
  scene: Object.values(SCENE_TAG_GROUPS).flatMap(g => [...g.tags]),
  style: Object.values(STYLE_TAG_GROUPS).flatMap(g => [...g.tags]),
};

export type PositionTagGroup = keyof typeof POSITION_TAG_GROUPS;

/** Flat list of all position tags for quick lookups */
export const ALL_POSITION_TAGS: string[] = Object.values(POSITION_TAG_GROUPS).flatMap(g => [...g.tags]);

/** Unified output_type values — the canonical set across the entire app */
export const UNIFIED_OUTPUT_TYPES = [
  { value: 'character', label: 'Character / Identity' },
  { value: 'position', label: 'Position / Pose' },
  { value: 'clothing', label: 'Outfit / Clothing' },
  { value: 'scene', label: 'Scene / Background' },
  { value: 'style', label: 'Style Reference' },
] as const;

export type UnifiedOutputType = typeof UNIFIED_OUTPUT_TYPES[number]['value'];

/** Runtime normalization for legacy output_type values */
export function normalizeOutputType(type: string): UnifiedOutputType {
  switch (type) {
    case 'pose': return 'position';
    case 'outfit': return 'clothing';
    case 'portrait': return 'character';
    default: return type as UnifiedOutputType;
  }
}

/** Filter output types for the PositionsGrid filter bar */
export const POSITIONS_GRID_FILTERS = ['all', 'character', 'position', 'clothing', 'scene', 'style'] as const;
export type PositionsGridFilter = typeof POSITIONS_GRID_FILTERS[number];
