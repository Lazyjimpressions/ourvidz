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
import { usePublicCharacters } from '@/hooks/usePublicCharacters';
import { useUserCharacters } from '@/hooks/useUserCharacters';
import { useScenePromptEnhancement } from '@/hooks/useScenePromptEnhancement';
import { User, Sparkles, Wand2, Undo2, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [includeNarrator, setIncludeNarrator] = useState(true);
  const [selectedAICharacter1, setSelectedAICharacter1] = useState<string>(characterId || '');
  const [selectedAICharacter2, setSelectedAICharacter2] = useState<string>('');
  
  const { generateSceneNarrative, isGenerating } = useSceneNarrative();
  const { toast } = useToast();
  const { characters: publicCharacters } = usePublicCharacters();
  const { characters: userCharacters } = useUserCharacters();
  const { enhancePrompt, isEnhancing } = useScenePromptEnhancement();
  
  // Combine public and user characters, removing duplicates
  const aiCharacters = React.useMemo(() => {
    const allChars = [...publicCharacters, ...userCharacters];
    const uniqueChars = allChars.filter((char, index, self) => 
      index === self.findIndex(c => c.id === char.id)
    );
    return uniqueChars;
  }, [publicCharacters, userCharacters]);

  // Reset defaults when opened
  React.useEffect(() => {
    if (isOpen) {
      setSceneName('');
      setSceneDescription('');
      setPrompt('');
      setOriginalPrompt('');
      setSelectedAICharacter1(characterId || '');
      setSelectedAICharacter2('');
      setIncludeNarrator(true);
    }
  }, [isOpen, characterId]);

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) {
      toast({
        title: "No Prompt",
        description: "Please enter a scene prompt first.",
        variant: "destructive",
      });
      return;
    }

    // Save original prompt for undo
    if (!originalPrompt) {
      setOriginalPrompt(prompt);
    }

    const enhanced = await enhancePrompt(prompt);
    if (enhanced && enhanced !== prompt) {
      setPrompt(enhanced);
      toast({
        title: "Prompt Enhanced",
        description: "Your scene prompt has been improved. You can undo if needed.",
      });
    }
  };

  const handleUndoPrompt = () => {
    if (originalPrompt) {
      setPrompt(originalPrompt);
      setOriginalPrompt('');
      toast({
        title: "Prompt Restored",
        description: "Original prompt has been restored.",
      });
    }
  };

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

      // Note: User character identity is set globally in Roleplay Settings
      // and will be automatically applied during scene generation
      const sceneId = await generateSceneNarrative(prompt, selectedCharacters, {
        includeNarrator,
        includeUserCharacter: false, // Will be determined from global settings
        characterId,
        conversationId,
        userCharacterId: undefined, // Will be retrieved from global settings
        sceneName: sceneName.trim(),
        sceneDescription: sceneDescription.trim() || undefined
      });

      if (sceneId) {
        toast({
          title: "Scene Created",
          description: `"${sceneName.trim()}" has been created successfully.`,
        });

        if (onSceneCreated) {
          onSceneCreated(sceneId);
        }

        onClose();
        setSceneName('');
        setSceneDescription('');
        setPrompt('');
      } else {
        throw new Error('Scene ID was not returned');
      }
    } catch (error) {
      console.error('Scene generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate scene. Please try again.';
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
      // Don't close modal on error so user can fix and retry
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
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="scene-prompt" className="text-sm font-medium">
                Scene Prompt <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-1">
                {originalPrompt && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleUndoPrompt}
                    className="h-6 px-2 text-xs"
                    disabled={isEnhancing}
                  >
                    <Undo2 className="w-3 h-3 mr-1" />
                    Undo
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleEnhancePrompt}
                  className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-600/10"
                  disabled={!prompt.trim() || isEnhancing || isGenerating}
                >
                  <Wand2 className={`w-3 h-3 mr-1 ${isEnhancing ? 'animate-pulse' : ''}`} />
                  {isEnhancing ? 'Enhancing...' : 'Enhance with AI'}
                </Button>
              </div>
            </div>
            <Textarea
              id="scene-prompt"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                // Clear original prompt if user manually edits
                if (originalPrompt && e.target.value !== prompt) {
                  setOriginalPrompt('');
                }
              }}
              placeholder="Describe the scene..."
              className="min-h-[60px] text-sm"
              disabled={isEnhancing}
            />
            {isEnhancing && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 animate-pulse" />
                AI is enhancing your prompt...
              </p>
            )}
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs">
                      A narrator provides scene descriptions and context, helping set the atmosphere and guide the story between character interactions.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded border border-border/50">
              <p className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>Your character identity is set in <strong>Roleplay Settings</strong> and will be used automatically.</span>
              </p>
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
                      <div className="flex items-center gap-2">
                        {char.image_url ? (
                          <img 
                            src={char.image_url} 
                            alt={char.name}
                            className="w-5 h-5 rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <User className="w-5 h-5 text-muted-foreground" />
                        )}
                        <span>{char.name}</span>
                      </div>
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
                      <div className="flex items-center gap-2">
                        {char.image_url ? (
                          <img 
                            src={char.image_url} 
                            alt={char.name}
                            className="w-5 h-5 rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <User className="w-5 h-5 text-muted-foreground" />
                        )}
                        <span>{char.name}</span>
                      </div>
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