/**
 * ClipCanvas Component
 *
 * Horizontal canvas showing all clips in a scene with drag-and-drop reordering.
 * Includes add clip drop zone and chain connectors between clips.
 */

import React, { useState, useRef, useCallback } from 'react';
import { StoryboardClip, StoryboardScene } from '@/types/storyboard';
import { ClipTile } from './ClipTile';
import { Button } from '@/components/ui/button';
import { Plus, ImageIcon, Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClipCanvasProps {
  scene: StoryboardScene;
  clips: StoryboardClip[];
  selectedClipId?: string;
  onClipSelect: (clip: StoryboardClip) => void;
  onAddClip: () => void;
  onReorderClips?: (fromIndex: number, toIndex: number) => void;
  onDropImage?: (imageUrl: string, source: 'library' | 'upload') => void;
  isAddingClip?: boolean;
}

export const ClipCanvas: React.FC<ClipCanvasProps> = ({
  scene,
  clips,
  selectedClipId,
  onClipSelect,
  onAddClip,
  onReorderClips,
  onDropImage,
  isAddingClip = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDroppingImage, setIsDroppingImage] = useState(false);

  // Handle clip drag start
  const handleDragStart = useCallback((index: number) => (e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, []);

  // Handle drag over another clip
  const handleDragOver = useCallback((index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && index !== draggedIndex) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  // Handle drop on another clip (reorder)
  const handleDrop = useCallback((targetIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex && onReorderClips) {
      onReorderClips(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, onReorderClips]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  // Handle drop zone (for new images)
  const handleDropZoneDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Check if it's an image being dragged (from library)
    const hasImage = e.dataTransfer.types.includes('text/uri-list') ||
                     e.dataTransfer.types.includes('Files');
    if (hasImage) {
      setIsDroppingImage(true);
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDropZoneDragLeave = useCallback(() => {
    setIsDroppingImage(false);
  }, []);

  const handleDropZoneDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDroppingImage(false);

    // Check for library image URL
    const imageUrl = e.dataTransfer.getData('text/uri-list') ||
                     e.dataTransfer.getData('text/plain');

    if (imageUrl && imageUrl.startsWith('http') && onDropImage) {
      onDropImage(imageUrl, 'library');
      return;
    }

    // Check for file upload
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      // Handle file upload - would need to upload to storage first
      // For now, just trigger add clip
      onAddClip();
    }
  }, [onDropImage, onAddClip]);

  // Calculate scene progress
  const totalDuration = clips.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
  const targetDuration = scene.target_duration_seconds || 30;
  const progressPercent = Math.min((totalDuration / targetDuration) * 100, 100);

  return (
    <div className="bg-gray-900/30 border-b border-gray-800">
      {/* Scene header */}
      <div className="px-4 py-2 border-b border-gray-800/50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-200">
            {scene.title || 'Untitled Scene'}
          </h3>
          {scene.description && (
            <p className="text-xs text-gray-500 mt-0.5 max-w-md truncate">
              {scene.description}
            </p>
          )}
        </div>

        {/* Duration progress */}
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-400">
            <span className="font-medium">{totalDuration.toFixed(1)}s</span>
            <span className="text-gray-600"> / {targetDuration}s</span>
          </div>
          <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                progressPercent >= 100 ? 'bg-green-500' : 'bg-blue-500'
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Clips strip */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1 p-4 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
        onDragEnd={handleDragEnd}
      >
        {clips.length === 0 ? (
          // Empty state with drop zone
          <div
            className={cn(
              'flex-1 min-h-[120px] rounded-lg border-2 border-dashed',
              'flex flex-col items-center justify-center gap-2',
              'transition-colors',
              isDroppingImage
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-700 hover:border-gray-600'
            )}
            onDragOver={handleDropZoneDragOver}
            onDragLeave={handleDropZoneDragLeave}
            onDrop={handleDropZoneDrop}
          >
            <div className="flex items-center gap-2 text-gray-500">
              <ImageIcon className="w-5 h-5" />
              <span className="text-sm">Drop an image to start</span>
            </div>
            <span className="text-xs text-gray-600">or</span>
            <Button
              variant="outline"
              size="sm"
              onClick={onAddClip}
              disabled={isAddingClip}
              className="border-gray-700 hover:border-gray-600"
            >
              {isAddingClip ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add First Clip
            </Button>
          </div>
        ) : (
          <>
            {/* Clip tiles */}
            {clips.map((clip, index) => (
              <div
                key={clip.id}
                className={cn(
                  'relative',
                  dragOverIndex === index && draggedIndex !== null && 'ring-2 ring-blue-500 rounded-lg'
                )}
              >
                <ClipTile
                  clip={clip}
                  isSelected={clip.id === selectedClipId}
                  showConnector={index > 0}
                  onClick={() => onClipSelect(clip)}
                  onDragStart={onReorderClips ? handleDragStart(index) : undefined}
                  onDragOver={onReorderClips ? handleDragOver(index) : undefined}
                  onDrop={onReorderClips ? handleDrop(index) : undefined}
                />
              </div>
            ))}

            {/* Add clip drop zone */}
            <div
              className={cn(
                'flex-shrink-0 w-32 min-h-[96px] rounded-lg border-2 border-dashed',
                'flex flex-col items-center justify-center gap-1',
                'transition-colors cursor-pointer',
                isDroppingImage
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 hover:border-gray-600'
              )}
              onClick={onAddClip}
              onDragOver={handleDropZoneDragOver}
              onDragLeave={handleDropZoneDragLeave}
              onDrop={handleDropZoneDrop}
            >
              {isAddingClip ? (
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5 text-gray-500" />
                  <span className="text-[10px] text-gray-500">Add Clip</span>
                  <span className="text-[8px] text-gray-600">or drop image</span>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClipCanvas;
