import { UserCharacter } from '@/types/roleplay';

/**
 * Gender type for user characters
 */
export type UserGender = 'male' | 'female' | 'other';

/**
 * Build a visual description string from user character data
 * Used for scene generation prompts when including the user in images
 */
export function buildUserVisualDescription(
  gender: UserGender,
  appearanceTags: string[]
): string {
  const genderTokens: Record<UserGender, string[]> = {
    male: ['1boy', 'handsome man'],
    female: ['1girl', 'beautiful woman'],
    other: ['1person', 'attractive person']
  };

  const baseTokens = genderTokens[gender] || genderTokens.other;

  // Clean and limit appearance tags
  const cleanTags = appearanceTags
    .filter(tag => tag && tag.trim().length > 2)
    .map(tag => tag.trim().toLowerCase())
    .slice(0, 8); // Limit to 8 appearance tags

  return [...baseTokens, ...cleanTags].join(', ');
}

/**
 * Build a full user visual description from a UserCharacter object
 */
export function buildUserVisualDescriptionFromCharacter(
  userCharacter: UserCharacter | null | undefined
): string | null {
  if (!userCharacter) return null;

  // Cast gender to UserGender (default to 'other' if not recognized)
  const gender = (['male', 'female', 'other'].includes(userCharacter.gender || '') 
    ? userCharacter.gender 
    : 'other') as UserGender;
  
  return buildUserVisualDescription(
    gender,
    userCharacter.appearance_tags || []
  );
}

/**
 * Pronoun type for template substitution
 */
export type PronounType = 'subject' | 'object' | 'possessive';

/**
 * Get the appropriate pronoun for a given gender and pronoun type
 */
export function getPronoun(
  gender: UserGender | string | null | undefined,
  type: PronounType
): string {
  const pronouns: Record<UserGender, Record<PronounType, string>> = {
    male: {
      subject: 'he',
      object: 'him',
      possessive: 'his'
    },
    female: {
      subject: 'she',
      object: 'her',
      possessive: 'her'
    },
    other: {
      subject: 'they',
      object: 'them',
      possessive: 'their'
    }
  };

  const normalizedGender = (gender?.toLowerCase() || 'other') as UserGender;
  const genderPronouns = pronouns[normalizedGender] || pronouns.other;

  return genderPronouns[type] || pronouns.other[type];
}

/**
 * Build all user template variables for prompt substitution
 */
export function buildUserTemplateVars(
  userCharacter: UserCharacter | null | undefined
): Record<string, string> {
  if (!userCharacter) {
    return {
      '{{user_name}}': 'User',
      '{{user_gender}}': 'unspecified',
      '{{user_appearance}}': '',
      '{{user_persona}}': '',
      '{{user_pronoun_they}}': 'they',
      '{{user_pronoun_them}}': 'them',
      '{{user_pronoun_their}}': 'their',
    };
  }

  return {
    '{{user_name}}': userCharacter.name || 'User',
    '{{user_gender}}': userCharacter.gender || 'other',
    '{{user_appearance}}': userCharacter.appearance_tags?.join(', ') || '',
    '{{user_persona}}': userCharacter.persona || '',
    '{{user_pronoun_they}}': getPronoun(userCharacter.gender, 'subject'),
    '{{user_pronoun_them}}': getPronoun(userCharacter.gender, 'object'),
    '{{user_pronoun_their}}': getPronoun(userCharacter.gender, 'possessive'),
  };
}

/**
 * Scene composition tokens for different scene styles
 */
export const SCENE_STYLE_TOKENS = {
  character_only: [],
  pov: ['pov', 'first person view', 'looking at viewer'],
  both_characters: ['two people', 'couple', 'facing each other']
} as const;

/**
 * Get scene style tokens for image generation
 */
export function getSceneStyleTokens(
  sceneStyle: 'character_only' | 'pov' | 'both_characters'
): string[] {
  return [...SCENE_STYLE_TOKENS[sceneStyle]];
}
