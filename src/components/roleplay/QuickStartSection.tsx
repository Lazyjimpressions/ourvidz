import React from 'react';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { MobileCharacterCard } from './MobileCharacterCard';
import { Sparkles } from 'lucide-react';

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

interface QuickStartSectionProps {
  onCharacterSelect: (characterId: string) => void;
}

export const QuickStartSection: React.FC<QuickStartSectionProps> = ({
  onCharacterSelect
}) => {
  const { isMobile } = useMobileDetection();

  // Mock quick start characters - replace with actual data
  const quickStartCharacters: Character[] = [
    {
      id: '1',
      name: 'Luna the Mystic',
      description: 'A wise and mysterious character with magical abilities',
      image_url: '/placeholder-character-1.jpg',
      quick_start: true,
      category: 'Fantasy',
      consistency_method: 'i2i_reference'
    },
    {
      id: '2',
      name: 'Alex the Explorer',
      description: 'An adventurous character ready for exciting journeys',
      image_url: '/placeholder-character-2.jpg',
      quick_start: true,
      category: 'Adventure',
      consistency_method: 'i2i_reference'
    },
    {
      id: '3',
      name: 'Maya the Scientist',
      description: 'A brilliant scientist with innovative ideas',
      image_url: '/placeholder-character-3.jpg',
      quick_start: true,
      category: 'Sci-Fi',
      consistency_method: 'i2i_reference'
    }
  ];

  if (quickStartCharacters.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-white">Quick Start</h2>
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
          Start chatting with these featured characters instantly
        </p>
      </div>
    </div>
  );
};
