import React from 'react';
import { MobileCharacterCard } from './MobileCharacterCard';

interface Character {
  id: string;
  name: string;
  description: string;
  image_url: string;
  preview_image_url?: string;
  quick_start?: boolean;
  category?: string;
  consistency_method?: string;
  interaction_count?: number;
  likes_count?: number;
  content_rating?: string;
  gender?: string;
  role?: string;
  appearance_tags?: string[];
  traits?: string;
  persona?: string;
  voice_examples?: string[];
  forbidden_phrases?: string[];
  scene_behavior_rules?: any;
  user_id?: string;
  is_public?: boolean;
}

interface CharacterGridProps {
  characters: Character[];
  onCharacterSelect: (characterId: string) => void;
  onCharacterPreview: (characterId: string) => void;
  onCharacterDelete?: (characterId: string) => Promise<void>;
}

export const CharacterGrid: React.FC<CharacterGridProps> = ({
  characters,
  onCharacterSelect,
  onCharacterPreview,
  onCharacterDelete
}) => {
  if (characters.length === 0) {
    return null;
  }

  // Dynamic grid using auto-fit with minmax for truly responsive behavior
  // Min 130px tile, max flexible - 2 cols on small phones, scales up on larger screens
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
      {characters.map((character) => (
        <MobileCharacterCard
          key={character.id}
          character={character}
          onSelect={() => onCharacterSelect(character.id)}
          onPreview={() => onCharacterPreview(character.id)}
          onDelete={onCharacterDelete}
        />
      ))}
    </div>
  );
};
