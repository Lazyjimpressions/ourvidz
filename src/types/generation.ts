
export type GenerationFormat = 'image' | 'video';
export type GenerationQuality = 'fast' | 'high';

export interface GenerationRequest {
  format: GenerationFormat;
  quality: GenerationQuality;
  prompt: string;
  projectId?: string;
  metadata?: Record<string, any>;
}

export interface GenerationOptions {
  format: GenerationFormat;
  quality: GenerationQuality;
  credits: number;
  estimatedTime: string;
  resolution: string;
  description: string;
  modelVariant: string;
  displayName: string;
  icon: string;
  priority: string;
  qualityLevel: string;
}

// Updated configuration aligned with 1.3B model for ALL job types
export const GENERATION_CONFIGS: Record<string, GenerationOptions> = {
  'image_fast': {
    format: 'image',
    quality: 'fast',
    credits: 1,
    estimatedTime: '15-30 seconds',      // Updated from '15-45 seconds'
    resolution: '832x480',
    description: 'Quick image generation (1 frame from Wan 2.1 1.3B)',
    modelVariant: 'wan_2_1_1_3b',
    displayName: 'Fast Image',
    icon: '⚡',
    priority: 'speed',
    qualityLevel: 'Good'
  },
  'image_high': {
    format: 'image',
    quality: 'high',
    credits: 2,
    estimatedTime: '45-90 seconds',      // Updated from '30-60 seconds'
    resolution: '1280x720',
    description: 'High-quality image (1 frame from Wan 2.1 1.3B)', // Updated from 14B
    modelVariant: 'wan_2_1_1_3b',        // Updated from 'wan_2_1_14b'
    displayName: 'High Quality Image',
    icon: '🎨',
    priority: 'quality',
    qualityLevel: 'High'
  },
  'video_fast': {
    format: 'video',
    quality: 'fast',
    credits: 3,
    estimatedTime: '1-2 minutes',        // Updated from '2-4 minutes'
    resolution: '832x480',
    description: '1-second video from Wan 2.1 1.3B', // Updated from '5-second'
    modelVariant: 'wan_2_1_1_3b',
    displayName: 'Fast Video',
    icon: '🚀',
    priority: 'speed',
    qualityLevel: 'Good'
  },
  'video_high': {
    format: 'video',
    quality: 'high',
    credits: 5,
    estimatedTime: '3-6 minutes',        // Updated from '8-15 minutes'
    resolution: '1280x720',
    description: '2-second HD video from Wan 2.1 1.3B', // Updated from '5-second' and '14B'
    modelVariant: 'wan_2_1_1_3b',        // Updated from 'wan_2_1_14b'
    displayName: 'High Quality Video',
    icon: '🎬',
    priority: 'quality',
    qualityLevel: 'High'
  }
};

export const getModelType = (format: GenerationFormat, quality: GenerationQuality): string => {
  return `${format}_${quality}`;
};

export const getGenerationConfig = (format: GenerationFormat, quality: GenerationQuality): GenerationOptions => {
  const modelType = getModelType(format, quality);
  return GENERATION_CONFIGS[modelType];
};

// Legacy types for backward compatibility
export type MediaType = 'image' | 'video';
export type Quality = 'fast' | 'high';

export interface FunctionalGenerationOptions {
  mediaType: MediaType;
  quality: Quality;
  prompt: string;
  characterId?: string;
}
