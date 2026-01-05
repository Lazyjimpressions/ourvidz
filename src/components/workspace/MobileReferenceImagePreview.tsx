import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileReferenceImagePreviewProps {
  file: File | null;
  onRemove?: () => void;
  onError?: (error: Error) => void;
  sizeClass?: string;
}

/**
 * Mobile-optimized reference image preview component
 * Shows thumbnail preview of selected image file with error handling
 */
export const MobileReferenceImagePreview: React.FC<MobileReferenceImagePreviewProps> = ({
  file,
  onRemove,
  onError,
  sizeClass = "h-16 w-16"
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Track the current file to prevent re-processing the same file
  const currentFileRef = useRef<File | null>(null);
  const onErrorRef = useRef(onError);
  
  // Keep onError ref updated without triggering re-renders
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    // Skip if this is the same file we already processed
    if (file === currentFileRef.current) {
      return;
    }
    
    currentFileRef.current = file;
    
    if (!file) {
      // Clean up preview URL when file is cleared
      setPreviewUrl(null);
      setIsLoading(false);
      setHasError(false);
      setErrorMessage(null);
      return;
    }

    let isMounted = true;
    
    setIsLoading(true);
    setHasError(false);
    setErrorMessage(null);

    // Use FileReader to create a data URL instead of blob URL
    // Data URLs don't expire on iOS Safari (unlike blob URLs which can expire after ~1 minute)
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (!isMounted) return;
      
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        setIsLoading(false);
        setHasError(true);
        setErrorMessage('Failed to read file');
        onErrorRef.current?.(new Error('Failed to read file data'));
        return;
      }
      
      // Test if image actually loads
      const img = new window.Image();
      img.onload = () => {
        if (isMounted) {
          setPreviewUrl(dataUrl);
          setIsLoading(false);
          setHasError(false);
        }
      };
      img.onerror = () => {
        if (isMounted) {
          setPreviewUrl(null);
          setIsLoading(false);
          setHasError(true);
          setErrorMessage('Image failed to load');
          onErrorRef.current?.(new Error('Image file is corrupted or unsupported'));
        }
      };
      img.src = dataUrl;
    };
    
    reader.onerror = () => {
      if (isMounted) {
        setPreviewUrl(null);
        setIsLoading(false);
        setHasError(true);
        setErrorMessage('Failed to read file');
        onErrorRef.current?.(new Error('Failed to read file'));
      }
    };
    
    console.info('📷 Reference image selected', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validate file type before reading (iOS Safari may provide an empty MIME type)
    const looksLikeImage = file.type
      ? file.type.startsWith('image/')
      : /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(file.name);

    if (!looksLikeImage) {
      setIsLoading(false);
      setHasError(true);
      setErrorMessage('Selected file is not a supported image');
      onErrorRef.current?.(new Error('Selected file is not a supported image'));
      return;
    }
    
    reader.readAsDataURL(file);

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [file]); // Only depend on file, not onError

  if (!file) {
    return null;
  }

  if (hasError) {
    return (
      <div className={`${sizeClass} border border-destructive/50 bg-destructive/10 rounded flex flex-col items-center justify-center p-2`}>
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

  if (isLoading) {
    return (
      <div className={`${sizeClass} border border-border/30 bg-muted/10 rounded flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className={`${sizeClass} relative border border-border/30 bg-muted/10 rounded overflow-hidden`}>
      {previewUrl && (
        <>
          <img
            src={previewUrl}
            alt={file.name}
            className="w-full h-full object-cover"
            onError={() => {
              setHasError(true);
              setErrorMessage('Image failed to display');
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
        </>
      )}
    </div>
  );
};

