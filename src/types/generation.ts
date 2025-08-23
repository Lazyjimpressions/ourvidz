
export type GenerationFormat = 
  | 'sdxl_image_fast' 
  | 'sdxl_image_high'
  | 'rv51_fast'
  | 'rv51_high'
  | 'image_fast' 
  | 'image_high' 
  | 'video_fast' 
  | 'video_high'
  | 'image7b_fast_enhanced'
  | 'image7b_high_enhanced'
  | 'video7b_fast_enhanced'
  | 'video7b_high_enhanced';

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
  rv51_fast: {
    format: 'rv51_fast',
    displayName: 'RV5.1 Fast',
    description: 'Fast realistic image generation via Replicate',
    estimatedTime: '10 seconds',
    credits: 1,
    isVideo: false,
    isSDXL: false,
    bucket: 'workspace-temp',
    queue: 'replicate_queue'
  },
  rv51_high: {
    format: 'rv51_high',
    displayName: 'RV5.1 High',
    description: 'High-quality realistic image generation via Replicate',
    estimatedTime: '15 seconds',
    credits: 2,
    isVideo: false,
    isSDXL: false,
    bucket: 'workspace-temp',
    queue: 'replicate_queue'
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
  },
  image7b_fast_enhanced: {
    format: 'image7b_fast_enhanced',
    displayName: 'Enhanced Fast',
    description: 'AI-enhanced fast image generation with Qwen 7B',
    estimatedTime: '87 seconds',
    credits: 2,
    isVideo: false,
    isSDXL: false,
    bucket: 'image7b_fast_enhanced',
    queue: 'wan_queue'
  },
  image7b_high_enhanced: {
    format: 'image7b_high_enhanced',
    displayName: 'Enhanced High',
    description: 'AI-enhanced high-quality image generation with Qwen 7B',
    estimatedTime: '104 seconds',
    credits: 3,
    isVideo: false,
    isSDXL: false,
    bucket: 'image7b_high_enhanced',
    queue: 'wan_queue'
  },
  video7b_fast_enhanced: {
    format: 'video7b_fast_enhanced',
    displayName: 'Enhanced Video Fast',
    description: 'AI-enhanced fast video generation with Qwen 7B',
    estimatedTime: '194 seconds',
    credits: 4,
    isVideo: true,
    isSDXL: false,
    bucket: 'video7b_fast_enhanced',
    queue: 'wan_queue'
  },
  video7b_high_enhanced: {
    format: 'video7b_high_enhanced',
    displayName: 'Enhanced Video High',
    description: 'AI-enhanced high-quality video generation with Qwen 7B',
    estimatedTime: '294 seconds',
    credits: 6,
    isVideo: true,
    isSDXL: false,
    bucket: 'video7b_high_enhanced',
    queue: 'wan_queue'
  }
};

export interface GenerationRequest {
  format: GenerationFormat;
  prompt: string;
  originalPrompt?: string;
  enhancedPrompt?: string;
  isPromptEnhanced?: boolean;
  enhancementMetadata?: any;
  selectedPresets?: string[];
  projectId?: string;
  videoId?: string;
  imageId?: string;
  referenceImageUrl?: string;
  startReferenceImageUrl?: string;
  endReferenceImageUrl?: string;
  batchCount?: number;
  metadata?: {
    model_variant?: string;
    credits?: number;
    reference_image?: boolean;
    reference_strength?: number;
    reference_type?: 'style' | 'composition' | 'character';
    similarity_strength?: number; // Legacy support
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
