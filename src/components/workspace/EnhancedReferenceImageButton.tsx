
import React, { useCallback, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Image, Eye, Copy } from "lucide-react";
import { uploadReferenceImage } from '@/lib/storage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EnhancedReferenceImageButtonProps {
  referenceImage?: File | null;
  referenceImageUrl?: string;
  onReferenceChange: (file: File | null, url: string) => void;
  onClear: () => void;
  onPreview?: () => void;
  className?: string;
  size?: 'compact' | 'standard' | 'large';
  showPresets?: boolean;
}

export const EnhancedReferenceImageButton = ({
  referenceImage,
  referenceImageUrl,
  onReferenceChange,
  onClear,
  onPreview,
  className = "",
  size = 'standard',
  showPresets = false
}: EnhancedReferenceImageButtonProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showHoverPreview, setShowHoverPreview] = useState(false);

  const sizeClasses = {
    compact: 'w-16 h-16',
    standard: 'w-24 h-24',
    large: 'w-32 h-32'
  };

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

  const hasReference = referenceImage || referenceImageUrl;

  if (hasReference) {
    return (
      <div className={cn("relative group", className)}>
        <div 
          className={cn(
            "rounded-lg border border-border overflow-hidden bg-muted transition-all duration-200",
            sizeClasses[size],
            "hover:border-primary hover:shadow-lg cursor-pointer"
          )}
          onMouseEnter={() => setShowHoverPreview(true)}
          onMouseLeave={() => setShowHoverPreview(false)}
          onClick={onPreview}
        >
          <img 
            src={referenceImageUrl} 
            alt="Reference" 
            className="w-full h-full object-cover"
          />
          
          {/* Action Buttons Overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
            {onPreview && (
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview();
                }}
                className="h-7 w-7 p-0"
                title="Preview reference"
              >
                <Eye className="w-3 h-3" />
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="h-7 w-7 p-0"
              title="Clear reference"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Reference Label */}
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
            Reference
          </span>
        </div>

        {/* Quick Action Presets */}
        {showPresets && (
          <div className="absolute -right-2 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-16 text-xs bg-background/90 backdrop-blur-sm"
              title="Exact copy - 100% strength"
            >
              <Copy className="w-3 h-3 mr-1" />
              Exact
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-16 text-xs bg-background/90 backdrop-blur-sm"
              title="Modify elements - 70% strength"
            >
              Modify
            </Button>
          </div>
        )}

        {/* Hover Preview */}
        {showHoverPreview && size !== 'large' && (
          <div className="absolute z-50 -top-2 left-full ml-2 pointer-events-none">
            <div className="w-48 h-48 bg-background border border-border rounded-lg overflow-hidden shadow-lg">
              <img
                src={referenceImageUrl}
                alt="Reference Preview"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer",
        sizeClasses[size],
        isDragging 
          ? 'border-primary bg-primary/10 scale-105' 
          : 'border-muted-foreground/50 hover:border-muted-foreground hover:bg-muted/20',
        className
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <Button
        variant="ghost"
        onClick={handleFileSelect}
        disabled={isUploading}
        className="w-full h-full p-0 bg-transparent border-0 hover:bg-transparent flex flex-col items-center justify-center gap-2"
        title="Upload reference image - Click or drag image here"
      >
        {isUploading ? (
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <Image className="w-6 h-6 text-muted-foreground" />
            <div className="text-center">
              <div className="text-xs font-medium text-muted-foreground">Add Reference</div>
              <div className="text-xs text-muted-foreground/70">Drag or Click</div>
            </div>
          </>
        )}
      </Button>
      
      {isDragging && (
        <div className="absolute inset-0 bg-primary/20 rounded-lg flex items-center justify-center border-2 border-primary">
          <span className="text-sm font-medium text-primary">Drop here</span>
        </div>
      )}
    </div>
  );
};
