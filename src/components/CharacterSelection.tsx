import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Edit, Trash2, User } from "lucide-react";
import { toast } from "sonner";

interface Character {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  createdAt: Date;
}

interface CharacterSelectionProps {
  selectedCharacter: Character | null;
  onCharacterSelect: (character: Character | null) => void;
  onCharacterCreate: (character: Omit<Character, 'id' | 'createdAt'>) => void;
}

export const CharacterSelection = ({
  selectedCharacter,
  onCharacterSelect,
  onCharacterCreate,
}: CharacterSelectionProps) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCharacter, setNewCharacter] = useState({
    name: "",
    description: "",
    imageUrl: "",
  });

  const handleCreateCharacter = async () => {
    if (!newCharacter.name.trim() || !newCharacter.description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreating(true);
    try {
      const character = {
        ...newCharacter,
        name: newCharacter.name.trim(),
        description: newCharacter.description.trim(),
      };
      
      onCharacterCreate(character);
      
      // Reset form
      setNewCharacter({ name: "", description: "", imageUrl: "" });
      toast.success("Character created successfully!");
      
    } catch (error) {
      console.error("Error creating character:", error);
      toast.error("Failed to create character");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectCharacter = (character: Character) => {
    onCharacterSelect(character);
    toast.success(`Selected character: ${character.name}`);
  };

  const clearSelection = () => {
    onCharacterSelect(null);
    toast.success("Character selection cleared");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Character Selection
          {selectedCharacter && (
            <Badge variant="secondary">
              {selectedCharacter.name}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Character Display */}
        {selectedCharacter && (
          <div className="p-3 border rounded-lg bg-blue-50">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedCharacter.imageUrl} />
                <AvatarFallback>
                  {selectedCharacter.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-blue-900">{selectedCharacter.name}</p>
                <p className="text-sm text-blue-700 line-clamp-1">
                  {selectedCharacter.description}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Character Creation Form */}
        <div className="space-y-3">
          <h4 className="font-medium">Create New Character</h4>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label htmlFor="character-name">Name</Label>
              <Input
                id="character-name"
                value={newCharacter.name}
                onChange={(e) => setNewCharacter(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
                placeholder="Character name"
                disabled={isCreating}
              />
            </div>
            <div>
              <Label htmlFor="character-description">Description</Label>
              <Input
                id="character-description"
                value={newCharacter.description}
                onChange={(e) => setNewCharacter(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                placeholder="Character description"
                disabled={isCreating}
              />
            </div>
            <div>
              <Label htmlFor="character-image">Image URL (optional)</Label>
              <Input
                id="character-image"
                value={newCharacter.imageUrl}
                onChange={(e) => setNewCharacter(prev => ({
                  ...prev,
                  imageUrl: e.target.value
                }))}
                placeholder="https://..."
                disabled={isCreating}
              />
            </div>
          </div>
          <Button
            onClick={handleCreateCharacter}
            disabled={isCreating || !newCharacter.name.trim() || !newCharacter.description.trim()}
            className="w-full"
          >
            {isCreating ? (
              <>
                <LoadingSpinner className="mr-2" size="sm" />
                Creating Character...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Character
              </>
            )}
          </Button>
        </div>

        {/* Existing Characters List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : characters.length > 0 ? (
          <div className="space-y-2">
            <h4 className="font-medium">Existing Characters</h4>
            <div className="grid gap-2 max-h-40 overflow-y-auto">
              {characters.map((character) => (
                <div
                  key={character.id}
                  className={`p-2 border rounded cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedCharacter?.id === character.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => handleSelectCharacter(character)}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={character.imageUrl} />
                      <AvatarFallback>
                        {character.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{character.name}</p>
                      <p className="text-xs text-gray-600 line-clamp-1">
                        {character.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            No characters created yet
          </p>
        )}
      </CardContent>
    </Card>
  );
};
