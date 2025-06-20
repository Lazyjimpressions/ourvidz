
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Image, Download, RefreshCw } from "lucide-react";
import { GeneratedImage } from "@/pages/ImageCreation";

interface ImageGeneratorProps {
  prompt: string;
  enhancedPrompt: string;
  mode: "character" | "general";
  onImagesGenerated: (images: GeneratedImage[]) => void;
}

export const ImageGenerator = ({ 
  prompt, 
  enhancedPrompt, 
  mode, 
  onImagesGenerated 
}: ImageGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImages, setCurrentImages] = useState<GeneratedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const generateImages = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setCurrentImages([]);
    setSelectedImageId(null);
    
    // Simulate image generation - in real app, this would call your AI service
    setTimeout(() => {
      const mockImages: GeneratedImage[] = [
        {
          id: "1",
          url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop",
          prompt,
          enhancedPrompt,
          timestamp: new Date(),
          isCharacter: mode === "character"
        },
        {
          id: "2", 
          url: "https://images.unsplash.com/photo-1494790108755-2616b612b692?w=400&h=400&fit=crop",
          prompt,
          enhancedPrompt,
          timestamp: new Date(),
          isCharacter: mode === "character"
        },
        {
          id: "3",
          url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
          prompt,
          enhancedPrompt,
          timestamp: new Date(),
          isCharacter: mode === "character"
        },
        {
          id: "4",
          url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
          prompt,
          enhancedPrompt,
          timestamp: new Date(),
          isCharacter: mode === "character"
        }
      ];
      
      setCurrentImages(mockImages);
      setIsGenerating(false);
    }, 3000);
  };

  const saveToLibrary = () => {
    if (currentImages.length > 0) {
      onImagesGenerated(currentImages);
      setCurrentImages([]);
      setSelectedImageId(null);
    }
  };

  const downloadImage = (image: GeneratedImage) => {
    // In real app, this would download the actual image
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `generated-image-${image.id}.jpg`;
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Image Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={generateImages}
          disabled={!prompt.trim() || isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <LoadingSpinner className="mr-2" size="sm" />
              Generating Images...
            </>
          ) : (
            `Generate ${mode === "character" ? "Character" : "Images"}`
          )}
        </Button>

        {isGenerating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Processing prompt...</span>
              <span>Step 1/3</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full w-1/3 transition-all duration-500"></div>
            </div>
          </div>
        )}

        {currentImages.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Generated Variations</h3>
              <Button variant="outline" size="sm" onClick={generateImages}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {currentImages.map((image) => (
                <div
                  key={image.id}
                  className={`relative cursor-pointer rounded-lg overflow-hidden transition-all ${
                    selectedImageId === image.id
                      ? "ring-2 ring-blue-500 shadow-lg"
                      : "ring-1 ring-gray-200 hover:ring-gray-300"
                  }`}
                  onClick={() => setSelectedImageId(image.id)}
                >
                  <img
                    src={image.url}
                    alt={`Generated ${image.id}`}
                    className="w-full h-32 object-cover"
                  />
                  
                  <div className="absolute top-2 right-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadImage(image);
                      }}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>

                  {selectedImageId === image.id && (
                    <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                      <Badge variant="secondary">Selected</Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button
              onClick={saveToLibrary}
              className="w-full"
              variant="outline"
            >
              Save to Library
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
