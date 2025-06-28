
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

// Updated configuration with Phase 2 optimized timing estimates
export const GENERATION_CONFIGS: Record<string, GenerationOptions> = {
  'image_fast': {
    format: 'image',
    quality: 'fast',
    credits: 1,
    estimatedTime: '45-75 seconds',      // Updated: 37% faster with medium resolution
    resolution: '640x360',               // Updated: Medium resolution for speed
    description: 'Fast image generation (medium resolution, optimized)',
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
    estimatedTime: '90-120 seconds',     // Updated: High resolution, high quality
    resolution: '832x480',               // Updated: High resolution
    description: 'High-quality image (high resolution, premium quality)',
    modelVariant: 'wan_2_1_1_3b',
    displayName: 'High Quality Image',
    icon: '🎨',
    priority: 'quality',
    qualityLevel: 'High'
  },
  'video_fast': {
    format: 'video',
    quality: 'fast',
    credits: 3,
    estimatedTime: '60-90 seconds',      // Updated: 38% faster with medium resolution
    resolution: '640x360',               // Updated: Medium resolution for speed
    description: '2-second video (medium resolution, optimized)',
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
    estimatedTime: '2-3 minutes',        // Updated: High resolution, high quality
    resolution: '832x480',               // Updated: High resolution
    description: '2-second HD video (high resolution, premium quality)',
    modelVariant: 'wan_2_1_1_3b',
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
