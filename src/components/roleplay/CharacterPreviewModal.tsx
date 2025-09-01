import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Settings, 
  Heart, 
  Sparkles, 
  User, 
  MessageCircle,
  Star,
  X
} from 'lucide-react';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface Character {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  preview_image_url?: string;
  appearance_tags?: string[];
  traits?: string;
  persona?: string;
  interaction_count?: number;
  likes_count?: number;
  content_rating?: string;
  gender?: string;
  role?: string;
  quick_start?: boolean;
}

interface CharacterPreviewModalProps {
  character: Character | null;
  isOpen: boolean;
  onClose: () => void;
  onStartChat: () => void;
  onEditCharacter?: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
}

export const CharacterPreviewModal: React.FC<CharacterPreviewModalProps> = ({
  character,
  isOpen,
  onClose,
  onStartChat,
  onEditCharacter,
  onFavorite,
  isFavorite = false
}) => {
  const { isMobile } = useMobileDetection();

  if (!character) return null;

  const imageUrl = character.image_url || character.preview_image_url;
  const hasImage = !!imageUrl;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`
        max-w-md w-[95vw] max-h-[90vh] overflow-hidden
        bg-card border-border p-0
        ${isMobile ? 'rounded-none' : 'rounded-lg'}
      `}>
        {/* Header */}
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-white line-clamp-1">
              {character.name}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col h-full overflow-y-auto">
          {/* Character Image Section */}
          <div className="relative px-4">
            <div className={`
              relative rounded-lg overflow-hidden bg-gradient-to-br from-gray-700 to-gray-900
              ${hasImage ? 'aspect-square' : 'aspect-[4/3]'}
            `}>
              {hasImage ? (
                <img 
                  src={imageUrl} 
                  alt={character.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No Image</p>
                  </div>
                </div>
              )}

              {/* Quick Start Badge */}
              {character.quick_start && (
                <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded font-medium">
                  Quick Start
                </div>
              )}

              {/* Content Rating Badge */}
              {character.content_rating && (
                <div className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded font-medium">
                  {character.content_rating.toUpperCase()}
                </div>
              )}

              {/* Favorite Button */}
              {onFavorite && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onFavorite}
                  className="absolute bottom-2 right-2 h-8 w-8 p-0 bg-black/50 hover:bg-black/70 border-0"
                >
                  <Heart 
                    className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`} 
                  />
                </Button>
              )}
            </div>
          </div>

          {/* Character Info Section */}
          <div className="p-4 space-y-4">
            {/* Description */}
            <div>
              <p className="text-gray-300 text-sm leading-relaxed">
                {character.description}
              </p>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-4">
                {character.interaction_count !== undefined && (
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    <span>{character.interaction_count} chats</span>
                  </div>
                )}
                {character.likes_count !== undefined && (
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    <span>{character.likes_count} likes</span>
                  </div>
                )}
              </div>
              {character.role && (
                <Badge variant="outline" className="text-xs">
                  {character.role}
                </Badge>
              )}
            </div>

            {/* Appearance Tags */}
            {character.appearance_tags && character.appearance_tags.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-400 mb-2">Appearance</h4>
                <div className="flex flex-wrap gap-1">
                  {character.appearance_tags.slice(0, 6).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs px-2 py-1">
                      {tag}
                    </Badge>
                  ))}
                  {character.appearance_tags.length > 6 && (
                    <Badge variant="secondary" className="text-xs px-2 py-1">
                      +{character.appearance_tags.length - 6} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Personality Traits */}
            {character.traits && (
              <div>
                <h4 className="text-xs font-medium text-gray-400 mb-2">Personality</h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {character.traits}
                </p>
              </div>
            )}

            {/* Persona */}
            {character.persona && (
              <div>
                <h4 className="text-xs font-medium text-gray-400 mb-2">Character</h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {character.persona}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="p-4 pt-0">
            <div className="flex gap-2">
              <Button 
                onClick={onStartChat}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Chat
              </Button>
              
              {onEditCharacter && (
                <Button 
                  onClick={onEditCharacter}
                  variant="outline"
                  size="lg"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
