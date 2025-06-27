
export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  isCharacter?: boolean;
  characterName?: string;
}
