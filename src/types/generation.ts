
export type GenerationFormat = 
  | 'sdxl_image_fast' 
  | 'sdxl_image_high'
  | 'image_fast' 
  | 'image_high' 
  | 'video_fast' 
  | 'video_high';

export type GenerationQuality = 'fast' | 'high';

export interface GenerationConfig {
  format: GenerationFormat;
  displayName: string;
  description: string;
  estimatedTime: string;
  credits: number;
  isVideo: boolean;
  isSDXL: boolean;
  bucket: string;
  queue: string;
}

export const GENERATION_CONFIGS: Record<GenerationFormat, GenerationConfig> = {
  sdxl_image_fast: {
    format: 'sdxl_image_fast',
    displayName: 'SDXL Fast',
    description: 'Ultra-fast NSFW image generation',
    estimatedTime: '5 seconds',
    credits: 1,
    isVideo: false,
    isSDXL: true,
    bucket: 'sdxl_image_fast',
    queue: 'sdxl_queue'
  },
  sdxl_image_high: {
    format: 'sdxl_image_high',
    displayName: 'SDXL High',
    description: 'High-quality NSFW image generation',
    estimatedTime: '8 seconds',
    credits: 2,
    isVideo: false,
    isSDXL: true,
    bucket: 'sdxl_image_high',
    queue: 'sdxl_queue'
  },
  image_fast: {
    format: 'image_fast',
    displayName: 'WAN Fast',
    description: 'Fast standard image generation',
    estimatedTime: '73 seconds',
    credits: 1,
    isVideo: false,
    isSDXL: false,
    bucket: 'image_fast',
    queue: 'wan_queue'
  },
  image_high: {
    format: 'image_high',
    displayName: 'WAN High',
    description: 'High-quality standard image generation',
    estimatedTime: '90 seconds',
    credits: 2,
    isVideo: false,
    isSDXL: false,
    bucket: 'image_high',
    queue: 'wan_queue'
  },
  video_fast: {
    format: 'video_fast',
    displayName: 'Video Fast',
    description: 'Fast video generation',
    estimatedTime: '180 seconds',
    credits: 3,
    isVideo: true,
    isSDXL: false,
    bucket: 'video_fast',
    queue: 'wan_queue'
  },
  video_high: {
    format: 'video_high',
    displayName: 'Video High',
    description: 'High-quality video generation',
    estimatedTime: '280 seconds',
    credits: 5,
    isVideo: true,
    isSDXL: false,
    bucket: 'video_high',
    queue: 'wan_queue'
  }
};

export interface GenerationRequest {
  format: GenerationFormat;
  prompt: string;
  projectId?: string;
  videoId?: string;
  imageId?: string;
  metadata?: {
    model_variant?: string;
    credits?: number;
    [key: string]: any;
  };
}

export interface GenerationStatus {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  format: GenerationFormat;
  progress?: number;
  estimatedTimeRemaining?: number;
  error?: string;
  result?: {
    url?: string;
    filePath?: string;
  };
}
