
import React, { useCallback, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, X, Image, Palette, Layout } from "lucide-react";
import { uploadReferenceImage } from '@/lib/storage';
import { toast } from 'sonner';

interface CompactReferenceUploadProps {
  references: Array<{
    id: string;
    label: string;
    enabled: boolean;
    url?: string;
    file?: File;
  }>;
  onReferencesChange: (references: any[]) => void;
}

export const CompactReferenceUpload = ({
  references,
  onReferencesChange
}: CompactReferenceUploadProps) => {
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = useCallback(async (file: File, referenceId: string) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file');
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadReferenceImage(file, () => {});
      if (result.error) throw new Error(result.error.message);

      const url = URL.createObjectURL(file);
      const updatedReferences = references.map(ref => 
        ref.id === referenceId 
          ? { ...ref, file, url, enabled: true }
          : ref
      );
      onReferencesChange(updatedReferences);
      toast.success(`${referenceId} reference uploaded`);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload reference image');
    } finally {
      setIsUploading(false);
    }
  }, [references, onReferencesChange]);

  const handleDrop = useCallback((e: React.DragEvent, referenceId: string) => {
    e.preventDefault();
    setIsDragging(null);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileUpload(imageFile, referenceId);
    }
  }, [handleFileUpload]);

  const handleFileSelect = (referenceId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFileUpload(file, referenceId);
    };
    input.click();
  };

  const handleClear = (referenceId: string) => {
    const updatedReferences = references.map(ref => 
      ref.id === referenceId 
        ? { ...ref, file: undefined, url: undefined, enabled: false }
        : ref
    );
    onReferencesChange(updatedReferences);
  };

  const getIcon = (id: string) => {
    switch (id) {
      case 'style': return Palette;
      case 'composition': return Layout;
      case 'character': return Image;
      default: return Image;
    }
  };

  return (
    <div className="flex items-center gap-2">
      {references.map((ref) => {
        const Icon = getIcon(ref.id);
        const hasImage = ref.enabled && ref.url;
        
        return (
          <div key={ref.id} className="relative">
            {hasImage ? (
              <div className="relative group">
                <div className="w-8 h-8 rounded border overflow-hidden">
                  <img 
                    src={ref.url} 
                    alt={ref.label}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => handleClear(ref.id)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-2 h-2 text-destructive-foreground" />
                </button>
              </div>
            ) : (
              <div
                className={`w-8 h-8 border border-dashed rounded flex items-center justify-center cursor-pointer transition-colors ${
                  isDragging === ref.id 
                    ? 'border-primary bg-primary/10' 
                    : 'border-muted-foreground/50 hover:border-muted-foreground hover:bg-muted/20'
                }`}
                onClick={() => handleFileSelect(ref.id)}
                onDrop={(e) => handleDrop(e, ref.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(ref.id);
                }}
                onDragLeave={() => setIsDragging(null)}
                title={`Upload ${ref.label.toLowerCase()} reference`}
              >
                {isUploading ? (
                  <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full" />
                ) : (
                  <Icon className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
