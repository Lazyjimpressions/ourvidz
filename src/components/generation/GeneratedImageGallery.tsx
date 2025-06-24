
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Download, RefreshCw, Check, X } from "lucide-react";
import { toast } from "sonner";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  status: string;
}

interface GeneratedImageGalleryProps {
  images: GeneratedImage[];
  isGenerating: boolean;
  prompt: string;
  onRegenerate: () => void;
  mode: 'image' | 'video';
}

export const GeneratedImageGallery = ({
  images,
  isGenerating,
  prompt,
  onRegenerate,
  mode
}: GeneratedImageGalleryProps) => {
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);

  // Simulate progress during generation
  useState(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  });

  const toggleImageSelection = (imageId: string) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(imageId)) {
      newSelection.delete(imageId);
    } else {
      newSelection.add(imageId);
    }
    setSelectedImages(newSelection);
  };

  const selectAllImages = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(images.map(img => img.id)));
    }
  };

  const downloadImage = async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `generated-${image.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Image downloaded successfully!");
    } catch (error) {
      toast.error("Failed to download image");
    }
  };

  const downloadSelected = () => {
    const selectedImageList = images.filter(img => selectedImages.has(img.id));
    selectedImageList.forEach(image => downloadImage(image));
    toast.success(`Downloading ${selectedImageList.length} images...`);
  };

  // Loading placeholder grid
  const renderLoadingGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="aspect-square bg-gray-800 rounded-lg flex items-center justify-center animate-pulse"
        >
          <LoadingSpinner size="md" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          {isGenerating ? `Generating ${mode === 'image' ? 'Images' : 'Videos'}...` : `Generated ${mode === 'image' ? 'Images' : 'Videos'}`}
        </h2>
        {prompt && (
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            "{prompt}"
          </p>
        )}
        <Badge variant="secondary" className="bg-gray-700 text-gray-300">
          Wan 2.1 AI Model
        </Badge>
      </div>

      {/* Progress Bar (when generating) */}
      {isGenerating && (
        <div className="max-w-md mx-auto space-y-3">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm text-gray-400">
            <span>Creating AI {mode === 'image' ? 'images' : 'videos'}...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <p className="text-xs text-gray-500 text-center">
            Using Wan 2.1 for high-quality generation...
          </p>
        </div>
      )}

      {/* Image Grid */}
      {isGenerating ? (
        renderLoadingGrid()
      ) : images.length > 0 ? (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllImages}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                {selectedImages.size === images.length ? "Deselect All" : "Select All"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerate}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            </div>
            
            {selectedImages.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">
                  {selectedImages.size} selected
                </span>
                <Button
                  onClick={downloadSelected}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download Selected
                </Button>
              </div>
            )}
          </div>

          {/* Image Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {images.map((image, index) => (
              <div
                key={image.id}
                className={`group relative aspect-square cursor-pointer rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 ${
                  selectedImages.has(image.id)
                    ? "ring-2 ring-blue-500 shadow-lg"
                    : "ring-1 ring-gray-600 hover:ring-gray-500"
                }`}
                onClick={() => toggleImageSelection(image.id)}
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  animation: 'fade-in 0.5s ease-out forwards'
                }}
              >
                <img
                  src={image.url}
                  alt={`Generated ${image.id}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                  onError={(e) => {
                    console.error('Generated image load error:', image.id);
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
                
                {/* Selection Overlay */}
                {selectedImages.has(image.id) && (
                  <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                    <div className="bg-blue-500 rounded-full p-2">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}

                {/* Hover Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadImage(image);
                    }}
                    className="h-8 w-8 p-0 bg-gray-700 hover:bg-gray-600"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>

                {/* Image Number Badge */}
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="bg-gray-800 text-gray-300 text-xs">
                    {index + 1}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Empty State */}
      {!isGenerating && images.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">
            No {mode === 'image' ? 'images' : 'videos'} generated yet. Enter a prompt and click generate to get started!
          </p>
        </div>
      )}
    </div>
  );
};
