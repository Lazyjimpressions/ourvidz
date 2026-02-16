import { useMemo } from 'react';
import { useVideoModels } from './useApiModels';

export interface VideoModelSettings {
  durationOptions: number[];
  resolutionOptions: string[];
  fpsOptions: number[];
  aspectRatioOptions: string[];
  guideScaleRange: { min: number; max: number; default: number };
  referenceMode: 'single' | 'dual' | 'video' | 'none';
  defaultDuration: number;
  defaultResolution: string;
  defaultFps: number;
  defaultGuideScale: number;
  defaultAspectRatio: string;
  /** Extend-specific: video conditioning schema properties */
  videoConditioningSchema?: Record<string, any>;
}

/**
 * Generate integer duration step options within a min/max range
 */
function generateDurationSteps(minDuration: number, maxDuration: number): number[] {
  const steps: number[] = [];
  const start = Math.max(1, Math.ceil(minDuration));
  const end = Math.floor(maxDuration);
  for (let i = start; i <= end; i++) {
    steps.push(i);
  }
  // If no integer steps fit, include the rounded max
  if (steps.length === 0) {
    steps.push(Math.round(maxDuration));
  }
  return steps;
}

/**
 * Derive video settings from input_schema format (llms.txt / fal-style)
 */
function deriveFromInputSchema(
  schema: Record<string, any>,
  inputDefaults: Record<string, any>
): VideoModelSettings {
  const numFrames = schema.num_frames || {};
  const frameRate = schema.frame_rate || {};
  const resolution = schema.resolution || {};
  const aspectRatio = schema.aspect_ratio || {};
  const guideScale = schema.guide_scale || {};

  const defaultFps = inputDefaults.frame_rate || frameRate.default || 24;

  // Duration from num_frames / frame_rate
  const minDuration = (numFrames.min || 9) / defaultFps;
  const maxDuration = (numFrames.max || 161) / defaultFps;
  const defaultNumFrames = inputDefaults.num_frames || numFrames.default || 121;
  const defaultDuration = Math.round(defaultNumFrames / defaultFps);

  const durationOptions = generateDurationSteps(minDuration, maxDuration);

  // FPS range
  const fpsMin = frameRate.min || defaultFps;
  const fpsMax = frameRate.max || defaultFps;
  const fpsOptions = Array.from(
    { length: fpsMax - fpsMin + 1 },
    (_, i) => fpsMin + i
  );

  // Reference mode: detect video conditioning (extend), image_url (I2V), or none (T2V)
  const referenceMode: 'single' | 'dual' | 'video' | 'none' = 
    schema.video?.required === true
      ? 'video'       // Extend model -- needs source video
      : schema.image_url
        ? 'single'    // I2V -- needs source image
        : 'none';     // T2V -- no reference needed

  return {
    durationOptions,
    resolutionOptions: resolution.options || ['720p'],
    fpsOptions,
    aspectRatioOptions: aspectRatio.options || ['16:9', '1:1', '9:16'],
    guideScaleRange: {
      min: guideScale.min ?? 1,
      max: guideScale.max ?? 20,
      default: guideScale.default ?? inputDefaults.guide_scale ?? 5,
    },
    referenceMode,
    videoConditioningSchema: schema.video?.required ? schema.video : undefined,
    defaultDuration: durationOptions.includes(defaultDuration) ? defaultDuration : durationOptions[0] || 5,
    defaultResolution: inputDefaults.resolution || resolution.default || '720p',
    defaultFps: defaultFps,
    defaultGuideScale: inputDefaults.guide_scale || guideScale.default || 5,
    defaultAspectRatio: inputDefaults.aspect_ratio || aspectRatio.default || 'auto',
  };
}

/**
 * Derive video settings from legacy capabilities.video format
 */
function deriveFromLegacyVideo(
  videoCapabilities: Record<string, any>,
  inputDefaults: Record<string, any>
): VideoModelSettings {
  const durationRange = videoCapabilities.duration_range || { min: 3, max: 20, default: 5 };
  const fpsRange = videoCapabilities.fps_range || { min: 5, max: 24, default: 16 };

  // Build duration options
  const durationOptions: number[] = [];
  if (durationRange.default) durationOptions.push(durationRange.default);
  if (durationRange.min && !durationOptions.includes(durationRange.min)) durationOptions.push(durationRange.min);
  if (durationRange.max && !durationOptions.includes(durationRange.max)) durationOptions.push(durationRange.max);
  [3, 5, 8, 10, 12, 15, 18, 20].forEach(dur => {
    if (dur >= durationRange.min && dur <= durationRange.max && !durationOptions.includes(dur)) {
      durationOptions.push(dur);
    }
  });
  durationOptions.sort((a, b) => a - b);

  return {
    durationOptions: durationOptions.map(d => Math.round(d * 10) / 10),
    resolutionOptions: videoCapabilities.resolutions || ['720p'],
    fpsOptions: Array.from({ length: fpsRange.max - fpsRange.min + 1 }, (_, i) => fpsRange.min + i),
    aspectRatioOptions: videoCapabilities.aspect_ratios || ['16:9', '1:1', '9:16'],
    guideScaleRange: videoCapabilities.guide_scale_range || { min: 1, max: 20, default: 5 },
    referenceMode: videoCapabilities.reference_mode || 'none',
    defaultDuration: durationRange.default || 5,
    defaultResolution: inputDefaults.resolution || '720p',
    defaultFps: fpsRange.default || 16,
    defaultGuideScale: inputDefaults.guide_scale || 5,
    defaultAspectRatio: inputDefaults.aspect_ratio || 'auto',
  };
}

/**
 * Hook to extract video-specific settings from selected model's capabilities.
 * Supports both input_schema (llms.txt) and legacy capabilities.video formats.
 */
export const useVideoModelSettings = (selectedModelId: string | null) => {
  const { data: videoModels, isLoading } = useVideoModels();

  const settings = useMemo<VideoModelSettings | null>(() => {
    if (!selectedModelId || !videoModels) return null;

    const model = videoModels.find(m => m.id === selectedModelId);
    if (!model) return null;

    const capabilities = model.capabilities || {};
    const inputDefaults = model.input_defaults || {};

    // Prefer input_schema (new format from llms.txt)
    if (capabilities.input_schema && Object.keys(capabilities.input_schema).length > 0) {
      return deriveFromInputSchema(capabilities.input_schema, inputDefaults);
    }

    // Fall back to legacy capabilities.video format
    return deriveFromLegacyVideo(capabilities.video || {}, inputDefaults);
  }, [selectedModelId, videoModels]);

  return {
    settings,
    isLoading,
    hasSettings: !!settings,
  };
};
