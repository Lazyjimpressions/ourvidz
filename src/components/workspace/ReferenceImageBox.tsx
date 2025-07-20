
import React, { useState } from 'react';
import { Upload, Image, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReferenceImageBoxProps {
  references: Array<{
    id: string;
    label: string;
    enabled: boolean;
    url?: string;
  }>;
  onClick: () => void;
  className?: string;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
}

export const ReferenceImageBox = ({ 
  references, 
  onClick, 
  className,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragOver = false
}: ReferenceImageBoxProps) => {
  const activeReferences = references.filter(ref => ref.enabled && ref.url);
  const hasReferences = activeReferences.length > 0;

  return (
    <button
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex items-center justify-center w-12 h-12 rounded-md border-2 border-dashed transition-all duration-200 hover:border-gray-500",
        isDragOver && "border-blue-400 bg-blue-400/20 scale-110",
        hasReferences 
          ? "border-green-500 bg-green-500/10" 
          : "border-gray-600 bg-gray-800/50 hover:bg-gray-700/50",
        className
      )}
    >
      {hasReferences ? (
        <div className="relative">
          <Image className="w-5 h-5 text-green-400" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
            {activeReferences.length}
          </div>
        </div>
      ) : (
        <Upload className={cn(
          "w-5 h-5 transition-colors",
          isDragOver ? "text-blue-400" : "text-gray-400"
        )} />
      )}
      
      {/* Drag Over Indicator */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-400/20 rounded-md flex items-center justify-center">
          <div className="text-blue-400 text-xs font-medium">Drop to Add</div>
        </div>
      )}
    </button>
  );
};
