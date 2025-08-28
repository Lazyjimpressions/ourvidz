import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, Settings } from 'lucide-react';
import { PromptDetailsSlider } from '@/components/lightbox/PromptDetailsSlider';

interface ImageLightboxProps {
  imageUrl: string | null;
  onClose: () => void;
  onDownload?: () => void;
  assetId?: string;
  assetType?: 'image' | 'video';
  quality?: string;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  imageUrl,
  onClose,
  onDownload,
  assetId,
  assetType = 'image',
  quality
}) => {
  if (!imageUrl) return null;

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = 'scene-image.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Dialog open={!!imageUrl} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl w-full h-[90vh] p-0">
        <div className="relative h-full flex flex-col">
          {/* Header */}
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            {assetId && (
              <PromptDetailsSlider
                assetId={assetId}
                assetType={assetType}
                quality={quality}
                trigger={
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-background/90 backdrop-blur-sm"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                }
              />
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              className="bg-background/90 backdrop-blur-sm"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="bg-background/90 backdrop-blur-sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center p-4">
            <img
              src={imageUrl}
              alt="Scene image"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};