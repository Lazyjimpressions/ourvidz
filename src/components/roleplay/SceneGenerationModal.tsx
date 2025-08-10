import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSceneGeneration } from '@/hooks/useSceneGeneration';
import { useCharacterScenes } from '@/hooks/useCharacterScenes';
import { useToast } from '@/hooks/use-toast';
import { Palette, Camera, Sparkles, Wand2, Users, User } from 'lucide-react';
import { CharacterMultiSelector } from './CharacterMultiSelector';

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
  const [style, setStyle] = useState<'lustify' | 'realistic' | 'artistic' | 'anime'>('lustify');
  const [quality, setQuality] = useState<'high' | 'fast'>('high');
  const [sceneType, setSceneType] = useState<'single' | 'multi'>('single');
  const [selectedCharacters, setSelectedCharacters] = useState<CharacterParticipant[]>([]);
  const { generateSceneImage, isGenerating } = useSceneGeneration();
  const { createScene } = useCharacterScenes(characterId);
  const { toast } = useToast();

  // Initialize with primary character if provided
  useEffect(() => {
    if (character && selectedCharacters.length === 0) {
      setSelectedCharacters([{
        id: character.id,
        name: character.name,
        role: character.role === 'user' ? 'user' : 'ai',
        image_url: character.image_url,
        reference_image_url: character.reference_image_url,
        description: character.description
      }]);
    }
  }, [character, selectedCharacters.length]);

  // Listen for generation completion events
  useEffect(() => {
    const handleGenerationComplete = async (event: CustomEvent) => {
      const { assetId, imageUrl, type } = event.detail;
      
      if (type === 'image' && assetId && imageUrl && characterId) {
        try {
          // Save to character_scenes table when generation completes
          await createScene({
            character_id: characterId,
            conversation_id: conversationId || null,
            image_url: imageUrl,
            scene_prompt: prompt,
            generation_metadata: {
              style,
              quality,
              model: 'sdxl',
              assetId,
              timestamp: new Date().toISOString(),
              sceneType,
              participants: selectedCharacters.map(char => ({
                id: char.id,
                name: char.name,
                role: char.role
              })),
              primaryCharacter: characterId
            }
          });

          toast({
            title: "Scene Saved!",
            description: "Your scene has been generated and saved to the gallery",
          });

          onClose();
          setPrompt('');
        } catch (error) {
          console.error('Failed to save scene:', error);
          toast({
            title: "Scene Generated",
            description: "Image created but failed to save to gallery",
            variant: "destructive",
          });
        }
      }
    };

    window.addEventListener('generation-completed', handleGenerationComplete as EventListener);
    return () => window.removeEventListener('generation-completed', handleGenerationComplete as EventListener);
  }, [characterId, conversationId, prompt, style, quality, sceneType, selectedCharacters, createScene, toast, onClose]);

  const handleGenerateScene = async () => {
    if (!prompt.trim() || selectedCharacters.length === 0) return;

    try {
      // Build enhanced prompt with character information
      let enhancedPrompt = prompt;
      
      if (sceneType === 'multi' && selectedCharacters.length > 1) {
        const characterDescriptions = selectedCharacters
          .map(char => `${char.name} (${char.role})`)
          .join(', ');
        enhancedPrompt = `${prompt} featuring ${characterDescriptions}`;
      }

      await generateSceneImage(enhancedPrompt, null, {
        style,
        quality,
        useCharacterReference: selectedCharacters.some(char => !!char.reference_image_url)
      });

      // Scene will be saved automatically when generation completes via event listener
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
    "A romantic candlelit dinner in an elegant restaurant",
    "Walking together through a beautiful garden at sunset", 
    "Sitting by a cozy fireplace on a winter evening",
    "Dancing under the stars on a moonlit beach",
    "Having coffee together at a quaint café",
    "Exploring an ancient castle or ruins",
    "Watching the sunrise from a mountain peak",
    "Relaxing in a luxurious spa or hot springs"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Generate Scene
          </DialogTitle>
        </DialogHeader>

        <Tabs value={sceneType} onValueChange={(value) => setSceneType(value as any)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Single Character
            </TabsTrigger>
            <TabsTrigger value="multi" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Multi-Character
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Scene Description
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={`Describe a scene with ${character?.name || 'the character'}...`}
                className="bg-gray-800 border-gray-700 min-h-[100px]"
              />
            </div>
          </TabsContent>

          <TabsContent value="multi" className="space-y-4">
            <CharacterMultiSelector
              primaryCharacterId={characterId}
              selectedCharacters={selectedCharacters}
              onCharactersChange={setSelectedCharacters}
              maxCharacters={3}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4"
            />
            
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Multi-Character Scene Description
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the scene with multiple characters..."
                className="bg-gray-800 border-gray-700 min-h-[100px]"
              />
            </div>
          </TabsContent>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Style
              </label>
              <Select value={style} onValueChange={(value) => setStyle(value as any)}>
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="lustify">Lustify</SelectItem>
                  <SelectItem value="anime">Anime</SelectItem>
                  <SelectItem value="realistic">Realistic</SelectItem>
                  <SelectItem value="artistic">Artistic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Quality
              </label>
              <Select value={quality} onValueChange={(value) => setQuality(value as any)}>
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="fast">Fast</SelectItem>
                  <SelectItem value="high">High Quality</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedCharacters.some(char => char.reference_image_url) && (
            <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Camera className="w-4 h-4" />
                <span>Character references will be used for consistency</span>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Quick Scene Ideas
            </label>
            <div className="flex flex-wrap gap-2">
              {scenePrompts.slice(0, 4).map((scenePrompt, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="cursor-pointer hover:bg-gray-700 text-xs"
                  onClick={() => setPrompt(scenePrompt)}
                >
                  {scenePrompt.slice(0, 30)}...
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
              disabled={!prompt.trim() || selectedCharacters.length === 0 || isGenerating}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Scene
                </>
              )}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};