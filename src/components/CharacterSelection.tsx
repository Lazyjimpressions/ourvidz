
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Plus, Users } from "lucide-react";
import { Character } from "./CharacterManager";

interface CharacterSelectionProps {
  onCharactersSelected: (characters: Character[]) => void;
  onSkipCharacters: () => void;
}

// Mock existing characters - in real app, these would come from a database
const existingCharacters: Character[] = [
  {
    id: "1",
    name: "Alex",
    traits: "Adventurous explorer, curious and brave",
    appearanceTags: "brown hair, blue eyes, casual clothing",
  },
  {
    id: "2", 
    name: "Maya",
    traits: "Wise mentor, calm and thoughtful",
    appearanceTags: "silver hair, green eyes, elegant robes",
  },
  {
    id: "3",
    name: "Zoe",
    traits: "Energetic inventor, creative and enthusiastic", 
    appearanceTags: "red hair, goggles, lab coat",
  }
];

export const CharacterSelection = ({ onCharactersSelected, onSkipCharacters }: CharacterSelectionProps) => {
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>([]);

  const toggleCharacter = (character: Character) => {
    setSelectedCharacters(prev => {
      const isSelected = prev.find(c => c.id === character.id);
      if (isSelected) {
        return prev.filter(c => c.id !== character.id);
      } else {
        return [...prev, character];
      }
    });
  };

  const handleContinue = () => {
    onCharactersSelected(selectedCharacters);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Character Setup (Optional)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center space-y-4">
          <p className="text-gray-600">
            Choose existing characters for your story, or skip to create without specific characters.
          </p>
          
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onSkipCharacters}>
              Skip Characters
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open('/characters', '_blank')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Character
            </Button>
          </div>
        </div>

        {existingCharacters.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <Label>Your Characters</Label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {existingCharacters.map((character) => (
                <button
                  key={character.id}
                  onClick={() => toggleCharacter(character)}
                  className={`p-3 border rounded-lg text-left transition-all hover:bg-gray-50 ${
                    selectedCharacters.find(c => c.id === character.id)
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{character.name}</span>
                  </div>
                  {character.traits && (
                    <p className="text-sm text-gray-600 mb-1">{character.traits}</p>
                  )}
                  {character.appearanceTags && (
                    <p className="text-xs text-gray-500">{character.appearanceTags}</p>
                  )}
                </button>
              ))}
            </div>

            {selectedCharacters.length > 0 && (
              <Button onClick={handleContinue} className="w-full">
                Continue with {selectedCharacters.length} Character{selectedCharacters.length > 1 ? 's' : ''}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
