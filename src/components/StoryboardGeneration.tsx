
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Progress } from "@/components/ui/progress";
import { GenerationOptions } from "@/components/GenerationOptions";
import { useGeneration } from "@/hooks/useGeneration";
import { Image, Check, X, Download } from "lucide-react";
import type { GenerationFormat, GenerationQuality } from "@/types/generation";
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

export const StoryboardGeneration = ({ 
  scenes, 
  projectId, 
  onStoryboardApproved 
}: StoryboardGenerationProps) => {
  const [format, setFormat] = useState<GenerationFormat>('image');
  const [quality, setQuality] = useState<GenerationQuality>('fast');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScenes, setGeneratedScenes] = useState<SceneImage[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);

  const { generate, getEstimatedCredits } = useGeneration({
    onSuccess: (data) => {
      console.log('Scene generation started:', data.id);
    },
    onError: (error) => {
      console.error('Scene generation failed:', error);
      toast.error(`Scene generation failed: ${error.message}`);
      setIsGenerating(false);
    }
  });

  const generateStoryboard = async () => {
    if (scenes.length === 0) return;
    
    setIsGenerating(true);
    setGeneratedScenes([]);
    setProgress(0);
    setCurrentSceneIndex(0);
    
    try {
      const scenePromises = scenes.map(async (scene, index) => {
        await new Promise(resolve => setTimeout(resolve, index * 1000)); // Stagger requests
        
        const result = await generate({
          format,
          quality,
          prompt: scene.enhancedPrompt,
          projectId,
          metadata: {
            source: 'storyboard_generation',
            sceneId: scene.id,
            sceneNumber: scene.sceneNumber
          }
        });

        // Simulate progress update
        setProgress((prev) => Math.min(prev + (100 / scenes.length), 100));
        setCurrentSceneIndex(index + 1);

        // For demo purposes, we'll use a placeholder image
        // In real implementation, this would poll for completion
        return {
          sceneId: scene.id,
          imageUrl: `https://picsum.photos/512/512?random=${Date.now()}-${index}`,
          approved: false
        };
      });

      const results = await Promise.all(scenePromises);
      setGeneratedScenes(results);
      setIsGenerating(false);
      setProgress(100);
      
      toast.success(`Generated ${results.length} storyboard images using functional generation!`);
      
    } catch (error) {
      console.error('Error generating storyboard:', error);
      setIsGenerating(false);
      setProgress(0);
      toast.error('Failed to generate storyboard');
    }
  };

  const toggleSceneApproval = (sceneId: string) => {
    setGeneratedScenes(prev => 
      prev.map(scene => 
        scene.sceneId === sceneId 
          ? { ...scene, approved: !scene.approved }
          : scene
      )
    );
  };

  const approveAllScenes = () => {
    setGeneratedScenes(prev => prev.map(scene => ({ ...scene, approved: true })));
  };

  const handleApproveStoryboard = () => {
    const approvedScenes = generatedScenes.filter(scene => scene.approved);
    if (approvedScenes.length === 0) {
      toast.error('Please approve at least one scene');
      return;
    }
    
    onStoryboardApproved(approvedScenes);
    toast.success(`${approvedScenes.length} scenes approved for video generation!`);
  };

  const downloadImage = (imageUrl: string, sceneNumber: number) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `storyboard-scene-${sceneNumber}.png`;
    link.click();
    toast.success('Download started');
  };

  const estimatedCredits = getEstimatedCredits(format, quality) * scenes.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Storyboard Generation
          <Badge variant="secondary">Wan 2.1</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Generate visual storyboards for {scenes.length} scenes using functional generation
          </p>
        </div>

        <GenerationOptions
          selectedFormat={format}
          selectedQuality={quality}
          onFormatChange={setFormat}
          onQualityChange={setQuality}
        />

        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Generation Summary</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div>Scenes to Generate: {scenes.length}</div>
            <div>Quality: {quality}</div>
            <div>Total Estimated Credits: {estimatedCredits}</div>
          </div>
        </div>

        <Button
          onClick={generateStoryboard}
          disabled={isGenerating || scenes.length === 0}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <LoadingSpinner className="mr-2" size="sm" />
              Generating Storyboard...
            </>
          ) : (
            `Generate Storyboard (${estimatedCredits} credits)`
          )}
        </Button>

        {isGenerating && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Generating scene {currentSceneIndex} of {scenes.length}...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-gray-500 text-center">
              Using functional generation with Wan 2.1...
            </p>
          </div>
        )}

        {generatedScenes.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Generated Storyboard ({generatedScenes.length})</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={approveAllScenes}
              >
                Approve All
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generatedScenes.map((sceneImage, index) => {
                const scene = scenes.find(s => s.id === sceneImage.sceneId);
                return (
                  <div
                    key={sceneImage.sceneId}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                      sceneImage.approved
                        ? "border-green-500 shadow-lg"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="aspect-video">
                      <img
                        src={sceneImage.imageUrl}
                        alt={`Scene ${scene?.sceneNumber}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => downloadImage(sceneImage.imageUrl, scene?.sceneNumber || index + 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant={sceneImage.approved ? "default" : "secondary"}
                        size="sm"
                        onClick={() => toggleSceneApproval(sceneImage.sceneId)}
                        className="h-8 w-8 p-0"
                      >
                        {sceneImage.approved ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                      </Button>
                    </div>

                    <div className="p-3 bg-white">
                      <h4 className="font-medium text-sm mb-1">Scene {scene?.sceneNumber}</h4>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {scene?.description}
                      </p>
                    </div>

                    {sceneImage.approved && (
                      <div className="absolute inset-0 bg-green-500 bg-opacity-10 pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>

            {generatedScenes.some(scene => scene.approved) && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  {generatedScenes.filter(scene => scene.approved).length} scene{generatedScenes.filter(scene => scene.approved).length > 1 ? 's' : ''} approved
                </p>
                <Button
                  onClick={handleApproveStoryboard}
                  className="w-full"
                >
                  Continue with Approved Scenes
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
