
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

export const StoryBreakdown = ({ config, characters, onScenesApproved }: StoryBreakdownProps) => {
  const [story, setStory] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessStory = async () => {
    if (!story.trim()) return;

    setIsProcessing(true);
    
    // Simulate AI processing - replace with actual RunPod API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate scenes based on the story and character context
    const generatedScenes: Scene[] = Array.from({ length: config.sceneCount }, (_, index) => ({
      id: `scene-${index + 1}`,
      sceneNumber: index + 1,
      description: `Scene ${index + 1}: Generated from story segment`,
      enhancedPrompt: `Enhanced AI prompt for scene ${index + 1} with characters: ${characters.map(c => c.name).join(', ')}`,
    }));

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
        <CardTitle>Story Input & Scene Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="story-input">Your Story</Label>
          <Textarea
            id="story-input"
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Write your story in natural language. The AI will break it down into scenes and enhance it for video generation..."
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
              Processing Story...
            </>
          ) : (
            "Break Down Into Scenes"
          )}
        </Button>

        {scenes.length > 0 && (
          <div className="space-y-4">
            <Label>Scene Breakdown ({scenes.length} scenes)</Label>
            <div className="space-y-3">
              {scenes.map((scene) => (
                <div key={scene.id} className="border rounded-lg p-4">
                  <div className="font-medium mb-2">Scene {scene.sceneNumber}</div>
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
              Continue to Storyboard Generation
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
