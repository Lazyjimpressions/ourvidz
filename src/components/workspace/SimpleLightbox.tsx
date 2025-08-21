
import React, { useState, useEffect } from 'react';
import { X, Download, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SimpleLightboxItem {
  id: string;
  url: string;
  prompt: string;
  enhancedPrompt?: string;
  type: 'image' | 'video';
  quality?: string;
  aspectRatio?: string;
  modelType?: string;
  timestamp?: string;
  originalAssetId?: string;
  seed?: string;
  metadata?: Record<string, any>;
}

export interface SimpleLightboxProps {
  items: SimpleLightboxItem[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onEdit: (item: SimpleLightboxItem) => void;
  onDownload: (item: SimpleLightboxItem) => void;
}

export const SimpleLightbox: React.FC<SimpleLightboxProps> = ({
  items,
  currentIndex,
  onClose,
  onIndexChange,
  onEdit,
  onDownload
}) => {
  const currentItem = items[currentIndex];

  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    onIndexChange(newIndex);
  };

  const handleNext = () => {
    const newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    onIndexChange(newIndex);
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') handlePrevious();
    if (e.key === 'ArrowRight') handleNext();
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex]);

  const handleDownloadCurrent = async () => {
    if (!currentItem?.url) return;
    
    try {
      const response = await fetch(currentItem.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-${currentItem.type}-${currentItem.id}.${currentItem.type === 'image' ? 'png' : 'mp4'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (!currentItem) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center">
      {/* Navigation buttons */}
      {items.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Header with controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDownloadCurrent}
          className="bg-gray-700/80 hover:bg-gray-600"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onEdit(currentItem)}
          className="bg-blue-600/80 hover:bg-blue-700"
        >
          Edit
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          className="bg-gray-700/80 hover:bg-gray-600"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Counter */}
      {items.length > 1 && (
        <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
          {currentIndex + 1} / {items.length}
        </div>
      )}

      {/* Media content */}
      <div className="max-w-full max-h-full p-4">
        {currentItem.type === 'image' ? (
          <img
            src={currentItem.url}
            alt={currentItem.prompt || 'Generated image'}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <video
            src={currentItem.url}
            controls
            className="max-w-full max-h-full"
            autoPlay
          />
        )}
      </div>

      {/* Footer with prompt */}
      {currentItem.prompt && (
        <div className="absolute bottom-4 left-4 right-4 text-white text-center">
          <p className="text-sm bg-black/50 px-3 py-2 rounded">
            {currentItem.prompt}
          </p>
        </div>
      )}
    </div>
  );
};
