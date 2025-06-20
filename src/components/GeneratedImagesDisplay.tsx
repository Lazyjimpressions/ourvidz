
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, Check, Save, Eye } from "lucide-react";
import { GeneratedImage } from "@/pages/ImageCreation";
import { toast } from "@/hooks/use-toast";

interface GeneratedImagesDisplayProps {
  images: GeneratedImage[];
  mode: "character" | "general";
  onImagesSaved: (images: GeneratedImage[]) => void;
}

export const GeneratedImagesDisplay = ({ 
  images, 
  mode, 
  onImagesSaved 
}: GeneratedImagesDisplayProps) => {
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

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
    if (selectedImageIds.size === images.length) {
      setSelectedImageIds(new Set());
    } else {
      setSelectedImageIds(new Set(images.map(img => img.id)));
    }
  };

  const saveToLibrary = () => {
    const selectedImages = images.filter(img => selectedImageIds.has(img.id));
    if (selectedImages.length > 0) {
      onImagesSaved(selectedImages);
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
    link.download = `generated-${mode}-${image.id}.jpg`;
    link.click();
    
    toast({
      title: "Download Started",
      description: "Image download has started.",
    });
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Choose Your Favorites ({images.length} generated)
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={selectAllImages}
                className="transition-all duration-200"
              >
                {selectedImageIds.size === images.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
          </div>
          <p className="text-gray-600">
            Select the images you'd like to save to your library
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((image, index) => (
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
                    alt={`Generated ${image.id}`}
                    className="w-full h-full object-cover transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(image);
                    }}
                    className="h-8 w-8 p-0 transition-all duration-200 hover:scale-110"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
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
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg animate-fade-in">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedImageIds.size} selected
                </Badge>
                <span className="text-sm text-gray-600">
                  Ready to save to your library
                </span>
              </div>
              <Button
                onClick={saveToLibrary}
                className="transition-all duration-200 hover:scale-[1.02]"
              >
                <Save className="h-4 w-4 mr-2" />
                Save to Library
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="max-w-4xl max-h-[90vh] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-lg overflow-hidden animate-scale-in">
              <div className="aspect-square max-h-[70vh]">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.characterName || "Generated image"}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="p-4 space-y-2">
                {selectedImage.characterName && (
                  <h3 className="font-semibold">{selectedImage.characterName}</h3>
                )}
                <p className="text-sm text-gray-600">{selectedImage.prompt}</p>
                <div className="flex justify-between items-center">
                  <Badge variant={selectedImage.isCharacter ? "default" : "secondary"}>
                    {selectedImage.isCharacter ? "Character" : "Image"}
                  </Badge>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadImage(selectedImage)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedImage(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
