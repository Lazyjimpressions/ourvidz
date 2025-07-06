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
}