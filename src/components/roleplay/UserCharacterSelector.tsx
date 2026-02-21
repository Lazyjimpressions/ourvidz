import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserCharacters, UserCharacter } from '@/hooks/useUserCharacters';
import { Plus, User, Settings, X, Shirt } from 'lucide-react';
import { UserCharacterSetup } from './ARCHIVED/UserCharacterSetup';

interface UserCharacterSelectorProps {
  selectedCharacterId?: string;
  onCharacterSelect: (characterId: string | null) => void;
  aiCharacterName?: string;
}

export const UserCharacterSelector = ({ 
  selectedCharacterId, 
  onCharacterSelect,
  aiCharacterName 
}: UserCharacterSelectorProps) => {
  const { characters, isLoading, error, updateUserCharacter } = useUserCharacters();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingClothingId, setEditingClothingId] = useState<string | null>(null);
  const [newClothingTag, setNewClothingTag] = useState('');
  
  const selectedCharacter = characters.find(char => char.id === selectedCharacterId);

  const handleCharacterCreated = (userCharacterId: string, contentMode: 'sfw' | 'nsfw') => {
    setShowCreateModal(false);
    onCharacterSelect(userCharacterId);
    // Reload characters will happen automatically via the hook
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-700 rounded-full animate-pulse" />
          <div className="flex-1">
            <div className="w-20 h-4 bg-gray-700 rounded animate-pulse" />
            <div className="w-16 h-3 bg-gray-700 rounded animate-pulse mt-1" />
          </div>
        </div>
        <div className="w-full h-8 bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selectedCharacter ? (
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={selectedCharacter.image_url} alt={selectedCharacter.name} />
            <AvatarFallback>{selectedCharacter.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm text-white font-medium">{selectedCharacter.name}</p>
            <p className="text-xs text-gray-400">
              {selectedCharacter.appearance_tags?.slice(0, 2).join(', ') || 'Custom character'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm text-white">Anonymous User</p>
            <p className="text-xs text-gray-400">Default persona</p>
          </div>
        </div>
      )}
      
      <div className="flex gap-2">
        <Select value={selectedCharacterId || "anonymous"} onValueChange={(value) => onCharacterSelect(value === "anonymous" ? null : value)}>
          <SelectTrigger className="flex-1 bg-gray-800 border-gray-700">
            <SelectValue placeholder="Select character" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="anonymous">Anonymous User</SelectItem>
            {characters.map((character) => (
              <SelectItem key={character.id} value={character.id}>
                {character.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowCreateModal(true)}
          className="px-2"
        >
          <Plus className="w-3 h-3" />
        </Button>
        
        {characters.length > 0 && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowManageModal(true)}
            className="px-2"
          >
            <Settings className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Character stats */}
      {selectedCharacter && (
        <div className="text-xs text-gray-400 space-y-1">
          <div className="flex justify-between">
            <span>Created:</span>
            <span>{new Date(selectedCharacter.created_at).toLocaleDateString()}</span>
          </div>
          {selectedCharacter.appearance_tags && selectedCharacter.appearance_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedCharacter.appearance_tags.slice(0, 3).map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Character Modal */}
      <UserCharacterSetup
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSetupComplete={handleCharacterCreated}
        aiCharacterName={aiCharacterName}
      />

      {/* Manage Characters Modal */}
      <Dialog open={showManageModal} onOpenChange={setShowManageModal}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Your Characters</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[28rem]">
            <div className="space-y-3">
              {characters.map((character) => (
                <Card key={character.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={character.image_url} alt={character.name} />
                        <AvatarFallback>{character.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{character.name}</p>
                        <p className="text-xs text-gray-400 truncate">{character.description}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingClothingId(editingClothingId === character.id ? null : character.id)}
                          className="px-2"
                          title="Edit clothing tags"
                        >
                          <Shirt className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            onCharacterSelect(character.id);
                            setShowManageModal(false);
                          }}
                          className="text-xs"
                        >
                          Select
                        </Button>
                      </div>
                    </div>

                    {/* Clothing Tags Editor */}
                    {editingClothingId === character.id && (
                      <div className="space-y-2 pt-2 border-t border-gray-700">
                        <Label className="text-xs text-gray-400 flex items-center gap-1">
                          <Shirt className="w-3 h-3" /> Default Outfit
                        </Label>
                        <div className="flex flex-wrap gap-1">
                          {(character.clothing_tags || []).map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="gap-1 text-xs">
                              {tag}
                              <button
                                onClick={async () => {
                                  const updated = (character.clothing_tags || []).filter((_, i) => i !== idx);
                                  await updateUserCharacter(character.id, { clothing_tags: updated } as any);
                                }}
                                className="ml-0.5 hover:text-destructive"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <Input
                            value={newClothingTag}
                            onChange={(e) => setNewClothingTag(e.target.value)}
                            placeholder="e.g. sundress, sneakers"
                            className="flex-1 h-7 text-xs"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const tag = newClothingTag.trim();
                                if (tag) {
                                  const updated = [...(character.clothing_tags || []), tag];
                                  updateUserCharacter(character.id, { clothing_tags: updated } as any);
                                  setNewClothingTag('');
                                }
                              }
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2"
                            disabled={!newClothingTag.trim()}
                            onClick={() => {
                              const tag = newClothingTag.trim();
                              if (tag) {
                                const updated = [...(character.clothing_tags || []), tag];
                                updateUserCharacter(character.id, { clothing_tags: updated } as any);
                                setNewClothingTag('');
                              }
                            }}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-[10px] text-gray-500">Default outfit when no scene override applies</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};