/**
 * Canon Spec Builder
 *
 * Compiles character identity fields into a consistent generation prompt.
 * Used for Character Consistency mode in Character Studio V2.
 */

import { CharacterV2, PersonalityTraits, PhysicalTraits } from '@/types/character-hub-v2';

/**
 * Result of building a canon spec
 */
export interface CanonSpecResult {
    /** The compiled positive prompt for character identity */
    canonSpec: string;
    /** Negative prompt additions from avoid_traits */
    negativePrompt: string;
    /** Summary of what was included */
    summary: {
        hasIdentity: boolean;
        hasPhysical: boolean;
        hasPersonality: boolean;
        hasLocked: boolean;
        hasAvoid: boolean;
    };
}

/**
 * Personality trait slider labels for prompt conversion
 */
const PERSONALITY_LABELS: Record<string, { left: string; right: string }> = {
    serious_playful: { left: 'serious', right: 'playful' },
    bold_cautious: { left: 'bold', right: 'cautious' },
    warm_cold: { left: 'warm', right: 'cold' },
    rational_emotional: { left: 'rational', right: 'emotional' },
};

/**
 * Convert personality slider value to descriptive text
 * Values range from -100 (left) to +100 (right)
 */
function personalityToText(key: string, value: number): string | null {
    const labels = PERSONALITY_LABELS[key];
    if (!labels) return null;

    // Only include strong personality traits (abs > 30)
    if (Math.abs(value) < 30) return null;

    const intensity = Math.abs(value);
    const trait = value < 0 ? labels.left : labels.right;

    if (intensity >= 70) {
        return `very ${trait}`;
    } else if (intensity >= 50) {
        return trait;
    } else {
        return `somewhat ${trait}`;
    }
}

/**
 * Format physical traits into a descriptive string
 */
function formatPhysicalTraits(traits: PhysicalTraits): string {
    const parts: string[] = [];

    if (traits.age_bracket) parts.push(traits.age_bracket);
    if (traits.build) parts.push(`${traits.build} build`);
    if (traits.height) parts.push(traits.height);
    if (traits.skin_tone) parts.push(`${traits.skin_tone} skin`);
    if (traits.hair) parts.push(traits.hair);
    if (traits.eyes) parts.push(`${traits.eyes} eyes`);

    // Handle distinctive features array
    if (traits.distinctive_features && Array.isArray(traits.distinctive_features)) {
        parts.push(...traits.distinctive_features);
    }

    return parts.join(', ');
}

/**
 * Format personality traits into a descriptive string
 */
function formatPersonalityTraits(traits: PersonalityTraits): string {
    const descriptions: string[] = [];

    for (const [key, value] of Object.entries(traits)) {
        if (typeof value === 'number') {
            const text = personalityToText(key, value);
            if (text) descriptions.push(text);
        }
    }

    return descriptions.join(', ');
}

/**
 * Build a canon spec from character data
 *
 * @param character - The character data (can be partial)
 * @returns CanonSpecResult with compiled prompts
 */
export function buildCanonSpec(character: Partial<CharacterV2>): CanonSpecResult {
    const sections: string[] = [];
    const summary = {
        hasIdentity: false,
        hasPhysical: false,
        hasPersonality: false,
        hasLocked: false,
        hasAvoid: false,
    };

    // Identity section: name, tagline, role context
    const identityParts: string[] = [];
    if (character.name) {
        identityParts.push(character.name);
    }
    if (character.tagline) {
        identityParts.push(character.tagline);
    }
    if (identityParts.length > 0) {
        sections.push(identityParts.join(' - '));
        summary.hasIdentity = true;
    }

    // Physical appearance section
    if (character.physical_traits) {
        const physicalText = formatPhysicalTraits(character.physical_traits);
        if (physicalText) {
            sections.push(physicalText);
            summary.hasPhysical = true;
        }
    }

    // Outfit and signature items
    const styleParts: string[] = [];
    if (character.outfit_defaults) {
        styleParts.push(character.outfit_defaults);
    }
    if (character.signature_items) {
        styleParts.push(character.signature_items);
    }
    if (styleParts.length > 0) {
        sections.push(styleParts.join(', '));
    }

    // Personality expression (for expressive poses/moods)
    if (character.personality_traits) {
        const personalityText = formatPersonalityTraits(character.personality_traits);
        if (personalityText) {
            sections.push(`personality: ${personalityText}`);
            summary.hasPersonality = true;
        }
    }

    // Locked traits (MUST keep) - emphasize these
    if (character.locked_traits && character.locked_traits.length > 0) {
        sections.push(`IMPORTANT: ${character.locked_traits.join(', ')}`);
        summary.hasLocked = true;
    }

    // Build negative prompt from avoid_traits
    let negativePrompt = '';
    if (character.avoid_traits && character.avoid_traits.length > 0) {
        negativePrompt = character.avoid_traits.join(', ');
        summary.hasAvoid = true;
    }

    return {
        canonSpec: sections.join('. '),
        negativePrompt,
        summary,
    };
}

/**
 * Combine user scene prompt with canon spec for generation
 *
 * @param scenePrompt - The user's scene/action prompt
 * @param canonSpec - The compiled canon spec
 * @param options - Combination options
 * @returns Combined prompt ready for generation
 */
export function combinePromptWithCanon(
    scenePrompt: string,
    canonSpec: string,
    options: {
        /** Where to place the canon spec relative to scene prompt */
        position?: 'before' | 'after';
        /** Separator between canon and scene */
        separator?: string;
    } = {}
): string {
    const { position = 'before', separator = '. ' } = options;

    if (!canonSpec) return scenePrompt;
    if (!scenePrompt) return canonSpec;

    if (position === 'before') {
        return `${canonSpec}${separator}${scenePrompt}`;
    } else {
        return `${scenePrompt}${separator}${canonSpec}`;
    }
}

/**
 * Generate a compact summary of the canon spec for display
 */
export function getCanonSpecSummary(character: Partial<CharacterV2>): string {
    const result = buildCanonSpec(character);
    const parts: string[] = [];

    if (result.summary.hasIdentity) parts.push('Identity');
    if (result.summary.hasPhysical) parts.push('Physical');
    if (result.summary.hasPersonality) parts.push('Personality');
    if (result.summary.hasLocked) parts.push('Locked traits');
    if (result.summary.hasAvoid) parts.push('Avoid traits');

    if (parts.length === 0) return 'No canon spec data';
    return `Includes: ${parts.join(', ')}`;
}
