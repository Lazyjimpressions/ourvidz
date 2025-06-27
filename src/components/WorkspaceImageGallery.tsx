
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, RotateCcw, X } from "lucide-react";
import { WorkspaceContentModal } from "@/components/WorkspaceContentModal";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  quality: 'fast' | 'high';
}

interface WorkspaceImageGalleryProps {
  images: GeneratedImage[];
  onRemove: () => void;
  onRegenerateItem: (itemId: string) => void;
}

export const WorkspaceImageGallery = ({ images, onRemove, onRegenerateItem }: WorkspaceImageGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

  const handleDownload = async (image: GeneratedImage, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-image-${image.id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleRegenerate = (image: GeneratedImage, e: React.MouseEvent) => {
    e.stopPropagation();
    onRegenerateItem(image.id);
  };

  return (
    <>
      <div className="text-center">
        {/* Image Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group cursor-pointer bg-gray-900 rounded-lg overflow-hidden"
              onClick={() => setSelectedImage(image)}
            >
              <img
                src={image.url}
                alt="Generated content"
                className="w-full h-64 object-cover hover:scale-105 transition-transform duration-200"
              />
              
              {/* Hover Controls */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200">
                {/* Download Button - Upper Right */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 hover:bg-black/70 text-white p-2"
                  onClick={(e) => handleDownload(image, e)}
                >
                  <Download className="w-4 h-4" />
                </Button>

                {/* Regenerate Button - Lower Right */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 hover:bg-black/70 text-white p-2"
                  onClick={(e) => handleRegenerate(image, e)}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Remove All Button */}
        <Button
          variant="ghost"
          onClick={onRemove}
          className="w-10 h-10 p-0 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Modal for Full Resolution */}
      {selectedImage && (
        <WorkspaceContentModal
          content={selectedImage}
          type="image"
          onClose={() => setSelectedImage(null)}
        />
      )}
    </>
  );
};
