
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Plus, User } from "lucide-react";
import { type Character } from "@/lib/database";

interface CharacterManagerProps {
  onCharactersSelected: (characters: Character[]) => void;
  existingCharacters: Character[];
}

export const CharacterManager = ({ onCharactersSelected, existingCharacters }: CharacterManagerProps) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCharacter, setNewCharacter] = useState({
    name: "",
    description: "",
    traits: "",
    appearance_tags: "",
    image_url: ""
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setNewCharacter(prev => ({ ...prev, image_url: imageUrl }));
    }
  };

  const handleCreateCharacter = () => {
    if (newCharacter.name.trim() && newCharacter.description.trim()) {
      const character: Character = {
        id: Date.now().toString(),
        user_id: "temp-user-id", // This would be populated from auth
        name: newCharacter.name,
        description: newCharacter.description,
        traits: newCharacter.traits || null,
        appearance_tags: newCharacter.appearance_tags ? [newCharacter.appearance_tags] : null,
        image_url: newCharacter.image_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setCharacters(prev => [...prev, character]);
      setNewCharacter({ name: "", description: "", traits: "", appearance_tags: "", image_url: "" });
      setShowCreateForm(false);
    }
  };

  const handleContinue = () => {
    onCharactersSelected(characters);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Character Setup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {characters.length > 0 && (
          <div className="space-y-2">
            <Label>Your Characters</Label>
            <div className="grid grid-cols-2 gap-3">
              {characters.map((character) => (
                <div key={character.id} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{character.name}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{character.description}</p>
                  {character.traits && (
                    <p className="text-sm text-gray-600 mb-1">{character.traits}</p>
                  )}
                  {character.appearance_tags && (
                    <p className="text-xs text-gray-500">{character.appearance_tags.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {showCreateForm ? (
          <div className="space-y-4 border rounded-lg p-4">
            <div className="space-y-2">
              <Label htmlFor="character-name">Character Name</Label>
              <Input
                id="character-name"
                value={newCharacter.name}
                onChange={(e) => setNewCharacter(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter character name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="character-description">Character Description</Label>
              <Textarea
                id="character-description"
                value={newCharacter.description}
                onChange={(e) => setNewCharacter(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the character"
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="character-traits">Character Traits</Label>
              <Textarea
                id="character-traits"
                value={newCharacter.traits}
                onChange={(e) => setNewCharacter(prev => ({ ...prev, traits: e.target.value }))}
                placeholder="Describe personality, role, etc."
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appearance-tags">Appearance Tags</Label>
              <Input
                id="appearance-tags"
                value={newCharacter.appearance_tags}
                onChange={(e) => setNewCharacter(prev => ({ ...prev, appearance_tags: e.target.value }))}
                placeholder="hair color, clothing style, age, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Reference Image (Optional)</Label>
              <div className="border-2 border-dashed rounded-lg p-4 hover:border-primary/50 transition-colors">
                <label className="flex flex-col items-center gap-2 cursor-pointer">
                  <Upload className="h-6 w-6 text-gray-400" />
                  <span className="text-sm text-gray-600">Upload reference image</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateCharacter} className="flex-1">
                Add Character
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button 
            variant="outline" 
            onClick={() => setShowCreateForm(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Character
          </Button>
        )}

        <Button 
          onClick={handleContinue} 
          className="w-full"
          disabled={characters.length === 0}
        >
          Continue to Story Input
        </Button>
      </CardContent>
    </Card>
  );
};
