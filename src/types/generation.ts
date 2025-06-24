
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
}

export const GENERATION_CONFIGS: Record<string, GenerationOptions> = {
  'image_fast': {
    format: 'image',
    quality: 'fast',
    credits: 0.5,
    estimatedTime: '2-3 seconds',
    resolution: '832x480',
    description: 'Quick image generation (1 frame from Wan 2.1 1.3B)',
    modelVariant: 'wan_2_1_1_3b'
  },
  'image_high': {
    format: 'image',
    quality: 'high',
    credits: 1,
    estimatedTime: '3-4 seconds',
    resolution: '1280x720',
    description: 'High-quality image (1 frame from Wan 2.1 14B)',
    modelVariant: 'wan_2_1_14b'
  },
  'video_fast': {
    format: 'video',
    quality: 'fast',
    credits: 3,
    estimatedTime: '4-6 minutes',
    resolution: '832x480',
    description: '5-second video from Wan 2.1 1.3B',
    modelVariant: 'wan_2_1_1_3b'
  },
  'video_high': {
    format: 'video',
    quality: 'high',
    credits: 5,
    estimatedTime: '6-8 minutes',
    resolution: '1280x720',
    description: '5-second HD video from Wan 2.1 14B',
    modelVariant: 'wan_2_1_14b'
  }
};

export const getModelType = (format: GenerationFormat, quality: GenerationQuality): string => {
  return `${format}_${quality}`;
};

export const getGenerationConfig = (format: GenerationFormat, quality: GenerationQuality): GenerationOptions => {
  const modelType = getModelType(format, quality);
  return GENERATION_CONFIGS[modelType];
};

// Functional API Types
export type MediaType = 'image' | 'video';
export type Quality = 'low' | 'high';

export interface FunctionalGenerationOptions {
  mediaType: MediaType;
  quality: Quality;
  prompt: string;
  characterId?: string;
}
