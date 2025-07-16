import React, { useCallback, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, AlertCircle } from "lucide-react";
import { uploadReferenceImage } from '@/lib/storage';
import { toast } from 'sonner';

interface EnhancedReferenceUploadProps {
  mode: 'image' | 'video';
  // Image mode props
  referenceImage?: File | null;
  referenceImageUrl?: string;
  onReferenceImageChange?: (file: File | null, url: string) => void;
  onClearReference?: () => void;
  // Video mode props
  startReferenceImage?: File | null;
  startReferenceImageUrl?: string;
  endReferenceImage?: File | null;
  endReferenceImageUrl?: string;
  onStartReferenceChange?: (file: File | null, url: string) => void;
  onEndReferenceChange?: (file: File | null, url: string) => void;
  onClearStartReference?: () => void;
  onClearEndReference?: () => void;
}

export const EnhancedReferenceUpload = ({
  mode,
  referenceImage,
  referenceImageUrl,
  onReferenceImageChange,
  onClearReference,
  startReferenceImage,
  startReferenceImageUrl,
  endReferenceImage,
  endReferenceImageUrl,
  onStartReferenceChange,
  onEndReferenceChange,
  onClearStartReference,
  onClearEndReference,
}: EnhancedReferenceUploadProps) => {
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

  const handleFileUpload = useCallback(async (file: File, target: 'main' | 'start' | 'end' = 'main') => {
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
      
      if (mode === 'image') {
        onReferenceImageChange?.(file, url);
        toast.success('Reference image uploaded successfully');
      } else {
        if (target === 'start') {
          onStartReferenceChange?.(file, url);
          toast.success('Start reference image uploaded successfully');
        } else if (target === 'end') {
          onEndReferenceChange?.(file, url);
          toast.success('End reference image uploaded successfully');
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload reference image');
    } finally {
      setIsUploading(false);
    }
  }, [mode, onReferenceImageChange, onStartReferenceChange, onEndReferenceChange]);

  const handleFileSelect = useCallback((target: 'main' | 'start' | 'end' = 'main') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file, target);
      }
    };
    input.click();
  }, [handleFileUpload]);

  const handleDrop = useCallback((e: React.DragEvent, target: 'main' | 'start' | 'end' = 'main') => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileUpload(imageFile, target);
    } else {
      toast.error('Please drop an image file');
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const ReferenceButton = ({ 
    hasImage, 
    imageUrl, 
    onClick, 
    onClear, 
    label 
  }: { 
    hasImage: boolean; 
    imageUrl?: string; 
    onClick: () => void; 
    onClear: () => void;
    label?: string;
  }) => (
    <div className="flex items-center">
      {hasImage && imageUrl ? (
        <div className="relative group">
          <div className="w-10 h-10 rounded border border-border overflow-hidden bg-muted">
            <img 
              src={imageUrl} 
              alt={label || "Reference"} 
              className="w-full h-full object-cover"
            />
          </div>
          <button
            onClick={onClear}
            className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            title="Clear reference"
          >
            <X className="w-2 h-2 text-destructive-foreground" />
          </button>
        </div>
      ) : (
        <Button
          variant="ghost"
          onClick={onClick}
          disabled={isUploading}
          onDrop={(e) => handleDrop(e, mode === 'image' ? 'main' : (label?.includes('Start') ? 'start' : 'end'))}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`w-10 h-10 p-0 bg-transparent border border-dashed transition-colors ${
            isDragging 
              ? 'border-primary bg-primary/10' 
              : 'border-muted-foreground/50 hover:border-muted-foreground'
          }`}
          title={`Upload ${label || 'reference image'}`}
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
        </Button>
      )}
    </div>
  );

  if (mode === 'image') {
    return (
      <ReferenceButton
        hasImage={!!(referenceImage && referenceImageUrl)}
        imageUrl={referenceImageUrl}
        onClick={() => handleFileSelect('main')}
        onClear={() => onClearReference?.()}
      />
    );
  }

  // Video mode - start and end references
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center gap-1">
        <ReferenceButton
          hasImage={!!(startReferenceImage && startReferenceImageUrl)}
          imageUrl={startReferenceImageUrl}
          onClick={() => handleFileSelect('start')}
          onClear={() => onClearStartReference?.()}
          label="Start"
        />
        <span className="text-xs text-muted-foreground">Start</span>
      </div>
      
      <div className="flex flex-col items-center gap-1">
        <ReferenceButton
          hasImage={!!(endReferenceImage && endReferenceImageUrl)}
          imageUrl={endReferenceImageUrl}
          onClick={() => handleFileSelect('end')}
          onClear={() => onClearEndReference?.()}
          label="End"
        />
        <span className="text-xs text-muted-foreground">End</span>
      </div>
    </div>
  );
};