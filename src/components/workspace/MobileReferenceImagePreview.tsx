import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileReferenceImagePreviewProps {
  file: File | null;
  imageUrl?: string | null; // URL fallback (like desktop)
  onRemove?: () => void;
  onError?: (error: Error) => void;
  sizeClass?: string;
}

/**
 * Mobile-optimized reference image preview component
 * Uses URL.createObjectURL() for immediate display (like desktop),
 * with optional imageUrl fallback for workspace images.
 */
export const MobileReferenceImagePreview: React.FC<MobileReferenceImagePreviewProps> = ({
  file,
  imageUrl,
  onRemove,
  onError,
  sizeClass = "h-16 w-16"
}) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const onErrorRef = useRef(onError);
  const blobUrlRef = useRef<string | null>(null);

  // Keep onError ref updated without triggering re-renders
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Create blob URL for file (like desktop's URL.createObjectURL approach)
  // This is synchronous and reliable, unlike FileReader + Image validation
  const displayUrl = useMemo(() => {
    // Clean up previous blob URL when file/imageUrl changes
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
      console.log('📷 MOBILE REF: Cleaned up previous blob URL');
    }

    // Priority: file > imageUrl
    // If file exists, use it (for legacy workflow)
    if (file) {
      // Validate file type before creating URL
      const looksLikeImage = file.type
        ? file.type.startsWith('image/')
        : /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(file.name);

      if (!looksLikeImage) {
        console.warn('📷 MOBILE REF: File does not look like an image:', file.name, file.type);
        return null;
      }

      const url = URL.createObjectURL(file);
      blobUrlRef.current = url;
      console.log('📷 MOBILE REF: Created blob URL for file:', file.name);
      return url;
    }

    // Fall back to imageUrl if no file (preferred workflow - immediate upload)
    if (imageUrl) {
      console.log('📷 MOBILE REF: Using imageUrl (signed URL from immediate upload):', imageUrl.substring(0, 60) + '...');
      return imageUrl;
    }

    // Both are null - nothing to display
    console.log('📷 MOBILE REF: No file or imageUrl - clearing display');
    return null;
  }, [file, imageUrl]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  // Reset error state when file/url changes
  useEffect(() => {
    setHasError(false);
    setErrorMessage(null);
    console.log('📷 MOBILE REF: State reset - file:', !!file, 'imageUrl:', !!imageUrl);
  }, [file, imageUrl]);

  // Nothing to display
  if (!file && !imageUrl) {
    return null;
  }

  // No valid display URL could be created
  if (!displayUrl && !hasError) {
    return (
      <div className={`${sizeClass} border border-destructive/50 bg-destructive/10 rounded flex flex-col items-center justify-center p-2`}>
        <AlertCircle className="h-4 w-4 text-destructive mb-1" />
        <span className="text-[10px] text-destructive text-center">Invalid image</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`${sizeClass} relative border border-destructive/50 bg-destructive/10 rounded flex flex-col items-center justify-center p-2`}>
        <AlertCircle className="h-4 w-4 text-destructive mb-1" />
        <span className="text-[10px] text-destructive text-center">{errorMessage || 'Error'}</span>
        {onRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="absolute -top-1 -right-1 h-5 w-5 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`${sizeClass} relative border border-border/30 bg-muted/10 rounded overflow-hidden`}>
      <img
        src={displayUrl!}
        alt={file?.name || 'Reference image'}
        className="w-full h-full object-cover"
        onError={() => {
          setHasError(true);
          setErrorMessage('Image failed to load');
          onErrorRef.current?.(new Error('Image display failed'));
        }}
      />
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};

