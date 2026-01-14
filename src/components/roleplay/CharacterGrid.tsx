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

  // Dynamic grid: 2 cols on small phones, 3 on larger phones/tablets, 4-5 on desktop
  // Using min-width approach to prevent overflow
  return (
    <div className="grid gap-2 grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
