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

export interface VideoReferenceImages {
  start?: ReferenceImage;
  end?: ReferenceImage;
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
  // Enhanced workspace metadata for dragging
  enhancedPrompt?: string;
  seed?: string | number;
  generationParams?: Record<string, any>;
}
