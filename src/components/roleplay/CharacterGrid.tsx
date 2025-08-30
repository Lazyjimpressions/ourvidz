import React from 'react';
import { useMobileDetection } from '@/hooks/useMobileDetection';
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
}

interface CharacterGridProps {
  characters: Character[];
  onCharacterSelect: (characterId: string) => void;
  onCharacterPreview: (characterId: string) => void;
}

export const CharacterGrid: React.FC<CharacterGridProps> = ({
  characters,
  onCharacterSelect,
  onCharacterPreview
}) => {
  const { isMobile, isTablet, isDesktop } = useMobileDetection();

  const getGridColumns = () => {
    if (isMobile) {
      return 'grid-cols-1 sm:grid-cols-2';
    } else if (isTablet) {
      return 'grid-cols-2 md:grid-cols-3';
    } else {
      return 'grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
    }
  };

  const getGapSize = () => {
    if (isMobile) {
      return 'gap-3';
    } else if (isTablet) {
      return 'gap-4';
    } else {
      return 'gap-6';
    }
  };

  if (characters.length === 0) {
    return null;
  }

  return (
    <div className={`grid ${getGridColumns()} ${getGapSize()} mb-8`}>
      {characters.map((character) => (
        <MobileCharacterCard
          key={character.id}
          character={character}
          onSelect={() => onCharacterSelect(character.id)}
          onPreview={() => onCharacterPreview(character.id)}
        />
      ))}
    </div>
  );
};
