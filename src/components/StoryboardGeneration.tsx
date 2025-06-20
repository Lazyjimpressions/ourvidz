
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Image, CheckCircle, Edit } from "lucide-react";

interface Scene {
  id: string;
  sceneNumber: number;
  description: string;
  enhancedPrompt: string;
}

interface SceneImage {
  sceneId: string;
  imageUrl: string;
  approved: boolean;
}

interface StoryboardGenerationProps {
  scenes: Scene[];
  onStoryboardApproved: (sceneImages: SceneImage[]) => void;
}

export const StoryboardGeneration = ({ scenes, onStoryboardApproved }: StoryboardGenerationProps) => {
  const [sceneImages, setSceneImages] = useState<SceneImage[]>([]);
  const [generatingScenes, setGeneratingScenes] = useState<Set<string>>(new Set());
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const generateSceneImage = async (scene: Scene) => {
    setGeneratingScenes(prev => new Set(prev).add(scene.id));
    
    // Simulate image generation - replace with actual RunPod API call
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const newSceneImage: SceneImage = {
      sceneId: scene.id,
      imageUrl: "/placeholder.svg", // Replace with actual generated image
      approved: false,
    };

    setSceneImages(prev => {
      const filtered = prev.filter(img => img.sceneId !== scene.id);
      return [...filtered, newSceneImage];
    });

    setGeneratingScenes(prev => {
      const newSet = new Set(prev);
      newSet.delete(scene.id);
      return newSet;
    });
  };

  const generateAllScenes = async () => {
    setIsGeneratingAll(true);
    
    for (const scene of scenes) {
      if (!sceneImages.find(img => img.sceneId === scene.id)) {
        await generateSceneImage(scene);
      }
    }
    
    setIsGeneratingAll(false);
  };

  const toggleSceneApproval = (sceneId: string) => {
    setSceneImages(prev => prev.map(img => 
      img.sceneId === sceneId 
        ? { ...img, approved: !img.approved }
        : img
    ));
  };

  const regenerateScene = (scene: Scene) => {
    generateSceneImage(scene);
  };

  const allScenesApproved = scenes.every(scene => {
    const sceneImage = sceneImages.find(img => img.sceneId === scene.id);
    return sceneImage?.approved;
  });

  const handleContinueToGeneration = () => {
    onStoryboardApproved(sceneImages);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storyboard Generation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Generate preview images for each scene before creating the final video
          </div>
          <Button 
            onClick={generateAllScenes}
            disabled={isGeneratingAll || scenes.length === 0}
            variant="outline"
          >
            {isGeneratingAll ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Generating...
              </>
            ) : (
              "Generate All Scenes"
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenes.map((scene) => {
            const sceneImage = sceneImages.find(img => img.sceneId === scene.id);
            const isGenerating = generatingScenes.has(scene.id);

            return (
              <div key={scene.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">Scene {scene.sceneNumber}</div>
                    <div className="text-sm text-gray-600 mt-1">{scene.description}</div>
                  </div>
                </div>

                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                  {isGenerating ? (
                    <div className="flex flex-col items-center gap-2">
                      <LoadingSpinner />
                      <span className="text-sm text-gray-600">Generating...</span>
                    </div>
                  ) : sceneImage ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={sceneImage.imageUrl} 
                        alt={`Scene ${scene.sceneNumber}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      {sceneImage.approved && (
                        <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Image className="h-8 w-8" />
                      <span className="text-sm">No image generated</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {sceneImage ? (
                    <>
                      <Button
                        variant={sceneImage.approved ? "default" : "outline"}
                        onClick={() => toggleSceneApproval(scene.id)}
                        className="flex-1"
                      >
                        {sceneImage.approved ? "Approved" : "Approve"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => regenerateScene(scene)}
                        disabled={isGenerating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button 
                      onClick={() => generateSceneImage(scene)}
                      disabled={isGenerating}
                      className="w-full"
                    >
                      Generate Image
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {sceneImages.length > 0 && (
          <div className="border-t pt-4">
            <div className="text-sm text-gray-600 mb-3">
              Progress: {sceneImages.filter(img => img.approved).length} of {scenes.length} scenes approved
            </div>
            <Button 
              onClick={handleContinueToGeneration}
              disabled={!allScenesApproved}
              className="w-full"
            >
              Generate Final Video
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
