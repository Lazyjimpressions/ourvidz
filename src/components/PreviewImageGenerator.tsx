
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { generateContent, waitForJobCompletion } from "@/lib/contentGeneration";
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
      
      // Generate 4 preview variations
      const numberOfPreviews = 4;
      const generationPromises = Array.from({ length: numberOfPreviews }, async (_, index) => {
        const { job } = await generateContent({
          jobType: 'preview',
          prompt: `${prompt}, preview style, concept art`,
          projectId: projectId,
          metadata: {
            variation: index + 1,
            width: 400,
            height: 300,
            outputFormat: 'PNG',
            style: 'preview'
          }
        });

        // Wait for completion
        const completedJob = await waitForJobCompletion(
          job.id,
          (status) => {
            console.log(`Preview ${index + 1} generation status:`, status);
          },
          90000 // 1.5 minutes timeout for previews
        );

        return {
          id: `preview-${Date.now()}-${index}`,
          url: completedJob.metadata?.imageUrl || "/placeholder.svg"
        };
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
