import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useSceneNarrative } from '@/hooks/useSceneNarrative';
import { useToast } from '@/hooks/use-toast';

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
  const [includeUserCharacter, setIncludeUserCharacter] = useState(true);
  const { generateSceneNarrative, isGenerating } = useSceneNarrative();
  const { toast } = useToast();

  const handleGenerateScene = async () => {
    if (!prompt.trim()) return;

    try {
      await generateSceneNarrative(prompt, character, {
        includeNarrator,
        includeUserCharacter,
        characterId,
        conversationId
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


  const scenePrompts = [
    "A cozy evening conversation by the fireplace",
    "Meeting at a quiet café for the first time", 
    "Walking together through a moonlit garden",
    "Relaxing together in a comfortable living room",
    "Having an intimate dinner at home",
    "Spending a lazy morning in bed talking"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background border-border text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Scene</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Scene Description
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Describe the scene you want to create with ${character?.name || 'the character'}...`}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium block">
              Scene Participants
            </label>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="narrator" 
                  checked={includeNarrator}
                  onCheckedChange={(checked) => setIncludeNarrator(checked === true)}
                />
                <label htmlFor="narrator" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Include Narrator (sets the scene)
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="user" 
                  checked={includeUserCharacter}
                  onCheckedChange={(checked) => setIncludeUserCharacter(checked === true)}
                />
                <label htmlFor="user" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Include User Character
                </label>
              </div>
              
              {character && (
                <div className="flex items-center space-x-2">
                  <Checkbox checked={true} disabled />
                  <label className="text-sm font-medium text-muted-foreground">
                    {character.name} (AI Character)
                  </label>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Quick Scene Ideas
            </label>
            <div className="flex flex-wrap gap-2">
              {scenePrompts.map((scenePrompt, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted text-xs"
                  onClick={() => setPrompt(scenePrompt)}
                >
                  {scenePrompt}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateScene}
              disabled={!prompt.trim() || isGenerating}
              className="flex-1"
            >
              {isGenerating ? 'Generating...' : 'Generate Scene'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};