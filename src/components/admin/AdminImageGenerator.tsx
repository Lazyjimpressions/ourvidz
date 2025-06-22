
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Progress } from "@/components/ui/progress";
import { Image, Download, RefreshCw, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
}

interface AdminImageGeneratorProps {
  prompt: string;
  mode: "character" | "general";
  onImagesGenerated: (images: GeneratedImage[]) => void;
}

export const AdminImageGenerator = ({ 
  prompt, 
  mode,
  onImagesGenerated 
}: AdminImageGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImages, setCurrentImages] = useState<GeneratedImage[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);

  const generateImages = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setCurrentImages([]);
    setSelectedImageIds(new Set());
    setProgress(0);
    
    try {
      console.log('Admin generating images with prompt:', prompt);

      // Simulate image generation for admin testing
      const numberOfImages = 4;
      const mockImages: GeneratedImage[] = [];

      for (let i = 0; i < numberOfImages; i++) {
        setProgress((i / numberOfImages) * 100);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Create mock image URL (in real implementation, this would call an actual image generation API)
        const mockImageUrl = `https://picsum.photos/512/512?random=${Date.now()}-${i}`;
        
        mockImages.push({
          id: `admin-generated-${Date.now()}-${i}`,
          url: mockImageUrl,
          prompt,
          timestamp: new Date()
        });
      }

      setProgress(100);
      setCurrentImages(mockImages);
      
      toast({
        title: "Images Generated",
        description: `Successfully generated ${mockImages.length} ${mode === "character" ? "character" : "image"} variations for admin testing.`,
      });
      
    } catch (error) {
      console.error('Error generating images in admin mode:', error);
      
      toast({
        title: "Generation Failed",
        description: `Failed to generate images: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
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
    if (selectedImageIds.size === currentImages.length) {
      setSelectedImageIds(new Set());
    } else {
      setSelectedImageIds(new Set(currentImages.map(img => img.id)));
    }
  };

  const saveToResults = () => {
    const selectedImages = currentImages.filter(img => selectedImageIds.has(img.id));
    if (selectedImages.length > 0) {
      onImagesGenerated(selectedImages);
      setCurrentImages([]);
      setSelectedImageIds(new Set());
      
      toast({
        title: "Saved to Results",
        description: `${selectedImages.length} image${selectedImages.length > 1 ? 's' : ''} saved to test results.`,
      });
    }
  };

  const downloadImage = (image: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `admin-test-image-${image.id}.png`;
    link.click();
    
    toast({
      title: "Download Started",
      description: "Image download has started.",
    });
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Admin Image Generator
          <Badge variant="secondary">Test Mode</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={generateImages}
          disabled={!prompt.trim() || isGenerating}
          className="w-full transition-all duration-200 hover:scale-[1.02]"
          size="lg"
        >
          {isGenerating ? (
            <>
              <LoadingSpinner className="mr-2" size="sm" />
              Generating Test Images...
            </>
          ) : (
            `Generate ${mode === "character" ? "Character" : "Images"} (Test)`
          )}
        </Button>

        {isGenerating && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Creating test images...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-gray-500 text-center">
              Simulating image generation for admin testing...
            </p>
          </div>
        )}

        {currentImages.length > 0 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Generated Test Images</h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={selectAllImages}
                  className="transition-all duration-200"
                >
                  {selectedImageIds.size === currentImages.length ? "Deselect All" : "Select All"}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={generateImages}
                  className="transition-all duration-200 hover:scale-105"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Regenerate
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {currentImages.map((image, index) => (
                <div
                  key={image.id}
                  className={`relative cursor-pointer rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 ${
                    selectedImageIds.has(image.id)
                      ? "ring-2 ring-blue-500 shadow-lg"
                      : "ring-1 ring-gray-200 hover:ring-gray-300"
                  }`}
                  onClick={() => toggleImageSelection(image.id)}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="aspect-square">
                    <img
                      src={image.url}
                      alt={`Generated test image ${image.id}`}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                      loading="lazy"
                      onError={(e) => {
                        console.error('Test image load error:', image.id);
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
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
                      className="h-8 w-8 p-0 transition-all duration-200 hover:scale-110"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>

                  {selectedImageIds.has(image.id) && (
                    <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center animate-fade-in">
                      <div className="bg-blue-500 rounded-full p-1">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedImageIds.size > 0 && (
              <div className="space-y-2 animate-fade-in">
                <p className="text-sm text-gray-600">
                  {selectedImageIds.size} image{selectedImageIds.size > 1 ? 's' : ''} selected
                </p>
                <Button
                  onClick={saveToResults}
                  className="w-full transition-all duration-200 hover:scale-[1.02]"
                  variant="outline"
                >
                  Save Selected to Test Results
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
