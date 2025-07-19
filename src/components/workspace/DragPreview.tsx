
import React from 'react';
import { cn } from '@/lib/utils';

interface DragPreviewProps {
  imageUrl: string;
  isDragging: boolean;
  className?: string;
}

export const DragPreview = ({ imageUrl, isDragging, className }: DragPreviewProps) => {
  if (!isDragging) return null;

  return (
    <div className={cn(
      "fixed pointer-events-none z-50 transition-opacity",
      "opacity-80 scale-75 rotate-3 shadow-xl rounded-lg overflow-hidden",
      className
    )}>
      <img 
        src={imageUrl} 
        alt="Drag preview" 
        className="w-24 h-24 object-cover border-2 border-primary"
      />
    </div>
  );
};
