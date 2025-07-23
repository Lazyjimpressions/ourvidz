
import React, { useCallback } from 'react';
import { toast } from 'sonner';

interface DragDropData {
  type: 'file' | 'workspace-asset';
  data: any;
}

interface EnhancedDragDropHandlerProps {
  onDrop: (data: DragDropData) => void;
  onDragStateChange: (isDragging: boolean) => void;
  acceptedTypes?: string[];
  children: React.ReactNode;
  className?: string;
}

export const EnhancedDragDropHandler = ({
  onDrop,
  onDragStateChange,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  children,
  className = ''
}: EnhancedDragDropHandlerProps) => {
  const validateFile = useCallback((file: File): boolean => {
    if (!acceptedTypes.includes(file.type)) {
      toast.error(`Invalid file type. Accepted: ${acceptedTypes.join(', ')}`);
      return false;
    }
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return false;
    }
    
    return true;
  }, [acceptedTypes]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we have valid data
    const hasFiles = e.dataTransfer.types.includes('Files');
    const hasWorkspaceAsset = e.dataTransfer.types.includes('application/workspace-asset');
    
    if (hasFiles || hasWorkspaceAsset) {
      e.dataTransfer.dropEffect = 'copy';
      onDragStateChange(true);
    }
  }, [onDragStateChange]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only trigger if leaving the component entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      onDragStateChange(false);
    }
  }, [onDragStateChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragStateChange(false);

    // Priority 1: Check for workspace asset data
    const workspaceData = e.dataTransfer.getData('application/workspace-asset');
    if (workspaceData) {
      try {
        const assetData = JSON.parse(workspaceData);
        
        // Validate workspace asset
        if (!assetData.url || !assetData.url.startsWith('http')) {
          toast.error('Invalid workspace asset URL');
          return;
        }
        
        onDrop({
          type: 'workspace-asset',
          data: assetData
        });
        return;
      } catch (error) {
        console.error('Failed to parse workspace asset data:', error);
        toast.error('Invalid workspace asset data');
        return;
      }
    }

    // Priority 2: Check for files
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => acceptedTypes.includes(file.type));
    
    if (imageFile) {
      if (validateFile(imageFile)) {
        onDrop({
          type: 'file',
          data: imageFile
        });
      }
      return;
    }

    // No valid data found
    toast.error('Please drop a valid image file or workspace asset');
  }, [onDrop, acceptedTypes, validateFile, onDragStateChange]);

  return (
    <div
      className={className}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
    </div>
  );
};
