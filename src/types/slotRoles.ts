/** Slot role types for multi-ref image generation */
export type SlotRole = 'character' | 'clothing' | 'position' | 'scene' | 'style' | 'reference';

export const SLOT_ROLE_LABELS: Record<SlotRole, string> = {
  character: 'Char',
  clothing: 'Clothing',
  position: 'Position',
  scene: 'Scene',
  style: 'Style',
  reference: 'Ref',
};

export const SLOT_ROLE_COLORS: Record<SlotRole, string> = {
  character: 'bg-blue-500/80',
  clothing: 'bg-pink-500/80',
  position: 'bg-green-500/80',
  scene: 'bg-amber-500/80',
  style: 'bg-purple-500/80',
  reference: 'bg-muted-foreground/60',
};

/** Tag prefix used in the database tags[] column */
export const ROLE_TAG_PREFIX = 'role:';

/** All meaningful roles (excludes generic 'reference') */
export const MEANINGFUL_ROLES: SlotRole[] = ['character', 'clothing', 'position', 'scene', 'style'];

/** Fixed slot definitions for Quick Scene mode (2-character builder) */
export const QUICK_SCENE_SLOTS = [
  { index: 0, label: '1: Char A', required: true },
  { index: 1, label: '2: Char B', required: true },
  { index: 2, label: '3: Pose',   required: true },
  { index: 3, label: '4: Scene',  required: false },
  { index: 4, label: '5: Outfit', required: false },
] as const;

export type OutfitTarget = 'A' | 'B' | 'Both';

/**
 * Build a deterministic system prompt for Quick Scene mode.
 * Wraps the user's creative prompt with fixed Image 1-5 reference instructions.
 */
export function buildQuickScenePrompt(
  userPrompt: string,
  hasScene: boolean,
  hasOutfit: boolean,
  outfitTarget: OutfitTarget = 'Both',
): string {
  const lines: string[] = [
    'You are performing a multi-reference edit. Follow the reference map exactly.',
    '',
    'REFERENCE ORDER (do not reinterpret):',
    '- Image 1: Character A identity reference. Preserve face, hair, body proportions, and likeness exactly.',
    '- Image 2: Character B identity reference. Preserve face, hair, body proportions, and likeness exactly.',
    '- Image 3: Pose/composition reference for BOTH characters only. Do not copy identity from Image 3.',
  ];

  if (hasScene) {
    lines.push('- Image 4: Scene/environment reference. Use for location/background only.');
  }
  if (hasOutfit) {
    lines.push('- Image 5: Outfit reference. Use for clothing only as described below.');
  }

  lines.push(
    '',
    'HIGHEST PRIORITY CONSTRAINTS:',
    '- Keep Character A exactly as Image 1 and Character B exactly as Image 2.',
    '- Do NOT merge identities. Do NOT blend faces. Keep both characters distinct.',
    '- Pose is taken from Image 3 only. Identities are taken from Images 1 and 2 only.',
  );

  // Conditional scene/outfit rules
  if (hasScene || hasOutfit) {
    lines.push('', 'SCENE / OUTFIT RULES:');
    if (hasScene) {
      lines.push('- Place characters into the environment from Image 4. Match lighting and shadows naturally.');
    }
    if (hasOutfit) {
      const target = outfitTarget === 'A' ? 'Character A'
        : outfitTarget === 'B' ? 'Character B'
        : 'both characters';
      lines.push(`- Apply outfit from Image 5 to ${target}. Do not alter identities.`);
    }
  }

  lines.push(
    '',
    'QUALITY / CLEANUP:',
    '- Correct anatomy and remove artifacts: natural proportions, clean edges, coherent lighting/shadows.',
    '- Hands: five fingers per hand, no extra digits, no fused fingers, natural knuckles/nails.',
    '- Skin: reduce blotches while keeping natural texture.',
    '',
    'USER REQUEST:',
    userPrompt?.trim() || '(No additional instructions. Produce a faithful edit using the references.)',
  );

  return lines.join('\n');
}

/** Default slot role assignments for the 10 image-mode slots */
export const DEFAULT_SLOT_ROLES: SlotRole[] = [
  'character',  // Slot 1 - Char 1
  'character',  // Slot 2 - Char 2
  'position',   // Slot 3 - Position
  'clothing',   // Slot 4 - Clothing
  'reference',  // Slot 5
  'reference',  // Slot 6
  'reference',  // Slot 7
  'reference',  // Slot 8
  'reference',  // Slot 9
  'reference',  // Slot 10
];

/** Generate a display label for a slot given its role and index */
export function getSlotLabel(role: SlotRole, index: number): string {
  if (role === 'reference') return `Ref ${index + 1}`;
  // Count how many of this role appear before this index in defaults
  return SLOT_ROLE_LABELS[role];
}

/**
 * Build a Figure notation prefix from filled slots grouped by role.
 * @deprecated Use buildQuickScenePrompt for Quick Scene mode instead.
 * Kept for backward compatibility with non-Quick-Scene flows.
 */
export function buildFigurePrefix(
  filledSlots: { figureIndex: number; role: SlotRole }[]
): string {
  const byRole: Partial<Record<SlotRole, number[]>> = {};
  for (const slot of filledSlots) {
    if (slot.role === 'reference') continue;
    if (!byRole[slot.role]) byRole[slot.role] = [];
    byRole[slot.role]!.push(slot.figureIndex);
  }

  const joinFigures = (indices: number[]) => {
    const refs = indices.map(i => `Figure ${i}`);
    return refs.length <= 2
      ? refs.join(' and ')
      : refs.slice(0, -1).join(', ') + ', and ' + refs[refs.length - 1];
  };

  const parts: string[] = [];

  const chars = byRole.character;
  if (chars?.length) {
    const label = chars.length === 1 ? 'the character' : 'the characters';
    parts.push(`Show ${label} from ${joinFigures(chars)}`);
  }

  const pos = byRole.position;
  if (pos?.length) {
    parts.push(`in the position from ${joinFigures(pos)}`);
  }

  const cloth = byRole.clothing;
  if (cloth?.length) {
    parts.push(`wearing the clothing from ${joinFigures(cloth)}`);
  }

  const scene = byRole.scene;
  if (scene?.length) {
    parts.push(`in the scene from ${joinFigures(scene)}`);
  }

  const style = byRole.style;
  if (style?.length) {
    parts.push(`in the visual style of ${joinFigures(style)}`);
  }

  if (parts.length === 0) return '';
  return parts.join(' ') + ': ';
}
