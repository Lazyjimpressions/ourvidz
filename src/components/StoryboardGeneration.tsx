
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Image, CheckCircle, Edit } from "lucide-react";
import { uploadScenePreview, getScenePreviewUrl } from "@/lib/storage";
import { generateContent, waitForJobCompletion } from "@/lib/contentGeneration";
import { toast } from "sonner";

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
  projectId: string;
  onStoryboardApproved: (sceneImages: SceneImage[]) => void;
}

export const StoryboardGeneration = ({ scenes, projectId, onStoryboardApproved }: StoryboardGenerationProps) => {
  const [sceneImages, setSceneImages] = useState<SceneImage[]>([]);
  const [generatingScenes, setGeneratingScenes] = useState<Set<string>>(new Set());
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const generateSceneImage = async (scene: Scene) => {
    setGeneratingScenes(prev => new Set(prev).add(scene.id));
    
    try {
      console.log('Generating image for scene:', scene.sceneNumber, 'with prompt:', scene.enhancedPrompt);
      
      // Generate image using Wan 2.1 through RunPod
      const { job } = await generateContent({
        jobType: 'image',
        prompt: scene.enhancedPrompt,
        projectId: projectId,
        sceneId: scene.id,
        metadata: {
          sceneNumber: scene.sceneNumber,
          width: 1024,
          height: 768,
          outputFormat: 'PNG'
        }
      });

      console.log('Image generation job created:', job.id);

      // Wait for job completion with progress updates
      const completedJob = await waitForJobCompletion(
        job.id,
        (status) => {
          console.log(`Scene ${scene.sceneNumber} generation status:`, status);
        },
        180000 // 3 minutes timeout for image generation
      );

      console.log('Image generation completed:', completedJob);

      // Get the generated image URL from job metadata
      const imageUrl = completedJob.metadata?.imageUrl;
      
      if (!imageUrl) {
        throw new Error('No image URL returned from generation');
      }

      const newSceneImage: SceneImage = {
        sceneId: scene.id,
        imageUrl: imageUrl,
        approved: false,
      };

      setSceneImages(prev => {
        const filtered = prev.filter(img => img.sceneId !== scene.id);
        return [...filtered, newSceneImage];
      });

      toast.success(`Scene ${scene.sceneNumber} image generated successfully`);

    } catch (error) {
      console.error('Error generating scene image:', error);
      toast.error(`Failed to generate scene ${scene.sceneNumber} image: ${error.message}`);
      
      // Remove the scene from generating set on error
      setSceneImages(prev => prev.filter(img => img.sceneId !== scene.id));
    } finally {
      setGeneratingScenes(prev => {
        const newSet = new Set(prev);
        newSet.delete(scene.id);
        return newSet;
      });
    }
  };

  const generateAllScenes = async () => {
    setIsGeneratingAll(true);
    
    try {
      // Generate images for all scenes that don't have images yet
      const scenesToGenerate = scenes.filter(scene => 
        !sceneImages.find(img => img.sceneId === scene.id)
      );

      console.log(`Generating images for ${scenesToGenerate.length} scenes`);

      // Generate all scenes in parallel for better performance
      const generationPromises = scenesToGenerate.map(scene => 
        generateSceneImage(scene)
      );

      await Promise.allSettled(generationPromises);
      
      toast.success('All scene images generated');
    } catch (error) {
      console.error('Error generating all scenes:', error);
      toast.error('Failed to generate some scene images');
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const toggleSceneApproval = (sceneId: string) => {
    setSceneImages(prev => prev.map(img => 
      img.sceneId === sceneId 
        ? { ...img, approved: !img.approved }
        : img
    ));
  };

  const regenerateScene = (scene: Scene) => {
    // Remove existing image for this scene
    setSceneImages(prev => prev.filter(img => img.sceneId !== scene.id));
    // Generate new image
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
            Generate AI images for each scene using Wan 2.1 before creating the final video
          </div>
          <Button 
            onClick={generateAllScenes}
            disabled={isGeneratingAll || scenes.length === 0}
            variant="outline"
          >
            {isGeneratingAll ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Generating All...
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
                    <div className="text-xs text-gray-400 mt-1 bg-gray-50 p-2 rounded">
                      AI Prompt: {scene.enhancedPrompt.substring(0, 100)}...
                    </div>
                  </div>
                </div>

                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                  {isGenerating ? (
                    <div className="flex flex-col items-center gap-2">
                      <LoadingSpinner />
                      <span className="text-sm text-gray-600">Generating with Wan 2.1...</span>
                    </div>
                  ) : sceneImage ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={sceneImage.imageUrl} 
                        alt={`Scene ${scene.sceneNumber}`}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          console.error('Image load error for scene:', scene.sceneNumber);
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
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
                      Generate AI Image
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
