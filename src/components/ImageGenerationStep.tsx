
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Progress } from "@/components/ui/progress";
import { Image, Download, Check, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Scene {
  id: string;
  sceneNumber: number;
  description: string;
  enhancedPrompt: string;
}

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  enhancedPrompt: string;
  timestamp: Date;
}

interface ImageGenerationStepProps {
  scenes: Scene[];
  projectId: string;
  onComplete: () => void;
}

export const ImageGenerationStep = ({ scenes, projectId, onComplete }: ImageGenerationStepProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);

  const generateImages = async () => {
    if (scenes.length === 0) return;
    
    setIsGenerating(true);
    setGeneratedImages([]);
    setSelectedImageIds(new Set());
    setProgress(0);
    
    try {
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const scene = scenes[0]; // For images, we only use the first scene
      const numberOfImages = 4;
      
      // Generate multiple image variations
      const generationPromises = Array.from({ length: numberOfImages }, async (_, index) => {
        // Create video record for image generation
        const { data: video, error: videoError } = await supabase
          .from('videos')
          .insert({
            project_id: projectId,
            user_id: user.id,
            status: 'draft',
            duration: 0,
            format: 'png'
          })
          .select()
          .single();

        if (videoError) throw videoError;

        // Queue image generation job
        const { data, error } = await supabase.functions.invoke('queue-job', {
          body: {
            jobType: 'preview',
            videoId: video.id,
            projectId: projectId,
            metadata: {
              prompt: scene.enhancedPrompt,
              variation: index + 1
            }
          }
        });

        if (error) throw error;

        // Poll for completion
        return new Promise<GeneratedImage>((resolve, reject) => {
          const pollInterval = setInterval(async () => {
            try {
              const { data: updatedVideo, error: pollError } = await supabase
                .from('videos')
                .select('status, preview_url')
                .eq('id', video.id)
                .single();

              if (pollError) throw pollError;

              if (updatedVideo.status === 'preview_ready' && updatedVideo.preview_url) {
                clearInterval(pollInterval);
                setProgress((prev) => Math.min(prev + 25, 100));
                resolve({
                  id: `generated-${Date.now()}-${index}`,
                  url: updatedVideo.preview_url,
                  prompt: scene.description,
                  enhancedPrompt: scene.enhancedPrompt,
                  timestamp: new Date()
                });
              } else if (updatedVideo.status === 'failed') {
                clearInterval(pollInterval);
                reject(new Error('Image generation failed'));
              }
            } catch (error) {
              clearInterval(pollInterval);
              reject(error);
            }
          }, 3000);

          // Timeout after 3 minutes
          setTimeout(() => {
            clearInterval(pollInterval);
            reject(new Error('Generation timeout'));
          }, 180000);
        });
      });

      const results = await Promise.allSettled(generationPromises);
      
      const successfulImages: GeneratedImage[] = results
        .filter((result): result is PromiseFulfilledResult<GeneratedImage> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);

      setProgress(100);
      setGeneratedImages(successfulImages);
      setIsGenerating(false);
      
      if (successfulImages.length > 0) {
        toast.success(`Successfully generated ${successfulImages.length} image variations using Wan 2.1.`);
      } else {
        throw new Error('All image generations failed');
      }
      
    } catch (error) {
      console.error('Error generating images:', error);
      setIsGenerating(false);
      setProgress(0);
      toast.error(`Failed to generate images: ${error.message}`);
    }
  };

  const toggleImageSelection = (imageId: string) => {
    const newSelection = new Set(selectedImageIds);
    if (newSelection.has(imageId)) {
      newSelection.delete(imageId);
    } else {
      newSelection.add(imageId);
    }
    setSelectedImageIds(newSelection);
  };

  const selectAllImages = () => {
    if (selectedImageIds.size === generatedImages.length) {
      setSelectedImageIds(new Set());
    } else {
      setSelectedImageIds(new Set(generatedImages.map(img => img.id)));
    }
  };

  const saveSelectedImages = async () => {
    if (selectedImageIds.size === 0) {
      toast.error('Please select at least one image to save');
      return;
    }

    try {
      const selectedImages = generatedImages.filter(img => selectedImageIds.has(img.id));
      
      // Update project with the first selected image as the main result
      if (selectedImages.length > 0) {
        await supabase
          .from('projects')
          .update({
            preview_url: selectedImages[0].url,
            status: 'completed'
          })
          .eq('id', projectId);
      }

      toast.success(`${selectedImages.length} image${selectedImages.length > 1 ? 's' : ''} saved successfully!`);
      onComplete();
    } catch (error) {
      console.error('Error saving images:', error);
      toast.error('Failed to save images');
    }
  };

  const downloadImage = (image: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `generated-image-${image.id}.png`;
    link.click();
    
    toast.success('Download started');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          AI Image Generation
          <Badge variant="secondary">Wan 2.1</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {scenes.length > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-800 mb-1">Generating images for:</div>
            <div className="text-sm text-blue-700">{scenes[0].description}</div>
          </div>
        )}

        <Button
          onClick={generateImages}
          disabled={isGenerating || scenes.length === 0}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <LoadingSpinner className="mr-2" size="sm" />
              Generating with Wan 2.1...
            </>
          ) : (
            "Generate Images"
          )}
        </Button>

        {isGenerating && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Creating AI images...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-gray-500 text-center">
              Using Wan 2.1 for high-quality generation...
            </p>
          </div>
        )}

        {generatedImages.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Generated Images ({generatedImages.length})</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={selectAllImages}
              >
                {selectedImageIds.size === generatedImages.length ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {generatedImages.map((image, index) => (
                <div
                  key={image.id}
                  className={`relative cursor-pointer rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 ${
                    selectedImageIds.has(image.id)
                      ? "ring-2 ring-blue-500 shadow-lg"
                      : "ring-1 ring-gray-200 hover:ring-gray-300"
                  }`}
                  onClick={() => toggleImageSelection(image.id)}
                >
                  <div className="aspect-square">
                    <img
                      src={image.url}
                      alt={`Generated ${image.id}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadImage(image);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>

                  {selectedImageIds.has(image.id) && (
                    <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                      <div className="bg-blue-500 rounded-full p-1">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedImageIds.size > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  {selectedImageIds.size} image{selectedImageIds.size > 1 ? 's' : ''} selected
                </p>
                <Button
                  onClick={saveSelectedImages}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Selected Images
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
