import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import useSignedImageUrls from '@/hooks/useSignedImageUrls';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InlineImageDisplayProps {
  assetId: string;
  imageUrl?: string;
  bucket?: string;
  onExpand?: (imageUrl: string) => void;
}

export const InlineImageDisplay: React.FC<InlineImageDisplayProps> = ({
  assetId,
  imageUrl: providedImageUrl,
  bucket: providedBucket,
  onExpand
}) => {
  const { getSignedUrl, loading } = useSignedImageUrls();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      console.log('🖼️ InlineImageDisplay loading image:', { assetId, providedImageUrl });
      setImageError(false);
      
      try {
        // Check if provided URL is a full URL or storage path
        if (providedImageUrl) {
          if (providedImageUrl.startsWith('http://') || providedImageUrl.startsWith('https://')) {
            console.log('✅ Using full URL directly:', providedImageUrl);
            setImageUrl(providedImageUrl);
            setImageLoading(false); // Reset loading state for direct URLs
          } else {
            console.log('🔗 Converting storage path to signed URL:', providedImageUrl);
            const url = await getSignedUrl(providedImageUrl, providedBucket);
            if (url) {
              setImageUrl(url);
              setImageLoading(false); // Reset loading state after getting signed URL
            } else {
              throw new Error('Failed to get signed URL');
            }
          }
        } else if (assetId) {
          console.log('🔗 Getting signed URL for asset:', assetId);
          const url = await getSignedUrl(assetId, providedBucket);
          if (url) {
            setImageUrl(url);
            setImageLoading(false);
          } else {
            throw new Error('Failed to get signed URL for asset');
          }
        }
      } catch (error) {
        console.error('❌ Failed to load image:', error);
        setImageError(true);
        setImageLoading(false);
      }
    };

    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (imageLoading) {
        console.warn('⚠️ Image loading timeout reached');
        setImageError(true);
        setImageLoading(false);
      }
    }, 10000); // 10 second timeout

    if (assetId || providedImageUrl) {
      loadImage();
    }

    return () => clearTimeout(timeout);
  }, [assetId, providedImageUrl, providedBucket, getSignedUrl]);

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