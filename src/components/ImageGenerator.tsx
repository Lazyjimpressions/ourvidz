import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Progress } from "@/components/ui/progress";
import { Image, Download, RefreshCw, Check } from "lucide-react";
import { GenerationOptions } from "@/components/GenerationOptions";
import { useGeneration } from "@/hooks/useGeneration";
import { GeneratedImage } from "@/pages/ImageCreation";
import type { GenerationFormat, GenerationQuality } from "@/types/generation";
import { toast } from "@/hooks/use-toast";

interface ImageGeneratorProps {
  prompt: string;
  enhancedPrompt: string;
  mode: "character" | "general";
  projectId?: string;
  characterId?: string;
  onImagesGenerated: (images: GeneratedImage[]) => void;
}

export const ImageGenerator = ({ 
  prompt, 
  enhancedPrompt, 
  mode, 
  projectId,
  characterId,
  onImagesGenerated 
}: ImageGeneratorProps) => {
  const [format, setFormat] = useState<GenerationFormat>('image');
  const [quality, setQuality] = useState<GenerationQuality>('fast');
  const [currentImages, setCurrentImages] = useState<GeneratedImage[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  const { generate, isGenerating, useGenerationStatus, getEstimatedCredits } = useGeneration({
    onSuccess: (data) => {
      setGeneratedId(data.id);
      toast({
        title: "Generation Started",
        description: "Your images are being generated with Wan 2.1.",
      });
    },
    onError: (error) => {
      console.error('Generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate images. Please try again.",
        variant: "destructive",
      });
    }
  });

  const { data: generationData } = useGenerationStatus(generatedId, format);

  // Handle generation completion - use type assertion since we know format is 'image'
  if (generationData?.status === 'completed' && generatedId) {
    const imageData = generationData as any; // Type assertion for image data
    
    if (imageData.image_url) {
      const newImage: GeneratedImage = {
        id: generatedId,
        url: imageData.image_url,
        prompt,
        enhancedPrompt,
        timestamp: new Date(),
        isCharacter: mode === "character"
      };
      
      setCurrentImages(prev => [...prev, newImage]);
      setProgress(100);
      setGeneratedId(null);
      
      toast({
        title: "Images Generated",
        description: `Successfully generated image using Wan 2.1.`,
      });
    }
  }

  const generateImages = async () => {
    if (!prompt.trim()) return;
    
    setCurrentImages([]);
    setSelectedImageIds(new Set());
    setProgress(0);
    
    const imagePrompt = enhancedPrompt || prompt;
    console.log('Generating images with functional approach:', imagePrompt);

    generate({
      format,
      quality,
      prompt: imagePrompt,
      projectId,
      metadata: {
        source: 'image_generator',
        mode: mode,
        characterId: characterId
      }
    });
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

  const saveToLibrary = () => {
    const selectedImages = currentImages.filter(img => selectedImageIds.has(img.id));
    if (selectedImages.length > 0) {
      onImagesGenerated(selectedImages);
      setCurrentImages([]);
      setSelectedImageIds(new Set());
      
      toast({
        title: "Saved to Library",
        description: `${selectedImages.length} image${selectedImages.length > 1 ? 's' : ''} saved to your library.`,
      });
    }
  };

  const downloadImage = (image: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `generated-image-${image.id}.png`;
    link.click();
    
    toast({
      title: "Download Started",
      description: "Image download has started.",
    });
  };

  const estimatedCredits = getEstimatedCredits(format, quality);

  return (
    <Card className="h-fit bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Image className="h-5 w-5" />
          AI Image Generator
          <Badge variant="secondary" className="bg-gray-700 text-gray-300">Wan 2.1</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <GenerationOptions
          selectedFormat={format}
          selectedQuality={quality}
          onFormatChange={setFormat}
          onQualityChange={setQuality}
        />

        <Button
          onClick={generateImages}
          disabled={!prompt.trim() || isGenerating}
          className="w-full transition-all duration-200 hover:scale-[1.02] bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          {isGenerating ? (
            <>
              <LoadingSpinner className="mr-2" size="sm" />
              Generating with Wan 2.1...
            </>
          ) : (
            `Generate ${mode === "character" ? "Character" : "Images"} (${estimatedCredits} credits)`
          )}
        </Button>

        {isGenerating && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Creating AI images...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-gray-500 text-center">
              Using Wan 2.1 for high-quality generation...
            </p>
          </div>
        )}

        {currentImages.length > 0 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">Generated Variations</h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={selectAllImages}
                  className="transition-all duration-200 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  {selectedImageIds.size === currentImages.length ? "Deselect All" : "Select All"}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={generateImages}
                  className="transition-all duration-200 hover:scale-105 border-gray-600 text-gray-300 hover:bg-gray-700"
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
                      : "ring-1 ring-gray-600 hover:ring-gray-500"
                  }`}
                  onClick={() => toggleImageSelection(image.id)}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="aspect-square">
                    <img
                      src={image.url}
                      alt={`Generated ${image.id}`}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                      loading="lazy"
                      onError={(e) => {
                        console.error('Generated image load error:', image.id);
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
                      className="h-8 w-8 p-0 transition-all duration-200 hover:scale-110 bg-gray-700 hover:bg-gray-600"
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
                <p className="text-sm text-gray-400">
                  {selectedImageIds.size} image{selectedImageIds.size > 1 ? 's' : ''} selected
                </p>
                <Button
                  onClick={saveToLibrary}
                  className="w-full transition-all duration-200 hover:scale-[1.02] bg-gray-700 hover:bg-gray-600 text-white"
                  variant="outline"
                >
                  Save Selected to Library
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
