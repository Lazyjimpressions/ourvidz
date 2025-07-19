
import React, { useCallback, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Image } from "lucide-react";
import { uploadReferenceImage } from '@/lib/storage';
import { toast } from 'sonner';

interface ReferenceImageButtonProps {
  referenceImage?: File | null;
  referenceImageUrl?: string;
  onReferenceChange: (file: File | null, url: string) => void;
  onClear: () => void;
  className?: string;
}

export const ReferenceImageButton = ({
  referenceImage,
  referenceImageUrl,
  onReferenceChange,
  onClear,
  className = ""
}: ReferenceImageButtonProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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
      onReferenceChange(file, url);
      toast.success('Reference image uploaded successfully');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload reference image');
    } finally {
      setIsUploading(false);
    }
  }, [onReferenceChange]);

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    // Check for workspace asset data first
    const workspaceData = e.dataTransfer.getData('application/workspace-asset');
    if (workspaceData) {
      try {
        const assetData = JSON.parse(workspaceData);
        onReferenceChange(null, assetData.url);
        toast.success('Reference image set from workspace');
        return;
      } catch (error) {
        console.error('Failed to parse workspace asset data:', error);
      }
    }
    
    // Fall back to file handling
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      return validTypes.includes(file.type);
    });
    
    if (imageFile) {
      handleFileUpload(imageFile);
    } else {
      toast.error('Please drag an image file or workspace asset');
    }
  }, [handleFileUpload, onReferenceChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  if (referenceImage || referenceImageUrl) {
    return (
      <div className={`relative group ${className}`}>
        <div className="w-16 h-16 rounded-lg border border-border overflow-hidden bg-muted">
          <img 
            src={referenceImageUrl} 
            alt="Reference" 
            className="w-full h-full object-cover"
          />
        </div>
        <button
          onClick={onClear}
          className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="Clear reference"
        >
          <X className="w-3 h-3 text-destructive-foreground" />
        </button>
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-1 py-0.5 rounded-b-lg">
          Reference
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-16 h-16 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer ${
        isDragging 
          ? 'border-primary bg-primary/10 scale-105' 
          : 'border-muted-foreground/50 hover:border-muted-foreground hover:bg-muted/20'
      } ${className}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <Button
        variant="ghost"
        onClick={handleFileSelect}
        disabled={isUploading}
        className="w-full h-full p-0 bg-transparent border-0 hover:bg-transparent"
        title="Upload reference image - Click or drag image here"
      >
        {isUploading ? (
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Image className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground/70">Ref</span>
          </div>
        )}
      </Button>
      {isDragging && (
        <div className="absolute inset-0 bg-primary/20 rounded-lg flex items-center justify-center border-2 border-primary">
          <span className="text-xs font-medium text-primary">Drop here</span>
        </div>
      )}
    </div>
  );
};
