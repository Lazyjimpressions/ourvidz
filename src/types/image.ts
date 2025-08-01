
export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  quality?: 'fast' | 'high';
}
