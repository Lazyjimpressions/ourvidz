/**
 * Storyboard Prompt Utilities
 *
 * Prompt generation strategies for frame chaining with WAN 2.1 I2V.
 * Follows the principle: anchor prompts include full identity, chained prompts focus on motion.
 */

import { StoryboardScene, StoryboardClip } from '@/types/storyboard';
import { Character } from '@/types/roleplay';

/**
 * Mood-to-motion mappings for natural video movement
 */
const MOOD_MOTION_MAP: Record<string, string[]> = {
  romantic: ['slow gentle movement', 'soft breathing motion', 'tender gestures'],
  passionate: ['dynamic movement', 'intense motion', 'expressive gestures'],
  sensual: ['slow languid movement', 'subtle body motion', 'graceful poses'],
  playful: ['light bouncy movement', 'playful gestures', 'animated expressions'],
  intimate: ['close natural movement', 'soft subtle motion', 'gentle interaction'],
  dramatic: ['bold movement', 'dramatic gestures', 'strong poses'],
  relaxed: ['calm natural movement', 'easy breathing', 'relaxed posture'],
  intense: ['controlled powerful movement', 'focused motion', 'purposeful gestures'],
};

/**
 * Setting-specific atmosphere additions
 */
const SETTING_ATMOSPHERE_MAP: Record<string, string> = {
  bedroom: 'warm ambient lighting, soft shadows',
  beach: 'natural sunlight, gentle breeze motion',
  bathroom: 'steamy atmosphere, reflective surfaces',
  outdoor: 'natural lighting, environmental motion',
  studio: 'professional lighting, clean background',
  pool: 'water reflections, wet skin highlights',
  nature: 'dappled sunlight, natural environment',
};

export interface PromptContext {
  scene: StoryboardScene;
  character?: Character;
  clipIndex: number;
  previousClip?: StoryboardClip;
  isFirstClip: boolean;
}

export interface GeneratedPrompt {
  prompt: string;
  isAnchor: boolean;
  motionIntent: string;
}

/**
 * Generate a full anchor prompt for the first clip in a chain
 * Includes complete character description, pose, environment, lighting, mood
 */
export function generateAnchorPrompt(context: PromptContext): GeneratedPrompt {
  const { scene, character } = context;
  const parts: string[] = [];

  // Character description (if available)
  if (character) {
    // Use appearance_tags if available
    const appearance = character.appearance_tags?.join(', ') || '';
    if (appearance) {
      parts.push(appearance);
    } else if (character.name) {
      parts.push(`${character.name}`);
    }
  }

  // Scene setting and description
  if (scene.setting) {
    const atmosphere = getSettingAtmosphere(scene.setting);
    parts.push(scene.setting);
    if (atmosphere) {
      parts.push(atmosphere);
    }
  }

  // Scene description adds narrative context
  if (scene.description) {
    parts.push(scene.description);
  }

  // Mood-based motion
  const motionIntent = getMoodMotion(scene.mood);
  if (motionIntent) {
    parts.push(motionIntent);
  }

  // Quality and style tags
  parts.push('cinematic quality', 'natural movement', 'smooth motion');

  return {
    prompt: parts.filter(Boolean).join(', '),
    isAnchor: true,
    motionIntent: motionIntent || 'natural movement',
  };
}

/**
 * Generate a chained prompt for follow-up clips
 * Focuses on motion intent, NOT identity re-description
 */
export function generateChainedPrompt(context: PromptContext): GeneratedPrompt {
  const { scene, previousClip } = context;
  const parts: string[] = [];

  // Reference continuity (the reference image handles identity)
  parts.push('same character and setting');
  parts.push('continuing the motion');

  // Motion intent based on mood
  const motionIntent = getMoodMotion(scene.mood);
  if (motionIntent) {
    parts.push(motionIntent);
  }

  // Subtle variation to avoid static feel
  parts.push('slight natural variation');

  // Add context from previous prompt if relevant
  if (previousClip?.prompt) {
    // Extract any action words from previous prompt
    const actionHint = extractActionContext(previousClip.prompt);
    if (actionHint) {
      parts.push(`continuing ${actionHint}`);
    }
  }

  // Quality tags
  parts.push('smooth continuous motion', 'cinematic quality');

  return {
    prompt: parts.filter(Boolean).join(', '),
    isAnchor: false,
    motionIntent: motionIntent || 'continuing motion',
  };
}

/**
 * Generate prompt based on context (auto-selects anchor vs chained)
 */
export function generateClipPrompt(context: PromptContext): GeneratedPrompt {
  if (context.isFirstClip || !context.previousClip?.extracted_frame_url) {
    return generateAnchorPrompt(context);
  }
  return generateChainedPrompt(context);
}

/**
 * Get motion description based on mood
 */
function getMoodMotion(mood?: string): string {
  if (!mood) return 'natural subtle movement';

  const normalizedMood = mood.toLowerCase();
  const motions = MOOD_MOTION_MAP[normalizedMood];

  if (motions && motions.length > 0) {
    // Return the first (primary) motion for the mood
    return motions[0];
  }

  // Default motion for unknown moods
  return 'natural subtle movement';
}

/**
 * Get atmosphere description based on setting
 */
function getSettingAtmosphere(setting?: string): string | null {
  if (!setting) return null;

  const normalizedSetting = setting.toLowerCase();

  // Check for keyword matches
  for (const [key, atmosphere] of Object.entries(SETTING_ATMOSPHERE_MAP)) {
    if (normalizedSetting.includes(key)) {
      return atmosphere;
    }
  }

  return null;
}

/**
 * Extract action context from a previous prompt
 */
function extractActionContext(prompt: string): string | null {
  // Look for action-related words
  const actionPatterns = [
    /moving\s+(\w+)/i,
    /walking\s+(\w+)?/i,
    /turning\s+(\w+)?/i,
    /reaching\s+(\w+)?/i,
    /looking\s+(\w+)?/i,
    /leaning\s+(\w+)?/i,
  ];

  for (const pattern of actionPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      return match[0].toLowerCase();
    }
  }

  return null;
}

/**
 * Prompt templates for common scene types
 */
export const SCENE_PROMPT_TEMPLATES = {
  introduction: {
    anchor: '{character} in {setting}, establishing shot, {mood} atmosphere, cinematic opening',
    chain: 'same scene, subtle movement, natural breathing, maintaining pose',
  },
  transition: {
    anchor: '{character} transitioning, smooth motion, {setting}, {mood} tone',
    chain: 'continuing transition, fluid movement, same lighting',
  },
  climax: {
    anchor: '{character} in {setting}, peak moment, {mood} intensity, dramatic lighting',
    chain: 'sustaining intensity, powerful motion, emotional peak',
  },
  resolution: {
    anchor: '{character} in {setting}, calming down, {mood} resolution, soft lighting',
    chain: 'gentle wind-down, relaxing motion, peaceful atmosphere',
  },
};

/**
 * Apply a template with context values
 */
export function applyPromptTemplate(
  template: string,
  context: {
    character?: string;
    setting?: string;
    mood?: string;
    [key: string]: string | undefined;
  }
): string {
  let result = template;

  for (const [key, value] of Object.entries(context)) {
    if (value) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
  }

  // Remove any unfilled placeholders
  result = result.replace(/\{[^}]+\}/g, '');

  // Clean up extra spaces and commas
  result = result.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Suggest prompts for a scene based on its configuration
 */
export function suggestPromptsForScene(
  scene: StoryboardScene,
  character?: Character,
  clipCount: number = 3
): string[] {
  const suggestions: string[] = [];

  // Generate anchor prompt for first clip
  const anchorContext: PromptContext = {
    scene,
    character,
    clipIndex: 0,
    isFirstClip: true,
  };
  suggestions.push(generateAnchorPrompt(anchorContext).prompt);

  // Generate chained prompts for subsequent clips
  for (let i = 1; i < clipCount; i++) {
    const chainContext: PromptContext = {
      scene,
      character,
      clipIndex: i,
      isFirstClip: false,
      previousClip: {
        id: 'temp',
        scene_id: scene.id,
        clip_order: i - 1,
        prompt: suggestions[i - 1],
        status: 'completed',
        extracted_frame_url: 'placeholder', // Indicates chaining is available
        generation_metadata: {},
        created_at: '',
        updated_at: '',
      },
    };
    suggestions.push(generateChainedPrompt(chainContext).prompt);
  }

  return suggestions;
}
