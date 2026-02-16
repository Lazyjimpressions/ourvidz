/**
 * Parse a traits string (from characters.traits) into individual fields.
 * Format: "Speaking Style: ...\nGoals: ...\nQuirks: ...\nRelationships: ..."
 */
export function parseTraits(traits: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = traits.split('\n');

  lines.forEach((line) => {
    if (line.startsWith('Speaking Style: ')) {
      result.speakingStyle = line.replace('Speaking Style: ', '');
    } else if (line.startsWith('Goals: ')) {
      result.goals = line.replace('Goals: ', '');
    } else if (line.startsWith('Quirks: ')) {
      result.quirks = line.replace('Quirks: ', '');
    } else if (line.startsWith('Relationships: ')) {
      result.relationships = line.replace('Relationships: ', '');
    }
  });

  return result;
}

export interface CharacterRow {
  name: string;
  description: string;
  persona?: string | null;
  traits?: string | null;
  backstory?: string | null;
  voice_tone?: string | null;
  mood?: string | null;
  gender?: string | null;
}

/**
 * Replace all known {{placeholder}} tokens in a template string
 * with values from a character row. Unrecognised placeholders are left as-is.
 */
export function hydrateTemplate(
  template: string,
  char: CharacterRow,
  extras?: { userName?: string; userGender?: string; sceneContext?: string }
): string {
  const traits = parseTraits(char.traits || '');

  const replacements: Record<string, string> = {
    '{{character_name}}': char.name,
    '{{character_description}}': char.description || '',
    '{{character_personality}}': char.persona || char.traits || '',
    '{{character_background}}': char.backstory || '',
    '{{character_speaking_style}}': traits.speakingStyle || char.voice_tone || '',
    '{{character_goals}}': traits.goals || '',
    '{{character_quirks}}': traits.quirks || '',
    '{{character_relationships}}': traits.relationships || '',
    '{{mood}}': char.mood || 'neutral',
    '{{voice_tone}}': char.voice_tone || '',
    '{{user_name}}': extras?.userName || 'User',
    '{{user_gender}}': extras?.userGender || 'unspecified',
    '{{user_appearance}}': '',
    '{{scene_context}}': extras?.sceneContext || '',
  };

  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.split(key).join(value);
  }
  return result;
}
