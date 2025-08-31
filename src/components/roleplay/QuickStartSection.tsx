import React from 'react';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { MobileCharacterCard } from './MobileCharacterCard';
import { Sparkles } from 'lucide-react';
import { usePublicCharacters } from '@/hooks/usePublicCharacters';

interface Character {
  id: string;
  name: string;
  description: string;
  image_url: string;
  preview_image_url?: string;
  quick_start?: boolean;
  category?: string;
  consistency_method?: string;
  interaction_count: number;
  likes_count: number;
}

interface QuickStartSectionProps {
  onCharacterSelect: (characterId: string) => void;
}

export const QuickStartSection: React.FC<QuickStartSectionProps> = ({
  onCharacterSelect
}) => {
  const { isMobile, isTablet, isDesktop } = useMobileDetection();
  const { characters } = usePublicCharacters();

  // Get popular characters for quick start (high interaction count)
  const quickStartCharacters = characters
    .filter(char => char.interaction_count > 20) // Characters with 20+ interactions
    .sort((a, b) => b.interaction_count - a.interaction_count) // Sort by popularity
    .slice(0, 3) // Top 3
    .map(char => ({
      id: char.id,
      name: char.name,
      description: char.description,
      image_url: char.image_url,
      preview_image_url: char.reference_image_url || char.image_url,
      quick_start: true,
      category: char.content_rating === 'nsfw' ? 'nsfw' : 'sfw',
      consistency_method: (char as any).consistency_method || 'i2i_reference',
      interaction_count: char.interaction_count,
      likes_count: char.likes_count
    }));

  if (quickStartCharacters.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-white">Quick Start</h2>
        <span className="text-gray-400 text-sm">Popular Characters</span>
      </div>
      
      <div className={`
        grid gap-3
        ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}
      `}>
        {quickStartCharacters.map((character) => (
          <div key={character.id} className="relative">
            <MobileCharacterCard
              character={character}
              onSelect={() => onCharacterSelect(character.id)}
              onPreview={() => console.log('Preview:', character.id)}
            />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-gray-400 text-sm">
          Start chatting with these popular characters instantly
        </p>
        <p className="text-gray-500 text-xs mt-1">
          {quickStartCharacters.length} character{quickStartCharacters.length !== 1 ? 's' : ''} available
        </p>
      </div>
    </div>
  );
};
