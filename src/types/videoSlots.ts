/**
 * Video reference slot for MultiCondition temporal timeline.
 * Each slot places an image at a specific frame position (0-160, multiples of 8).
 */
export interface VideoRefSlot {
  url: string | null;
  isVideo: boolean;
  frameNum: number; // 0-160, multiples of 8
  strength: number; // 0-1, default 1. How strongly this keyframe influences the video.
}

/**
 * Auto-space N filled images evenly across 0..maxFrame, snapped to multiples of 8.
 * Examples:
 *   1 image  → [0]
 *   2 images → [0, 160]
 *   3 images → [0, 80, 160]
 */
export function autoSpaceFrames(count: number, maxFrame: number = 160): number[] {
  if (count <= 1) return [0];
  const step = Math.floor(maxFrame / (count - 1) / 8) * 8;
  return Array.from({ length: count }, (_, i) => Math.min(i * step, maxFrame));
}

/** fal.ai LTX MultiCondition uses fixed 1441 internal frames (0-1440) regardless of output duration */
export const LTX_INTERNAL_MAX_FRAME = 1440;

/**
 * Get evenly spaced frame position in fal.ai's 1441 internal space.
 * For 5 slots: [0, 360, 720, 1080, 1440]
 * For 3 slots: [0, 720, 1440]
 */
export function getFrameForSlot(slotIndex: number, numSlots: number = 5): number {
  if (numSlots <= 1) return 0;
  const step = LTX_INTERNAL_MAX_FRAME / (numSlots - 1);
  return Math.round(slotIndex * step);
}

/** Frame label for UI display */
export function getFrameLabel(frameNum: number): string {
  return `F${frameNum}`;
}

/** Video slot labels for multi-conditioning UI */
export const VIDEO_MULTI_LABELS = ['Start', 'Mid 1', 'Mid 2', 'End', 'Key 5'];

/** Default 10 empty video slots */
export const DEFAULT_VIDEO_SLOTS: VideoRefSlot[] =
  Array.from({ length: 10 }, () => ({ url: null, isVideo: false, frameNum: 0, strength: 1 }));
