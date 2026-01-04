import React, { useState, useEffect } from 'react';
import { Image, X, AlertCircle } from 'lucide-react';
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

  useEffect(() => {
    console.log('🖼️ MOBILE PREVIEW: File changed:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      isFileInstance: file instanceof File
    });
    
    if (!file) {
      // Clean up preview URL when file is cleared
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setIsLoading(false);
      setHasError(false);
      setErrorMessage(null);
      return;
    }

    // Create object URL for preview
    let objectUrl: string | null = null;
    setIsLoading(true);
    setHasError(false);
    setErrorMessage(null);

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Selected file is not an image');
      }

      // Create object URL
      objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Test if image actually loads
      const img = new Image();
      img.onload = () => {
        setIsLoading(false);
        setHasError(false);
        console.log('✅ MOBILE PREVIEW: Image loaded successfully');
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl!);
        setPreviewUrl(null);
        setIsLoading(false);
        setHasError(true);
        setErrorMessage('Image failed to load');
        const error = new Error('Image file is corrupted or unsupported');
        onError?.(error);
        console.error('❌ MOBILE PREVIEW: Image failed to load');
      };
      img.src = objectUrl;
    } catch (error) {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      setPreviewUrl(null);
      setIsLoading(false);
      setHasError(true);
      const err = error instanceof Error ? error : new Error('Failed to create preview');
      setErrorMessage(err.message);
      onError?.(err);
      console.error('❌ MOBILE PREVIEW: Error creating preview:', error);
    }

    // Cleanup function
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file, onError]);

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
              onError?.(new Error('Image display failed'));
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

