import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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
  onSceneCreated?: (sceneId: string) => void;
}

export const SceneGenerationModal = ({ 
  isOpen, 
  onClose, 
  characterId, 
  conversationId,
  character,
  onSceneCreated
}: SceneGenerationModalProps) => {
  const [sceneName, setSceneName] = useState('');
  const [sceneDescription, setSceneDescription] = useState('');
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
      setSceneName('');
      setSceneDescription('');
      setPrompt('');
      setSelectedAICharacter1(characterId || '');
      setSelectedAICharacter2('');
      setSelectedUserCharacter('');
      setIncludeNarrator(true);
    }
  }, [isOpen, characterId]);

  const handleGenerateScene = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a scene description.",
        variant: "destructive",
      });
      return;
    }

    if (!sceneName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a scene name.",
        variant: "destructive",
      });
      return;
    }

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

      const sceneId = await generateSceneNarrative(prompt, selectedCharacters, {
        includeNarrator,
        includeUserCharacter: !!selectedUserCharacter && selectedUserCharacter !== 'none',
        characterId,
        conversationId,
        userCharacterId: selectedUserCharacter && selectedUserCharacter !== 'none' ? selectedUserCharacter : undefined,
        sceneName: sceneName.trim(),
        sceneDescription: sceneDescription.trim() || undefined
      });

      if (sceneId && onSceneCreated) {
        onSceneCreated(sceneId);
      }

      onClose();
      setSceneName('');
      setSceneDescription('');
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
      <DialogContent className="bg-background border-border text-foreground max-w-sm max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Generate Scene</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="scene-name" className="text-sm font-medium mb-1">
              Scene Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="scene-name"
              value={sceneName}
              onChange={(e) => setSceneName(e.target.value)}
              placeholder="Enter scene name..."
              className="text-sm"
            />
          </div>

          <div>
            <Label htmlFor="scene-description" className="text-sm font-medium mb-1">
              Scene Description (Optional)
            </Label>
            <Textarea
              id="scene-description"
              value={sceneDescription}
              onChange={(e) => setSceneDescription(e.target.value)}
              placeholder="Brief description of the scene..."
              className="min-h-[50px] text-sm"
            />
          </div>

          <div>
            <Label htmlFor="scene-prompt" className="text-sm font-medium mb-1">
              Scene Prompt <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="scene-prompt"
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
              disabled={!prompt.trim() || !sceneName.trim() || isGenerating}
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