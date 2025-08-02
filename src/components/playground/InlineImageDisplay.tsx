import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import useSignedImageUrls from '@/hooks/useSignedImageUrls';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InlineImageDisplayProps {
  assetId: string;
  imageUrl?: string;
  onExpand?: (imageUrl: string) => void;
}

export const InlineImageDisplay: React.FC<InlineImageDisplayProps> = ({
  assetId,
  imageUrl: providedImageUrl,
  onExpand
}) => {
  const { getSignedUrl, loading } = useSignedImageUrls();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      console.log('🖼️ InlineImageDisplay loading image:', { assetId, providedImageUrl });
      
      try {
        // Use provided image URL if available, otherwise get signed URL
        if (providedImageUrl) {
          console.log('✅ Using provided image URL:', providedImageUrl);
          setImageUrl(providedImageUrl);
        } else {
          console.log('🔗 Getting signed URL for asset:', assetId);
          const url = await getSignedUrl(assetId);
          setImageUrl(url);
        }
      } catch (error) {
        console.error('❌ Failed to load image:', error);
        setImageError(true);
      }
    };

    if (assetId || providedImageUrl) {
      loadImage();
    }
  }, [assetId, providedImageUrl, getSignedUrl]);

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const handleExpand = () => {
    if (imageUrl && onExpand) {
      onExpand(imageUrl);
    }
  };

  if (loading || imageLoading) {
    return (
      <Card className="mt-2 p-3 max-w-xs bg-muted/30">
        <div className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          <span className="text-xs text-muted-foreground">Loading image...</span>
        </div>
      </Card>
    );
  }

  if (imageError || !imageUrl) {
    return (
      <Card className="mt-2 p-3 max-w-xs bg-destructive/10 border-destructive/20">
        <div className="text-xs text-destructive">Failed to load image</div>
      </Card>
    );
  }

  return (
    <div className="mt-2 relative group cursor-pointer" onClick={handleExpand}>
      <Card className="overflow-hidden bg-background/50 border-primary/20 hover:border-primary/40 transition-colors">
        <div className="relative">
          <img
            src={imageUrl}
            alt="Generated scene"
            className="w-full max-w-xs rounded-lg"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{ maxHeight: '200px', objectFit: 'cover' }}
          />
          
          {/* Expand overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Button
              variant="secondary"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Eye className="h-3 w-3 mr-1" />
              Expand
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};