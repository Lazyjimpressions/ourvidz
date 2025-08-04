import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [imageError, setImageError] = useState(false);
  const mountedRef = useRef(true);

  const loadImage = useCallback(async () => {
    if (!mountedRef.current) return;
    
    console.log('🖼️ InlineImageDisplay loading image:', { assetId, providedImageUrl, bucket: providedBucket });
    setImageError(false);
    
    try {
      // Check if provided URL is a full URL or storage path
      if (providedImageUrl) {
        if (providedImageUrl.startsWith('http://') || providedImageUrl.startsWith('https://')) {
          console.log('✅ Using full URL directly:', providedImageUrl);
          if (mountedRef.current) {
            setImageUrl(providedImageUrl);
          }
        } else {
          console.log('🔗 Converting storage path to signed URL:', providedImageUrl, 'bucket:', providedBucket);
          const url = await getSignedUrl(providedImageUrl, providedBucket);
          console.log('🔗 Received signed URL:', url);
          if (url && mountedRef.current) {
            setImageUrl(url);
          } else if (mountedRef.current) {
            throw new Error('Failed to get signed URL');
          }
        }
      } else if (assetId) {
        console.log('🔗 Getting signed URL for asset:', assetId, 'bucket:', providedBucket);
        const url = await getSignedUrl(assetId, providedBucket);
        console.log('🔗 Received signed URL for asset:', url);
        if (url && mountedRef.current) {
          setImageUrl(url);
        } else if (mountedRef.current) {
          throw new Error('Failed to get signed URL for asset');
        }
      }
    } catch (error) {
      console.error('❌ Failed to load image:', error);
      if (mountedRef.current) {
        setImageError(true);
      }
    }
  }, [assetId, providedImageUrl, providedBucket, getSignedUrl]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (assetId || providedImageUrl) {
      loadImage();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [loadImage]);

  const handleExpand = useCallback(() => {
    if (imageUrl && onExpand) {
      onExpand(imageUrl);
    }
  }, [imageUrl, onExpand]);

  const handleImageLoad = useCallback(() => {
    console.log('✅ Image loaded successfully:', imageUrl);
  }, [imageUrl]);

  const handleImageError = useCallback(() => {
    console.error('❌ Image failed to load:', imageUrl);
    if (mountedRef.current) {
      setImageError(true);
    }
  }, [imageUrl]);

  if (loading) {
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