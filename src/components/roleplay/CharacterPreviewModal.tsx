import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MessageSquare, 
  Image as ImageIcon, 
  User, 
  Heart, 
  Play,
  Users,
  Sparkles
} from 'lucide-react';
import { useCharacterScenes } from '@/hooks/useCharacterScenes';
import { useUserCharacters } from '@/hooks/useUserCharacters';

interface Character {
  id: string;
  name: string;
  description: string;
  persona?: string;
  traits?: string;
  mood?: string;
  voice_tone?: string;
  image_url?: string;
  reference_image_url?: string;
  likes_count?: number;
  interaction_count?: number;
}

interface Scene {
  id: string;
  scene_prompt: string;
  image_url?: string;
  generation_metadata?: any;
}

interface CharacterPreviewModalProps {
  character: Character | null;
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (userCharacterId?: string) => void;
  onSelectScene: (sceneId: string, userCharacterId?: string) => void;
}

export const CharacterPreviewModal: React.FC<CharacterPreviewModalProps> = ({
  character,
  isOpen,
  onClose,
  onStartChat,
  onSelectScene
}) => {
  const [selectedUserCharacter, setSelectedUserCharacter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'scenes'>('overview');
  
  const { scenes, isLoading: scenesLoading } = useCharacterScenes(character?.id);
  const { characters: userCharacters, isLoading: userCharactersLoading } = useUserCharacters();

  if (!character) return null;

  const handleStartChat = () => {
    onStartChat(selectedUserCharacter || undefined);
  };

  const handleSceneSelect = (sceneId: string) => {
    onSelectScene(sceneId, selectedUserCharacter || undefined);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}m`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  const traits = character.traits ? character.traits.split(',').map(t => t.trim()) : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage 
                src={character.reference_image_url || character.image_url} 
                alt={character.name} 
              />
              <AvatarFallback>{character.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">{character.name}</h2>
              <p className="text-sm text-muted-foreground">
                {formatCount(character.interaction_count || 0)} interactions
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="scenes" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Scenes ({scenes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Character Image */}
            <div className="relative">
              <img
                src={character.reference_image_url || character.image_url}
                alt={character.name}
                className="w-full h-48 object-cover rounded-lg"
              />
              <div className="absolute top-2 right-2">
                <Button size="sm" variant="ghost" className="bg-black/20 text-white hover:bg-black/40">
                  <Heart className="w-4 h-4" />
                  {formatCount(character.likes_count || 0)}
                </Button>
              </div>
            </div>

            {/* Character Description */}
            <div className="space-y-3">
              <h3 className="font-medium">About {character.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {character.description}
              </p>
              
              {character.persona && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Personality</h4>
                  <p className="text-sm text-muted-foreground">{character.persona}</p>
                </div>
              )}

              {character.mood && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Current Mood</h4>
                  <Badge variant="secondary">{character.mood}</Badge>
                </div>
              )}

              {traits.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Traits</h4>
                  <div className="flex flex-wrap gap-1">
                    {traits.slice(0, 5).map((trait, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {trait}
                      </Badge>
                    ))}
                    {traits.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{traits.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Character Selection */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Your Character
              </h3>
              <Select value={selectedUserCharacter} onValueChange={setSelectedUserCharacter}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your character (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anonymous">Anonymous User</SelectItem>
                  {userCharacters.map((userChar) => (
                    <SelectItem key={userChar.id} value={userChar.id}>
                      {userChar.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select your character to personalize the roleplay experience
              </p>
            </div>
          </TabsContent>

          <TabsContent value="scenes" className="space-y-4">
            {scenesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading scenes...</p>
              </div>
            ) : scenes.length > 0 ? (
              <div className="grid gap-3">
                {scenes.map((scene) => (
                  <Card key={scene.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {scene.image_url && (
                          <img
                            src={scene.image_url}
                            alt={scene.scene_prompt}
                            className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm mb-1 line-clamp-2">
                            {scene.scene_prompt}
                          </h4>
                          <p className="text-xs text-muted-foreground mb-2">
                            Scene with {character.name}
                          </p>
                          <Button
                            size="sm"
                            onClick={() => handleSceneSelect(scene.id)}
                            className="w-full"
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Start Scene
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No scenes available yet</p>
                <p className="text-xs">Scenes will appear here as they're created</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleStartChat}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Start Chat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
