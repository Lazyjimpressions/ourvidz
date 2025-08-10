import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  Heart, 
  MessageSquare, 
  Volume2, 
  History, 
  Palette, 
  User, 
  Sparkles,
  Image as ImageIcon,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCharacterData } from '@/hooks/useCharacterData';
import { useCharacterScenes } from '@/hooks/useCharacterScenes';
import { SceneCard } from './SceneCard';

interface CharacterDetailPaneProps {
  characterId: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const CharacterDetailPane: React.FC<CharacterDetailPaneProps> = ({
  characterId,
  isOpen,
  onClose,
  className
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'scenes' | 'voice' | 'history'>('details');
  const { character, isLoading, likeCharacter } = useCharacterData(characterId);
  const { scenes, isLoading: scenesLoading } = useCharacterScenes(characterId);

  // Don't return null - let the parent handle conditional rendering

  const tabs = [
    { id: 'details', label: 'Details', icon: User },
    { id: 'scenes', label: 'Scenes', icon: ImageIcon },
    { id: 'voice', label: 'Voice', icon: Volume2 },
    { id: 'history', label: 'History', icon: History },
  ] as const;

  const handleSceneClick = (sceneId: string) => {
    console.log('Scene clicked:', sceneId);
    // Handle scene selection/generation
  };

  return (
    <div className={cn(
      "w-80 h-full bg-white border-l border-gray-200 flex flex-col",
      !isOpen && "hidden",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Character</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Character Preview */}
        {character && (
          <div className="flex items-start gap-3">
            <img
              src={character.reference_image_url || character.image_url || `https://api.dicebear.com/7.x/personas/svg?seed=${character.name}`}
              alt={character.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{character.name}</h3>
              <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {character.interaction_count}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {character.likes_count}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 border-b border-gray-200 flex-shrink-0">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "h-8 text-sm px-3 rounded-lg",
                  activeTab === tab.id ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"
                )}
              >
                <Icon className="w-3 h-3 mr-2" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Content - Properly constrained scrollable area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            {activeTab === 'details' && character && (
              <div className="space-y-6">
                {/* Description */}
                <div>
                  <h4 className="font-medium text-foreground mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {character.description}
                  </p>
                </div>

                {/* Personality */}
                {character.persona && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Personality</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {character.persona}
                    </p>
                  </div>
                )}

                {/* Traits */}
                {character.traits && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Traits</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {character.traits}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {character.appearance_tags && character.appearance_tags.length > 0 && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {character.appearance_tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Voice Tone */}
                {character.voice_tone && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Voice Tone</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {character.voice_tone}
                    </p>
                  </div>
                )}

                {/* Mood */}
                {character.mood && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Mood</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {character.mood}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'scenes' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground">Scenes</h4>
                  <Button size="sm" variant="outline" className="h-8">
                    <Sparkles className="w-3 h-3 mr-2" />
                    Generate
                  </Button>
                </div>

                {scenesLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-muted rounded-lg aspect-[4/3] animate-pulse" />
                    ))}
                  </div>
                ) : scenes.length > 0 ? (
                  <div className="space-y-3">
                    {scenes.map((scene) => (
                      <div key={scene.id} className="w-full">
                        <SceneCard
                          id={scene.id}
                          title={scene.scene_prompt || 'Untitled Scene'}
                          characterNames={[character?.name || 'Character']}
                          backgroundImage={scene.image_url}
                          gradient="bg-gradient-to-br from-primary/20 to-primary/10"
                          onClick={() => handleSceneClick(scene.id)}
                          className="w-full"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No scenes yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Generate scenes for this character
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'voice' && (
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Voice Settings</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Default Voice</span>
                      <Button size="sm" variant="outline" className="h-7">
                        <Play className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Natural, conversational tone
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Chat History</h4>
                <div className="text-center py-8">
                  <History className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No chat history</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start a conversation to see history
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};