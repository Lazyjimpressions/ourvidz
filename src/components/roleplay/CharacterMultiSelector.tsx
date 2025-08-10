import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Users, User, Bot, BookOpen } from 'lucide-react';
import { usePublicCharacters } from '@/hooks/usePublicCharacters';

interface CharacterParticipant {
  id: string;
  name: string;
  role: 'ai' | 'user' | 'narrator';
  image_url?: string;
  reference_image_url?: string;
  description?: string;
}

interface CharacterMultiSelectorProps {
  primaryCharacterId?: string;
  selectedCharacters: CharacterParticipant[];
  onCharactersChange: (characters: CharacterParticipant[]) => void;
  maxCharacters?: number;
  className?: string;
}

export const CharacterMultiSelector: React.FC<CharacterMultiSelectorProps> = ({
  primaryCharacterId,
  selectedCharacters,
  onCharactersChange,
  maxCharacters = 3,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { characters, isLoading } = usePublicCharacters();

  const availableCharacters = characters.filter(char => 
    !selectedCharacters.find(selected => selected.id === char.id) &&
    char.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addCharacter = (character: any) => {
    if (selectedCharacters.length >= maxCharacters) return;

    const newParticipant: CharacterParticipant = {
      id: character.id,
      name: character.name,
      role: character.role === 'user' ? 'user' : 'ai',
      image_url: character.image_url,
      reference_image_url: character.reference_image_url,
      description: character.description
    };

    onCharactersChange([...selectedCharacters, newParticipant]);
  };

  const removeCharacter = (characterId: string) => {
    onCharactersChange(selectedCharacters.filter(char => char.id !== characterId));
  };

  const updateCharacterRole = (characterId: string, role: 'ai' | 'user' | 'narrator') => {
    onCharactersChange(
      selectedCharacters.map(char =>
        char.id === characterId ? { ...char, role } : char
      )
    );
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'user': return <User className="w-3 h-3" />;
      case 'narrator': return <BookOpen className="w-3 h-3" />;
      default: return <Bot className="w-3 h-3" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'user': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'narrator': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  return (
    <div className={className}>
      {/* Selected Characters */}
      {selectedCharacters.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Scene Participants ({selectedCharacters.length}/{maxCharacters})
          </h4>
          <div className="space-y-2">
            {selectedCharacters.map((character) => (
              <div
                key={character.id}
                className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={character.reference_image_url || character.image_url} 
                    alt={character.name}
                  />
                  <AvatarFallback className="text-xs">
                    {character.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {character.name}
                  </p>
                  {character.id === primaryCharacterId && (
                    <Badge variant="outline" className="text-xs mt-0.5">
                      Primary
                    </Badge>
                  )}
                </div>

                <Select
                  value={character.role}
                  onValueChange={(role) => updateCharacterRole(character.id, role as any)}
                >
                  <SelectTrigger className="w-24 h-7 text-xs">
                    <div className="flex items-center gap-1">
                      {getRoleIcon(character.role)}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ai">
                      <div className="flex items-center gap-1">
                        <Bot className="w-3 h-3" />
                        AI
                      </div>
                    </SelectItem>
                    <SelectItem value="user">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        User
                      </div>
                    </SelectItem>
                    <SelectItem value="narrator">
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        Narrator
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {character.id !== primaryCharacterId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCharacter(character.id)}
                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Characters */}
      {selectedCharacters.length < maxCharacters && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Add Characters
          </h4>
          
          <input
            type="text"
            placeholder="Search characters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-2"
          />

          <ScrollArea className="h-32">
            <div className="space-y-1">
              {isLoading ? (
                <div className="text-center py-4 text-sm text-gray-500">
                  Loading characters...
                </div>
              ) : availableCharacters.length > 0 ? (
                availableCharacters.slice(0, 10).map((character) => (
                  <div
                    key={character.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                    onClick={() => addCharacter(character)}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage 
                        src={character.reference_image_url || character.image_url} 
                        alt={character.name}
                      />
                      <AvatarFallback className="text-xs">
                        {character.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {character.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {character.description?.slice(0, 50)}...
                      </p>
                    </div>
                    <Badge className={`text-xs ${getRoleColor(character.role || 'ai')}`}>
                      {character.role || 'AI'}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-sm text-gray-500">
                  No characters found
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};