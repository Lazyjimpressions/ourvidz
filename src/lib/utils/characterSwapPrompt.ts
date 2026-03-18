/**
 * Shared character-swap prompt utilities.
 * Ensures canonical phrases are appended idempotently and validates scene intent.
 */

/** Canonical phrases the LTX MultiCondition model needs for identity + motion lock */
const APPEARANCE_PHRASE = 'Same appearance as the input image';
const MOTION_PHRASE = 'matching choreography of reference video';

/** Strict detection — only exact canonical phrases count (case-insensitive) */
const APPEARANCE_RE = /same appearance as the input image/i;
const MOTION_RE = /matching choreography of reference video/i;

/**
 * Hint-only pattern: prompt is ONLY canonical hints with no actual scene description.
 * Matches empty strings, whitespace, and any combo of the two canonical phrases.
 */
const HINT_ONLY_RE = /^[\s.,]*(?:same appearance as the input image|matching choreography of reference video|[,.\s])*$/i;

/**
 * Returns true if the prompt is in character-swap mode
 * (has both a reference image and a motion video).
 */
export function isCharacterSwapMode(
  hasImageRef: boolean,
  hasMotionVideo: boolean,
): boolean {
  return hasImageRef && hasMotionVideo;
}

/**
 * Check whether the prompt has actual scene intent beyond just canonical hints.
 * Returns false if the prompt is empty or contains only boilerplate.
 */
export function hasSceneIntent(prompt: string): boolean {
  if (!prompt || !prompt.trim()) return false;
  return !HINT_ONLY_RE.test(prompt.trim());
}

/**
 * Idempotently augment a prompt with canonical appearance + motion phrases.
 * Only appends phrases that are not already present (strict matching).
 * Returns the original prompt unchanged if it's empty (caller must validate).
 */
export function augmentCharacterSwapPrompt(prompt: string): string {
  if (!prompt || !prompt.trim()) return prompt;

  let result = prompt.trimEnd();

  const needsAppearance = !APPEARANCE_RE.test(result);
  const needsMotion = !MOTION_RE.test(result);

  if (!needsAppearance && !needsMotion) return result;

  // Add separator
  if (!result.endsWith('.') && !result.endsWith(',')) {
    result += '.';
  }

  if (needsAppearance) {
    result += ` ${APPEARANCE_PHRASE}`;
  }
  if (needsMotion) {
    result += `, ${MOTION_PHRASE}`;
  }

  return result.trim();
}

/**
 * Compute correct num_frames for LTX (must be 8n+1).
 * @param durationSec Video duration in seconds
 * @param fps Frame rate (default 30)
 * @returns num_frames value following 8n+1 pattern (e.g. 121 for ~4s @ 30fps)
 */
export function computeLtxNumFrames(durationSec: number, fps: number = 30): number {
  const raw = durationSec * fps;
  // Snap to nearest 8n+1
  const n = Math.round((raw - 1) / 8);
  return n * 8 + 1;
}

/**
 * Get the last valid frame index (for identity-lock end anchor).
 * This is num_frames - 1, which is always a multiple of 8.
 */
export function getLastValidFrame(durationSec: number, fps: number = 30): number {
  return computeLtxNumFrames(durationSec, fps) - 1;
}

/**
 * Snap a frame number to the nearest valid multiple of 8, clamped to [0, maxFrame].
 */
export function snapFrameToMultipleOf8(frame: number, maxFrame: number): number {
  const snapped = Math.round(frame / 8) * 8;
  return Math.max(0, Math.min(snapped, maxFrame));
}
