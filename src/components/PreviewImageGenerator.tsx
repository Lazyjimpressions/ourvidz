
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { RefreshCw } from "lucide-react";

interface PreviewImage {
  id: string;
  url: string;
  selected?: boolean;
}

interface PreviewImageGeneratorProps {
  prompt: string;
  onImageSelected: (imageId: string) => void;
}

export const PreviewImageGenerator = ({ prompt, onImageSelected }: PreviewImageGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const generatePreviews = async () => {
    setIsGenerating(true);
    
    // Simulate preview generation - in real app, this would call your image generation service
    setTimeout(() => {
      const mockImages: PreviewImage[] = [
        { id: "1", url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=300&h=200&fit=crop" },
        { id: "2", url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&h=200&fit=crop" },
        { id: "3", url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300&h=200&fit=crop" },
        { id: "4", url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&h=200&fit=crop" },
      ];
      setPreviewImages(mockImages);
      setIsGenerating(false);
    }, 3000);
  };

  const handleImageSelect = (imageId: string) => {
    setSelectedImageId(imageId);
    onImageSelected(imageId);
  };

  const handleRegeneratePreview = () => {
    setPreviewImages([]);
    setSelectedImageId(null);
    generatePreviews();
  };

  if (!prompt) {
    return null;
  }

  return (
    <div className="space-y-6">
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

      {previewImages.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Preview Images — Choose one to continue
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRegeneratePreview}
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
                  alt={`Preview ${image.id}`}
                  className="w-full h-32 object-cover"
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
