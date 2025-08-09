import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  User, 
  Users, 
  MessageSquare, 
  Image, 
  ChevronDown, 
  Plus,
  Settings,
  History,
  Palette,
  Trash2,
  Eye
} from 'lucide-react';
import { useCharacterData } from '@/hooks/useCharacterData';
import { useCharacterScenes } from '@/hooks/useCharacterScenes';
import { CharacterSelector } from '@/components/roleplay/CharacterSelector';
import { UserCharacterSelector } from '@/components/roleplay/UserCharacterSelector';
import { ConversationManager } from '@/components/roleplay/ConversationManager';
import { SceneGenerationModal } from '@/components/roleplay/SceneGenerationModal';

interface RoleplaySidebarProps {
  characterId?: string;
  userCharacterId?: string;
  activeConversationId?: string;
  onCharacterChange?: (characterId: string) => void;
  onUserCharacterChange?: (userCharacterId: string | null) => void;
  onConversationSelect?: (conversationId: string) => void;
  onNewConversation?: () => void;
  onGenerateScene?: () => void;
  className?: string;
}

export const RoleplaySidebar = ({ 
  characterId,
  userCharacterId,
  activeConversationId,
  onCharacterChange,
  onUserCharacterChange,
  onConversationSelect,
  onNewConversation,
  onGenerateScene,
  className = ""
}: RoleplaySidebarProps) => {
  const [expandedSections, setExpandedSections] = useState({
    character: true,
    userCharacter: true,
    scenes: true,
    conversations: true
  });
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  const [showSceneModal, setShowSceneModal] = useState(false);

  const { character } = useCharacterData(characterId);
  const { scenes, isLoading: scenesLoading } = useCharacterScenes(characterId);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className={`w-80 bg-gray-900 border-r border-gray-800 flex flex-col h-screen ${className}`}>
      <ScrollArea className="flex-1 p-4 h-0">
        <div className="space-y-4">
          {/* Current AI Character Section */}
          <Collapsible 
            open={expandedSections.character}
            onOpenChange={() => toggleSection('character')}
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">AI Character</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.character ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  {character ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage 
                            src={character.reference_image_url || character.image_url} 
                            alt={character.name}
                          />
                          <AvatarFallback>{character.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white truncate">{character.name}</h3>
                          <p className="text-xs text-gray-400">{character.mood || 'Friendly'}</p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-300 line-clamp-3">
                        {character.description}
                      </p>
                      
                      {character.traits && (
                        <div className="flex flex-wrap gap-1">
                          {character.traits.split(',').slice(0, 3).map((trait, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {trait.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setShowCharacterSelector(true)}
                      >
                        Switch Character
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-400 text-sm mb-2">No character selected</p>
                      <Button size="sm" onClick={() => setShowCharacterSelector(true)}>
                        Choose Character
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* User Character Section */}
          <Collapsible 
            open={expandedSections.userCharacter}
            onOpenChange={() => toggleSection('userCharacter')}
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">Your Character</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.userCharacter ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <UserCharacterSelector
                    selectedCharacterId={userCharacterId}
                    onCharacterSelect={onUserCharacterChange || (() => {})}
                    aiCharacterName={character?.name}
                  />
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Scene Management Section */}
          <Collapsible 
            open={expandedSections.scenes}
            onOpenChange={() => toggleSection('scenes')}
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  <span className="font-medium">Scenes</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.scenes ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => setShowSceneModal(true)}
                    >
                      <Palette className="w-3 h-3 mr-1" />
                      Generate Scene
                    </Button>
                    
                    {scenesLoading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="w-full h-16 bg-gray-700 rounded animate-pulse" />
                        ))}
                      </div>
                    ) : scenes.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {scenes.slice(0, 4).map((scene) => (
                          <div 
                            key={scene.id}
                            className="relative group cursor-pointer rounded overflow-hidden"
                            title={scene.scene_prompt}
                          >
                            <img 
                              src={scene.image_url} 
                              alt="Scene"
                              className="w-full h-16 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white">
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-2">
                        No scenes generated yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Conversation History Section */}
          <Collapsible 
            open={expandedSections.conversations}
            onOpenChange={() => toggleSection('conversations')}
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="font-medium">Conversations</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.conversations ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <ConversationManager
                    characterId={characterId}
                    activeConversationId={activeConversationId}
                    onConversationSelect={onConversationSelect || (() => {})}
                    onNewConversation={onNewConversation || (() => {})}
                  />
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Quick Actions Footer */}
      <div className="p-4 border-t border-gray-800">
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Settings className="w-4 h-4 mr-2" />
          Roleplay Settings
        </Button>
      </div>

      {/* Character Selector Modal */}
      <CharacterSelector
        isOpen={showCharacterSelector}
        onClose={() => setShowCharacterSelector(false)}
        onCharacterSelect={onCharacterChange || (() => {})}
        currentCharacterId={characterId}
      />

      {/* Scene Generation Modal */}
      <SceneGenerationModal
        isOpen={showSceneModal}
        onClose={() => setShowSceneModal(false)}
        characterId={characterId}
        conversationId={activeConversationId}
        character={character}
      />
    </div>
  );
};