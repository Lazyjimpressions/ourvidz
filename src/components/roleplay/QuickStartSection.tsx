import React from 'react';
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
  appearance_tags?: string[];
  traits?: string;
  persona?: string;
  gender?: string;
  reference_image_url?: string;
  seed_locked?: number;
}

interface QuickStartSectionProps {
  onCharacterSelect: (characterId: string) => void;
}

export const QuickStartSection: React.FC<QuickStartSectionProps> = ({
  onCharacterSelect
}) => {
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
      likes_count: char.likes_count,
      appearance_tags: char.appearance_tags,
      traits: char.traits,
      persona: char.persona,
      gender: char.gender,
      reference_image_url: char.reference_image_url,
      seed_locked: (char as any).seed_locked
    }));

  if (quickStartCharacters.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-blue-400" />
        <h2 className="text-base font-medium text-white">Quick Start</h2>
      </div>
      
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {quickStartCharacters.map((character) => (
          <div key={character.id} className="relative">
            <MobileCharacterCard
              character={character}
              onSelect={() => onCharacterSelect(character.id)}
              onPreview={() => console.log('Preview:', character.id)}
            />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  );
};
