import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSceneNarrative } from '@/hooks/useSceneNarrative';
import { useToast } from '@/hooks/use-toast';
import { useUserCharacters } from '@/hooks/useUserCharacters';
import { usePublicCharacters } from '@/hooks/usePublicCharacters';

interface CharacterParticipant {
  id: string;
  name: string;
  role: 'ai' | 'user' | 'narrator';
  image_url?: string;
  reference_image_url?: string;
  description?: string;
}

interface SceneGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterId?: string;
  conversationId?: string;
  character?: any;
}

export const SceneGenerationModal = ({ 
  isOpen, 
  onClose, 
  characterId, 
  conversationId,
  character 
}: SceneGenerationModalProps) => {
  const [prompt, setPrompt] = useState('');
  const [includeNarrator, setIncludeNarrator] = useState(true);
  const [selectedUserCharacter, setSelectedUserCharacter] = useState<string>('');
  const [selectedAICharacter1, setSelectedAICharacter1] = useState<string>(characterId || '');
  const [selectedAICharacter2, setSelectedAICharacter2] = useState<string>('');
  
  const { generateSceneNarrative, isGenerating } = useSceneNarrative();
  const { toast } = useToast();
  const { characters: userCharacters } = useUserCharacters();
  const { characters: aiCharacters } = usePublicCharacters();

  // Reset defaults when opened
  React.useEffect(() => {
    if (isOpen) {
      setSelectedAICharacter1(characterId || '');
      setSelectedAICharacter2('');
      setSelectedUserCharacter('');
      setIncludeNarrator(true);
    }
  }, [isOpen, characterId]);

  const handleGenerateScene = async () => {
    if (!prompt.trim()) return;

    try {
      // Build character list for the scene
      const selectedCharacters: CharacterParticipant[] = [];
      
      // Add AI characters
      if (selectedAICharacter1 && selectedAICharacter1 !== 'none') {
        const char1 = aiCharacters.find(c => c.id === selectedAICharacter1);
        if (char1) {
          selectedCharacters.push({
            id: char1.id,
            name: char1.name,
            role: 'ai',
            image_url: char1.image_url,
            reference_image_url: char1.reference_image_url,
            description: char1.description
          });
        }
      }
      
      if (selectedAICharacter2 && selectedAICharacter2 !== 'none') {
        const char2 = aiCharacters.find(c => c.id === selectedAICharacter2);
        if (char2) {
          selectedCharacters.push({
            id: char2.id,
            name: char2.name,
            role: 'ai',
            image_url: char2.image_url,
            reference_image_url: char2.reference_image_url,
            description: char2.description
          });
        }
      }

      await generateSceneNarrative(prompt, selectedCharacters, {
        includeNarrator,
        includeUserCharacter: !!selectedUserCharacter && selectedUserCharacter !== 'none',
        characterId,
        conversationId,
        userCharacterId: selectedUserCharacter && selectedUserCharacter !== 'none' ? selectedUserCharacter : undefined
      });

      onClose();
      setPrompt('');
    } catch (error) {
      console.error('Scene generation failed:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate scene. Please try again.",
        variant: "destructive",
      });
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background border-border text-foreground max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Generate Scene</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Scene Description
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the scene..."
              className="min-h-[60px] text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium block">
              Participants
            </label>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="narrator" 
                checked={includeNarrator}
                onCheckedChange={(checked) => setIncludeNarrator(checked === true)}
              />
              <label htmlFor="narrator" className="text-sm">
                Include Narrator
              </label>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                User Character
              </label>
              <Select value={selectedUserCharacter} onValueChange={setSelectedUserCharacter}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select user character" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {userCharacters.map((char) => (
                    <SelectItem key={char.id} value={char.id}>
                      {char.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                AI Character 1
              </label>
              <Select value={selectedAICharacter1} onValueChange={setSelectedAICharacter1}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select AI character" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {aiCharacters.map((char) => (
                    <SelectItem key={char.id} value={char.id}>
                      {char.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                AI Character 2 (Optional)
              </label>
              <Select value={selectedAICharacter2} onValueChange={setSelectedAICharacter2}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select second AI character" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {aiCharacters.filter(char => char.id !== selectedAICharacter1).map((char) => (
                    <SelectItem key={char.id} value={char.id}>
                      {char.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-8 text-sm"
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateScene}
              disabled={!prompt.trim() || isGenerating}
              className="flex-1 h-8 text-sm"
            >
              {isGenerating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};