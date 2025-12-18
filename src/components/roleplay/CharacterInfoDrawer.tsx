import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Sparkles, 
  MessageCircle,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { urlSigningService } from '@/lib/services/UrlSigningService';
import { supabase } from '@/integrations/supabase/client';
import { CharacterScene } from '@/types/roleplay';
import { Character } from '@/types/roleplay';

interface CharacterInfoDrawerProps {
  character: Character | null;
  isOpen: boolean;
  onClose: () => void;
  onSceneSelect?: (scene: CharacterScene) => void;
  selectedSceneId?: string;
}

export const CharacterInfoDrawer: React.FC<CharacterInfoDrawerProps> = ({
  character,
  isOpen,
  onClose,
  onSceneSelect,
  selectedSceneId
}) => {
  const { isMobile } = useMobileDetection();
  const [signedImageUrl, setSignedImageUrl] = useState<string>('');
  const [characterScenes, setCharacterScenes] = useState<CharacterScene[]>([]);
  const [selectedScene, setSelectedScene] = useState<CharacterScene | null>(null);
  const [isLoadingScenes, setIsLoadingScenes] = useState(false);

  if (!character) {
    return null;
  }

  const imageUrl = character.image_url || character.preview_image_url;
  const hasImage = !!imageUrl;

  // Sign image URL if it's a private storage path
  useEffect(() => {
    const signImageUrl = async () => {
      if (!imageUrl) {
        setSignedImageUrl('');
        return;
      }

      // Check if URL needs signing (user-library or workspace-temp paths)
      if (imageUrl.includes('user-library/') || imageUrl.includes('workspace-temp/')) {
        try {
          const bucket = imageUrl.includes('user-library/') ? 'user-library' : 'workspace-temp';
          const signed = await urlSigningService.getSignedUrl(imageUrl, bucket);
          setSignedImageUrl(signed);
        } catch (error) {
          console.error('Failed to sign image URL:', error);
          setSignedImageUrl(imageUrl); // Fallback to original
        }
      } else {
        setSignedImageUrl(imageUrl); // Use as-is for public URLs
      }
    };

    signImageUrl();
  }, [imageUrl]);

  // Load character scenes when character changes
  useEffect(() => {
    const loadCharacterScenes = async () => {
      if (!character?.id) {
        setCharacterScenes([]);
        setSelectedScene(null);
        return;
      }

      setIsLoadingScenes(true);
      try {
        const { data: scenes, error } = await supabase
          .from('character_scenes')
          .select('*')
          .eq('character_id', character.id)
          .order('priority', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error loading character scenes:', error);
          setCharacterScenes([]);
        } else {
          setCharacterScenes(scenes || []);
          // Auto-select scene if selectedSceneId matches
          if (selectedSceneId && scenes) {
            const matched = scenes.find(s => s.id === selectedSceneId);
            if (matched) {
              setSelectedScene(matched);
            }
          } else if (scenes && scenes.length > 0 && !selectedScene) {
            // Auto-select first scene if available
            setSelectedScene(scenes[0]);
          }
        }
      } catch (error) {
        console.error('Error loading character scenes:', error);
        setCharacterScenes([]);
      } finally {
        setIsLoadingScenes(false);
      }
    };

    if (isOpen) {
      loadCharacterScenes();
    }
  }, [character?.id, isOpen, selectedSceneId]);

  const handleSceneSelect = (scene: CharacterScene) => {
    setSelectedScene(scene);
    if (onSceneSelect) {
      onSceneSelect(scene);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className={`
          w-[90vw] sm:w-[400px] 
          flex flex-col
          bg-card border-border p-0
          ${isMobile ? 'rounded-none' : ''}
        `}
      >
        {/* Header - Fixed */}
        <SheetHeader className="p-4 pb-2 flex-shrink-0 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold text-white line-clamp-1">
              {character.name}
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Character Image Section */}
          <div className="mb-4">
            <div className={`
              relative rounded-lg overflow-hidden bg-gradient-to-br from-gray-700 to-gray-900
              ${hasImage ? 'aspect-square' : 'aspect-[4/3]'}
            `}>
              {hasImage ? (
                <img 
                  src={signedImageUrl || imageUrl} 
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
            </div>
          </div>

          {/* Character Info Section */}
          <div className="space-y-4">
            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">About {character.name}</h3>
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

            {/* Character Scenes Section */}
            {characterScenes.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  Scenes ({characterScenes.length})
                </h4>
                <div className="space-y-2">
                  {characterScenes.map(scene => (
                    <div 
                      key={scene.id}
                      onClick={() => handleSceneSelect(scene)}
                      className={`
                        text-xs text-gray-300 p-3 rounded border cursor-pointer transition-colors
                        ${selectedScene?.id === scene.id 
                          ? 'bg-blue-600/20 border-blue-500/50 text-blue-200' 
                          : 'border-gray-600 hover:bg-gray-800/50 hover:border-gray-500'
                        }
                      `}
                    >
                      {/* Scene Name and Description */}
                      <div className="mb-2">
                        <div className="font-medium text-gray-200">
                          {scene.scene_name || 'Unnamed Scene'}
                        </div>
                        {scene.scene_description && (
                          <div className="text-gray-400 mt-1 line-clamp-2">
                            {scene.scene_description}
                          </div>
                        )}
                      </div>
                      
                      {/* Scene Prompt */}
                      <div className="line-clamp-2 leading-tight">
                        {scene.scene_prompt}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading Scenes Indicator */}
            {isLoadingScenes && (
              <div className="text-xs text-gray-400 flex items-center gap-2">
                <div className="w-3 h-3 border border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                Loading scenes...
              </div>
            )}

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
        </div>
      </SheetContent>
    </Sheet>
  );
};

