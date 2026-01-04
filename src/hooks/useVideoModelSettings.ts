import { useMemo } from 'react';
import { useVideoModels } from './useApiModels';

export interface VideoModelSettings {
  durationOptions: number[];
  resolutionOptions: string[];
  fpsOptions: number[];
  aspectRatioOptions: string[];
  guideScaleRange: { min: number; max: number; default: number };
  referenceMode: 'single' | 'dual' | 'none';
  defaultDuration: number;
  defaultResolution: string;
  defaultFps: number;
  defaultGuideScale: number;
  defaultAspectRatio: string;
}

/**
 * Hook to extract video-specific settings from selected model's capabilities
 */
export const useVideoModelSettings = (selectedModelId: string | null) => {
  const { data: videoModels, isLoading } = useVideoModels();

  const settings = useMemo<VideoModelSettings | null>(() => {
    if (!selectedModelId || !videoModels) return null;

    const model = videoModels.find(m => m.id === selectedModelId);
    if (!model) return null;

    const capabilities = (model as any).capabilities || {};
    const videoCapabilities = capabilities.video || {};
    const inputDefaults = (model as any).input_defaults || {};

    // Extract duration range and calculate options
    const durationRange = videoCapabilities.duration_range || { min: 3, max: 20, default: 5 };
    const numFramesRange = videoCapabilities.num_frames_range || { min: 81, max: 100, default: 81 };
    const fpsRange = videoCapabilities.fps_range || { min: 5, max: 24, default: 16 };

    // Calculate duration options from num_frames and fps combinations
    // Generate common combinations: min/max/default and some in between
    const durationOptions: number[] = [];
    
    // Add default duration
    if (durationRange.default) {
      durationOptions.push(durationRange.default);
    }
    
    // Add min and max
    if (durationRange.min && !durationOptions.includes(durationRange.min)) {
      durationOptions.push(durationRange.min);
    }
    if (durationRange.max && !durationOptions.includes(durationRange.max)) {
      durationOptions.push(durationRange.max);
    }
    
    // Add some common durations in between
    const commonDurations = [3, 5, 8, 10, 12, 15, 18, 20];
    commonDurations.forEach(dur => {
      if (dur >= durationRange.min && dur <= durationRange.max && !durationOptions.includes(dur)) {
        durationOptions.push(dur);
      }
    });
    
    // Sort and round to 1 decimal place
    durationOptions.sort((a, b) => a - b);
    const roundedOptions = durationOptions.map(d => Math.round(d * 10) / 10);

    return {
      durationOptions: roundedOptions,
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
  }, [selectedModelId, videoModels]);

  return {
    settings,
    isLoading,
    hasSettings: !!settings,
  };
};

