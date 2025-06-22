import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PreviewImage {
  id: string;
  url: string;
  selected?: boolean;
}

interface PreviewImageGeneratorProps {
  prompt: string;
  projectId?: string;
  onImageSelected: (imageId: string) => void;
}

export const PreviewImageGenerator = ({ prompt, projectId, onImageSelected }: PreviewImageGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const generatePreviews = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setPreviewImages([]);
    setSelectedImageId(null);
    
    try {
      console.log('Generating preview images with Wan 2.1:', prompt);
      
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const numberOfPreviews = 4;
      const generationPromises = Array.from({ length: numberOfPreviews }, async (_, index) => {
        // Create a video record for preview image generation
        const { data: video, error: videoError } = await supabase
          .from('videos')
          .insert({
            project_id: projectId,
            user_id: user.id,
            status: 'draft',
            duration: 0, // 0 for images
            format: 'png'
          })
          .select()
          .single();

        if (videoError) throw videoError;

        // Queue preview generation job using existing infrastructure
        const { data, error } = await supabase.functions.invoke('queue-job', {
          body: {
            jobType: 'preview',
            videoId: video.id,
            projectId: projectId,
            metadata: {
              prompt: `${prompt}, preview style, concept art`,
              variation: index + 1
            }
          }
        });

        if (error) throw error;

        // Poll for completion
        return new Promise<PreviewImage>((resolve, reject) => {
          const pollInterval = setInterval(async () => {
            try {
              const { data: updatedVideo, error: pollError } = await supabase
                .from('videos')
                .select('status, preview_url')
                .eq('id', video.id)
                .single();

              if (pollError) throw pollError;

              console.log(`Preview ${index + 1} generation status:`, updatedVideo.status);

              if (updatedVideo.status === 'preview_ready' && updatedVideo.preview_url) {
                clearInterval(pollInterval);
                resolve({
                  id: `preview-${Date.now()}-${index}`,
                  url: updatedVideo.preview_url
                });
              } else if (updatedVideo.status === 'failed') {
                clearInterval(pollInterval);
                reject(new Error('Preview generation failed'));
              }
            } catch (error) {
              clearInterval(pollInterval);
              reject(error);
            }
          }, 3000); // Poll every 3 seconds

          // Timeout after 90 seconds for previews
          setTimeout(() => {
            clearInterval(pollInterval);
            reject(new Error('Preview generation timeout'));
          }, 90000);
        });
      });

      const results = await Promise.allSettled(generationPromises);
      
      const successfulPreviews: PreviewImage[] = results
        .filter((result): result is PromiseFulfilledResult<PreviewImage> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);

      setPreviewImages(successfulPreviews);
      setIsGenerating(false);
      
      if (successfulPreviews.length > 0) {
        toast.success(`Generated ${successfulPreviews.length} preview images using Wan 2.1`);
      } else {
        throw new Error('All preview generations failed');
      }
      
    } catch (error) {
      console.error('Error generating previews:', error);
      setIsGenerating(false);
      toast.error(`Failed to generate previews: ${error.message}`);
    }
  };

  const handleImageSelect = (imageId: string) => {
    setSelectedImageId(imageId);
    onImageSelected(imageId);
  };

  const handleRegeneratePreview = () => {
    generatePreviews();
  };

  if (!prompt) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={generatePreviews}
          disabled={isGenerating}
          className="bg-blue-500 hover:bg-blue-600 text-white w-full sm:w-auto"
        >
          {isGenerating ? (
            <>
              <LoadingSpinner className="mr-2" size="sm" />
              Generating Preview Images...
            </>
          ) : (
            "Generate Preview Images"
          )}
        </Button>
        <Badge variant="secondary">Wan 2.1</Badge>
      </div>

      {previewImages.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              AI Preview Images — Choose one to continue
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRegeneratePreview}
              disabled={isGenerating}
              className="text-blue-600 hover:text-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Generate New Preview
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {previewImages.map((image) => (
              <div
                key={image.id}
                className={`relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200 ${
                  selectedImageId === image.id
                    ? "ring-4 ring-blue-500 shadow-lg"
                    : "ring-2 ring-gray-200 hover:ring-gray-300"
                }`}
                onClick={() => handleImageSelect(image.id)}
              >
                <img
                  src={image.url}
                  alt={`AI Preview ${image.id}`}
                  className="w-full h-32 object-cover"
                  onError={(e) => {
                    console.error('Preview image load error:', image.id);
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
                {selectedImageId === image.id && (
                  <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
