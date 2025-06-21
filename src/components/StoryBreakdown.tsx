
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { VideoConfig } from "./VideoConfiguration";
import { Character } from "./CharacterManager";

interface Scene {
  id: string;
  sceneNumber: number;
  description: string;
  enhancedPrompt: string;
}

interface StoryBreakdownProps {
  config: VideoConfig;
  characters: Character[];
  onScenesApproved: (scenes: Scene[]) => void;
}

// Content templates for different media types
const contentTemplates = {
  image: [
    "A magical forest scene with glowing flowers and mystical creatures",
    "A futuristic cityscape at sunset with flying vehicles", 
    "A cozy library filled with floating books and warm light"
  ],
  video: [
    "A character discovers a hidden door and steps through into a magical world",
    "An inventor creates a wonderful gadget that comes to life and helps solve a problem",
    "Friends embark on an adventure to find a lost treasure in an enchanted forest"
  ]
};

export const StoryBreakdown = ({ config, characters, onScenesApproved }: StoryBreakdownProps) => {
  const [story, setStory] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const templates = contentTemplates[config.mediaType];

  const handleTemplateSelect = (template: string) => {
    setStory(template);
  };

  const handleProcessStory = async () => {
    if (!story.trim()) return;

    setIsProcessing(true);
    
    // Simulate AI processing - replace with actual RunPod API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate scenes based on the story and media type
    const generatedScenes: Scene[] = Array.from({ length: config.sceneCount }, (_, index) => {
      const sceneNumber = index + 1;
      let description = "";
      let enhancedPrompt = "";

      if (config.mediaType === 'image') {
        description = `${story}`;
        enhancedPrompt = `High-quality digital art: ${story}${characters.length > 0 ? ` featuring ${characters.map(c => c.name).join(', ')}` : ''}`;
      } else {
        description = `Scene ${sceneNumber}: ${story} - part ${sceneNumber}`;
        enhancedPrompt = `Cinematic video scene ${sceneNumber}: ${story}${characters.length > 0 ? ` with characters: ${characters.map(c => `${c.name} (${c.appearance_tags ? c.appearance_tags.join(', ') : 'no appearance details'})`).join(', ')}` : ''}`;
      }

      return {
        id: `scene-${sceneNumber}`,
        sceneNumber,
        description,
        enhancedPrompt,
      };
    });

    setScenes(generatedScenes);
    setIsProcessing(false);
  };

  const handleSceneEdit = (sceneId: string, newDescription: string) => {
    setScenes(prev => prev.map(scene => 
      scene.id === sceneId 
        ? { ...scene, description: newDescription }
        : scene
    ));
  };

  const handleApproveScenes = () => {
    onScenesApproved(scenes);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {config.mediaType === 'image' ? 'Image Description' : 'Story Input & Scene Breakdown'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Templates */}
        <div className="space-y-2">
          <Label>Quick Start Templates</Label>
          <div className="grid grid-cols-1 gap-2">
            {templates.map((template, index) => (
              <button
                key={index}
                onClick={() => handleTemplateSelect(template)}
                className="p-2 text-sm text-left border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                {template}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="story-input">
            {config.mediaType === 'image' ? 'Describe your image' : 'Your Story'}
          </Label>
          <Textarea
            id="story-input"
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder={
              config.mediaType === 'image' 
                ? "Describe the image you want to create in detail..."
                : "Write your story in natural language. The AI will break it down into scenes and enhance it for video generation..."
            }
            className="min-h-[120px]"
          />
        </div>

        {characters.length > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-800 mb-1">Characters in this story:</div>
            <div className="text-sm text-blue-700">
              {characters.map(c => c.name).join(', ')}
            </div>
          </div>
        )}

        <Button 
          onClick={handleProcessStory}
          disabled={!story.trim() || isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Processing...
            </>
          ) : (
            config.mediaType === 'image' ? "Generate Image" : "Break Down Into Scenes"
          )}
        </Button>

        {scenes.length > 0 && (
          <div className="space-y-4">
            <Label>
              {config.mediaType === 'image' ? 'Image Preview' : `Scene Breakdown (${scenes.length} scenes)`}
            </Label>
            <div className="space-y-3">
              {scenes.map((scene) => (
                <div key={scene.id} className="border rounded-lg p-4">
                  <div className="font-medium mb-2">
                    {config.mediaType === 'image' ? 'Description' : `Scene ${scene.sceneNumber}`}
                  </div>
                  <Textarea
                    value={scene.description}
                    onChange={(e) => handleSceneEdit(scene.id, e.target.value)}
                    className="min-h-[60px] mb-2"
                  />
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    AI Enhanced: {scene.enhancedPrompt}
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={handleApproveScenes} className="w-full">
              {config.mediaType === 'image' ? 'Generate Image' : 'Continue to Storyboard Generation'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
