
// Reference image interfaces
export interface ReferenceImage {
  file?: File;
  url?: string;
  type?: 'style' | 'composition' | 'character';
  strength?: number;
  // Enhanced workspace metadata
  isWorkspaceAsset?: boolean;
  originalPrompt?: string;
  enhancedPrompt?: string;
  seed?: string;
  modelType?: string;
  quality?: 'fast' | 'high';
  generationParams?: Record<string, any>;
}

// Reference metadata for exact copy functionality
export interface ReferenceMetadata {
  originalEnhancedPrompt: string;
  originalSeed?: number;
  originalGenerationParams?: any;
  originalStyle?: string;
  originalCameraAngle?: string;
  originalShotType?: string;
  aspectRatio?: string;
}

export interface VideoReferenceImages {
  start?: ReferenceImage;
  end?: ReferenceImage;
}

/** Settings for video extend (LTX Extend) workflow */
export interface VideoExtendSettings {
  strength: number;        // 0-1, how much the model can deviate from source
  reverseVideo: boolean;   // Reverse input video before extending
}

export interface MediaTile {
  id: string;
  originalAssetId: string;
  type: 'image' | 'video';
  url?: string;
  prompt: string;
  timestamp: Date;
  quality: 'fast' | 'high';
  modelType?: string;
  duration?: number;
  thumbnailUrl?: string;
  isUrlLoaded?: boolean;
  isVisible?: boolean;
  virtualIndex?: number;
  // Enhanced SDXL support
  isPartOfSet?: boolean;
  setIndex?: number;
  setSize?: number;
  setImageUrls?: string[];
  selectedImageIndices?: number[];
  // Enhanced workspace metadata for dragging - FIXED: Proper type handling for seed
  enhancedPrompt?: string;
  seed?: number; // FIXED: Changed from string | number to just number for consistency
  generationParams?: Record<string, any>;
}
