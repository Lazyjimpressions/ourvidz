import React, { useState, useCallback } from 'react';
import { Upload } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ReferenceImageUploadProps {
  referenceImage: File | null;
  onReferenceImageChange: (file: File | null) => void;
  referenceStrength: number;
  onReferenceStrengthChange: (strength: number) => void;
  disabled?: boolean;
}

export const ReferenceImageUpload: React.FC<ReferenceImageUploadProps> = ({
  referenceImage,
  onReferenceImageChange,
  referenceStrength,
  onReferenceStrengthChange,
  disabled = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  // Handle file upload
  const handleFileUpload = useCallback((file: File) => {
    if (file.type.startsWith('image/')) {
      onReferenceImageChange(file);
    }
  }, [onReferenceImageChange]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload, disabled]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  // Clear reference image
  const handleClearReference = useCallback(() => {
    onReferenceImageChange(null);
  }, [onReferenceImageChange]);

  return (
    <div className="flex flex-col items-center gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`w-12 h-12 border-2 border-dashed rounded flex items-center justify-center cursor-pointer transition-colors ${
                disabled 
                  ? 'border-muted bg-muted/20 cursor-not-allowed' 
                  : isDragOver 
                    ? 'border-primary bg-primary/10' 
                    : referenceImage 
                      ? 'border-green-500 bg-green-500/10' 
                      : 'border-border hover:border-primary'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !disabled && document.getElementById('reference-upload')?.click()}
            >
              {referenceImage ? (
                <div className="relative w-full h-full">
                  <img
                    src={URL.createObjectURL(referenceImage)}
                    alt="Reference"
                    className="w-full h-full object-cover rounded"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearReference();
                    }}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-destructive/80"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <Upload className={`w-4 h-4 ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`} />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{disabled ? 'Reference upload disabled' : 'Upload reference image'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Reference Strength Slider - Compact */}
      {referenceImage && !disabled && (
        <div className="flex flex-col items-center gap-0.5">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={referenceStrength}
            onChange={(e) => onReferenceStrengthChange(parseFloat(e.target.value))}
            className="w-8 h-1 bg-border rounded appearance-none cursor-pointer slider"
          />
          <span className="text-xs text-muted-foreground">
            {Math.round(referenceStrength * 100)}%
          </span>
        </div>
      )}

      {/* Hidden file input */}
      <input
        id="reference-upload"
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}; 