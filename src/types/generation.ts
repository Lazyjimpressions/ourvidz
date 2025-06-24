
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
}

export const GENERATION_CONFIGS: Record<string, GenerationOptions> = {
  'image_fast': {
    format: 'image',
    quality: 'fast',
    credits: 0.5,
    estimatedTime: '10-30 seconds',
    resolution: '1024x1024',
    description: 'Quick image generation with good quality'
  },
  'image_high': {
    format: 'image',
    quality: 'high',
    credits: 1,
    estimatedTime: '1-2 minutes',
    resolution: '1024x1024',
    description: 'High-quality image with enhanced details'
  },
  'video_fast': {
    format: 'video',
    quality: 'fast',
    credits: 2,
    estimatedTime: '2-5 minutes',
    resolution: '720p',
    description: 'Quick video generation, good for previews'
  },
  'video_high': {
    format: 'video',
    quality: 'high',
    credits: 3,
    estimatedTime: '5-10 minutes',
    resolution: '1080p',
    description: 'High-quality video with enhanced details'
  }
};

export const getModelType = (format: GenerationFormat, quality: GenerationQuality): string => {
  return `${format}_${quality}`;
};

export const getGenerationConfig = (format: GenerationFormat, quality: GenerationQuality): GenerationOptions => {
  const modelType = getModelType(format, quality);
  return GENERATION_CONFIGS[modelType];
};
