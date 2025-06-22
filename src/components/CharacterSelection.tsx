
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Plus, Users } from "lucide-react";
import { Character } from "@/components/CharacterManager";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";

interface CharacterSelectionProps {
  onCharactersSelected: (characters: Character[]) => void;
  onSkipCharacters: () => void;
}

export const CharacterSelection = ({ onCharactersSelected, onSkipCharacters }: CharacterSelectionProps) => {
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserCharacters();
  }, []);

  const fetchUserCharacters = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User must be authenticated');
        return;
      }

      // Fetch user's characters from database
      const { data, error: fetchError } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching characters:', fetchError);
        setError('Failed to load characters');
        return;
      }

      setCharacters(data || []);
    } catch (error) {
      console.error('Error in fetchUserCharacters:', error);
      setError('Failed to load characters');
      toast.error('Failed to load your characters');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleCreateNewCharacter = () => {
    window.open('/characters', '_blank');
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Character Setup (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-red-600">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={onSkipCharacters}>
                Skip Characters
              </Button>
              <Button variant="outline" onClick={fetchUserCharacters}>
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

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
              onClick={handleCreateNewCharacter}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Character
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : characters.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <Label>Your Characters ({characters.length})</Label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {characters.map((character) => (
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
                  {character.description && (
                    <p className="text-sm text-gray-600 mb-1 line-clamp-2">{character.description}</p>
                  )}
                  {character.traits && (
                    <p className="text-sm text-gray-600 mb-1 line-clamp-1">{character.traits}</p>
                  )}
                  {character.appearance_tags && character.appearance_tags.length > 0 && (
                    <p className="text-xs text-gray-500 line-clamp-1">{character.appearance_tags.join(', ')}</p>
                  )}
                  {character.image_url && (
                    <div className="mt-2">
                      <img 
                        src={character.image_url} 
                        alt={character.name}
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
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
        ) : (
          <div className="text-center py-8 space-y-4">
            <User className="h-12 w-12 mx-auto text-gray-400" />
            <div className="space-y-2">
              <p className="text-gray-600">You haven't created any characters yet.</p>
              <p className="text-sm text-gray-500">Create characters to add personality and consistency to your stories.</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={onSkipCharacters}>
                Continue Without Characters
              </Button>
              <Button onClick={handleCreateNewCharacter}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Character
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
