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

  if (!isOpen) return null;

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
      "w-64 h-full bg-white border-l border-gray-200 flex flex-col",
      className
    )}>
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium text-gray-900 text-sm">Character Details</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>

        {/* Character Preview */}
        {character && (
          <div className="flex items-center gap-2">
            <img
              src={character.reference_image_url || character.image_url || `https://api.dicebear.com/7.x/personas/svg?seed=${character.name}`}
              alt={character.name}
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate text-sm">{character.name}</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-2.5 h-2.5" />
                  {character.interaction_count}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-2.5 h-2.5" />
                  {character.likes_count}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => likeCharacter(character.id)}
              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
            >
              <Heart className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-3 py-1 border-b border-gray-200">
        <div className="flex space-x-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "h-6 text-xs px-2 rounded-sm",
                  activeTab === tab.id ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"
                )}
              >
                <Icon className="w-2.5 h-2.5 mr-1" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {activeTab === 'details' && character && (
            <div className="space-y-4">
              {/* Description */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Description</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {character.description}
                </p>
              </div>

              {/* Personality */}
              {character.persona && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Personality</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {character.persona}
                  </p>
                </div>
              )}

              {/* Traits */}
              {character.traits && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Traits</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {character.traits}
                  </p>
                </div>
              )}

              {/* Tags */}
              {character.appearance_tags && character.appearance_tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1">
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
                  <h4 className="text-sm font-medium text-foreground mb-2">Voice Tone</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {character.voice_tone}
                  </p>
                </div>
              )}

              {/* Mood */}
              {character.mood && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Mood</h4>
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
                <h4 className="text-sm font-medium text-foreground">Character Scenes</h4>
                <Button size="sm" variant="outline" className="h-8 text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
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
              <h4 className="text-sm font-medium text-foreground">Voice Settings</h4>
              <div className="space-y-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Default Voice</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <Play className="w-3 h-3 mr-1" />
                      Preview
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Natural, conversational tone
                  </p>
                </div>
                
                <Button variant="outline" className="w-full h-8 text-xs">
                  <Volume2 className="w-3 h-3 mr-1" />
                  Customize Voice
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Chat History</h4>
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

      {/* Footer Actions */}
      <div className="p-3 border-t border-gray-200 space-y-1.5">
        <Button className="w-full h-7 text-xs bg-blue-500 hover:bg-blue-600 text-white">
          <MessageSquare className="w-3 h-3 mr-1" />
          Start Conversation
        </Button>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="flex-1 h-6 text-xs border-gray-200 text-gray-600 hover:text-gray-900">
            <Palette className="w-2.5 h-2.5 mr-1" />
            Customize
          </Button>
          <Button variant="outline" size="sm" className="flex-1 h-6 text-xs border-gray-200 text-gray-600 hover:text-gray-900">
            <Sparkles className="w-2.5 h-2.5 mr-1" />
            Persona
          </Button>
        </div>
      </div>
    </div>
  );
};