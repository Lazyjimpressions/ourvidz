import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Users, Star, MessageSquare, Heart } from 'lucide-react';
import { usePublicCharacters } from '@/hooks/usePublicCharacters';

interface CharacterSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onCharacterSelect: (characterId: string) => void;
  currentCharacterId?: string;
}

export const CharacterSelector = ({ 
  isOpen, 
  onClose, 
  onCharacterSelect,
  currentCharacterId 
}: CharacterSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { characters, isLoading, likeCharacter } = usePublicCharacters();

  const filteredCharacters = characters.filter(char => {
    const matchesSearch = char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         char.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedFilter === 'all') return matchesSearch;
    if (selectedFilter === 'official') return matchesSearch && !char.user_id;
    if (selectedFilter === 'community') return matchesSearch && char.user_id;
    
    return matchesSearch;
  });

  const handleSelectCharacter = (characterId: string) => {
    onCharacterSelect(characterId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">Select Character</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search characters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={selectedFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('all')}
              >
                All
              </Button>
              <Button
                variant={selectedFilter === 'official' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('official')}
              >
                <Star className="w-3 h-3 mr-1" />
                Official
              </Button>
              <Button
                variant={selectedFilter === 'community' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('community')}
              >
                <Users className="w-3 h-3 mr-1" />
                Community
              </Button>
            </div>
          </div>

          {/* Character Grid */}
          <ScrollArea className="h-96">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-700 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-700 rounded w-3/4" />
                        <div className="h-3 bg-gray-700 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCharacters.map((character) => (
                  <div
                    key={character.id}
                    className={`bg-gray-800 rounded-lg p-4 border transition-colors cursor-pointer ${
                      character.id === currentCharacterId 
                        ? 'border-purple-500 bg-purple-900/20' 
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                    onClick={() => handleSelectCharacter(character.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage 
                          src={character.reference_image_url || character.image_url} 
                          alt={character.name}
                        />
                        <AvatarFallback>{character.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-white truncate">{character.name}</h3>
                          {!character.user_id && (
                            <Badge variant="secondary" className="text-xs">Official</Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-400 line-clamp-2 mb-2">
                          {character.description}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
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
                  </div>
                ))}
              </div>
            )}

            {!isLoading && filteredCharacters.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400">No characters found matching your search.</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};