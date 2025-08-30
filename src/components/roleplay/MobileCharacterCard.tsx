import React, { useState } from 'react';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { Eye, Play } from 'lucide-react';

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

interface MobileCharacterCardProps {
  character: Character;
  onSelect: () => void;
  onPreview: () => void;
}

export const MobileCharacterCard: React.FC<MobileCharacterCardProps> = ({
  character,
  onSelect,
  onPreview
}) => {
  const { isMobile, isTouchDevice } = useMobileDetection();
  const [isPressed, setIsPressed] = useState(false);

  const handleTouchStart = () => {
    if (isTouchDevice) {
      setIsPressed(true);
    }
  };

  const handleTouchEnd = () => {
    if (isTouchDevice) {
      setIsPressed(false);
    }
  };

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPreview();
  };

  const imageUrl = character.preview_image_url || character.image_url;

  return (
    <div 
      className={`
        relative group cursor-pointer
        ${isMobile ? 'aspect-square' : 'aspect-[4/5]'}
        rounded-lg overflow-hidden
        bg-card border border-border
        transition-all duration-200
        hover:shadow-lg hover:scale-[1.02]
        ${isTouchDevice ? 'touch-manipulation' : ''}
        ${isPressed ? 'scale-[0.98] shadow-inner' : ''}
        ${character.quick_start ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
      `}
      onClick={onSelect}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={() => setIsPressed(false)}
    >
      {/* Character Image */}
      <div className="relative w-full h-full">
        <img 
          src={imageUrl} 
          alt={character.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        
        {/* Quick Start Badge */}
        {character.quick_start && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
            Quick Start
          </div>
        )}

        {/* Consistency Method Badge */}
        {character.consistency_method && (
          <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full font-medium">
            {character.consistency_method === 'i2i_reference' ? '70%' : 
             character.consistency_method === 'ip_adapter' ? '90%' : '40%'}
          </div>
        )}
        
        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
          {/* Action Buttons */}
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handlePreview}
              className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors"
              title="Preview Character"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>

          {/* Character Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-white font-semibold text-sm sm:text-base line-clamp-1">
                  {character.name}
                </h3>
                <p className="text-white/80 text-xs sm:text-sm line-clamp-2 mt-1">
                  {character.description}
                </p>
              </div>
              <div className="ml-2">
                <Play className="w-4 h-4 text-white/80" />
              </div>
            </div>
          </div>
        </div>

        {/* Category Badge */}
        {character.category && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {character.category}
          </div>
        )}
      </div>

      {/* Loading State */}
      <div className="absolute inset-0 bg-gray-800 animate-pulse opacity-0 group-hover:opacity-0">
        <div className="flex items-center justify-center h-full">
          <div className="text-white text-sm">Loading...</div>
        </div>
      </div>
    </div>
  );
};
