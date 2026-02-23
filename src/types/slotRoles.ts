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
 * Skips 'reference' role (no special prompt guidance).
 */
export function buildFigurePrefix(
  filledSlots: { figureIndex: number; role: SlotRole }[]
): string {
  const byRole: Partial<Record<SlotRole, number[]>> = {};
  for (const slot of filledSlots) {
    if (slot.role === 'reference') continue; // skip generic refs
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

  // Character
  const chars = byRole.character;
  if (chars?.length) {
    const label = chars.length === 1 ? 'the character' : 'the characters';
    parts.push(`Show ${label} from ${joinFigures(chars)}`);
  }

  // Position
  const pos = byRole.position;
  if (pos?.length) {
    parts.push(`in the position from ${joinFigures(pos)}`);
  }

  // Clothing
  const cloth = byRole.clothing;
  if (cloth?.length) {
    parts.push(`wearing the clothing from ${joinFigures(cloth)}`);
  }

  // Scene
  const scene = byRole.scene;
  if (scene?.length) {
    parts.push(`in the scene from ${joinFigures(scene)}`);
  }

  // Style
  const style = byRole.style;
  if (style?.length) {
    parts.push(`in the visual style of ${joinFigures(style)}`);
  }

  if (parts.length === 0) return '';
  return parts.join(' ') + ': ';
}
