
import React, { useCallback, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { uploadReferenceImage } from '@/lib/storage';
import { toast } from 'sonner';

interface ReferenceImageButtonProps {
  mode: 'image' | 'video';
  referenceImage?: File | null;
  referenceImageUrl?: string;
  onReferenceImageChange?: (file: File | null, url: string) => void;
  onClearReference?: () => void;
  size?: 'small' | 'medium';
  label?: string;
}

export const ReferenceImageButton = ({
  mode,
  referenceImage,
  referenceImageUrl,
  onReferenceImageChange,
  onClearReference,
  size = 'small',
  label
}: ReferenceImageButtonProps) => {
  const [isUploading, setIsUploading] = useState(false);

  const buttonSize = size === 'small' ? (mode === 'image' ? 'w-10 h-10' : 'w-8 h-8') : 'w-16 h-16';
  const iconSize = size === 'small' ? (mode === 'image' ? 'w-4 h-4' : 'w-3 h-3') : 'w-6 h-6';

  const validateFile = (file: File): string | null => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      return 'Please upload a valid image file (JPEG, PNG, WebP, or GIF)';
    }
    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }
    return null;
  };

  const handleFileUpload = useCallback(async (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadReferenceImage(file, (progress) => {
        console.log(`Upload progress: ${Math.round((progress.loaded / progress.total) * 100)}%`);
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      const url = URL.createObjectURL(file);
      onReferenceImageChange?.(file, url);
      toast.success('Reference image uploaded successfully');
      
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload reference image');
    } finally {
      setIsUploading(false);
    }
  }, [onReferenceImageChange]);

  const handleFileSelect = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    };
    input.click();
  }, [handleFileUpload]);

  if (referenceImage && referenceImageUrl) {
    return (
      <div className="relative group">
        <div className={`${buttonSize} rounded border border-border overflow-hidden bg-muted`}>
          <img 
            src={referenceImageUrl} 
            alt={label || "Reference"} 
            className="w-full h-full object-cover"
          />
        </div>
        <button
          onClick={onClearReference}
          className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="Clear reference"
        >
          <X className="w-2.5 h-2.5 text-destructive-foreground" />
        </button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      onClick={handleFileSelect}
      disabled={isUploading}
      className={`${buttonSize} p-0 bg-transparent border border-dashed border-gray-600 hover:border-gray-400 rounded`}
      title={`Upload ${label || 'reference image'}`}
    >
      {isUploading ? (
        <Loader2 className={`${iconSize} animate-spin text-muted-foreground`} />
      ) : (
        <Upload className={`${iconSize} text-gray-400`} />
      )}
    </Button>
  );
};
