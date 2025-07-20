
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
  onAutoOpen?: () => void;
  className?: string;
  isDragOver?: boolean;
}

export const ReferenceImageBox = ({ 
  references, 
  onClick, 
  onAutoOpen,
  className,
  isDragOver = false
}: ReferenceImageBoxProps) => {
  const [dragOverTimer, setDragOverTimer] = useState<NodeJS.Timeout | null>(null);
  
  const activeReferences = references.filter(ref => ref.enabled && ref.url);
  const hasReferences = activeReferences.length > 0;
  const primaryReference = activeReferences[0]; // Show first active reference as thumbnail

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    
    // Clear any existing timer
    if (dragOverTimer) {
      clearTimeout(dragOverTimer);
    }
    
    // Set a timer to auto-open the modal after a brief delay
    const timer = setTimeout(() => {
      if (onAutoOpen) {
        onAutoOpen();
      }
    }, 500); // 500ms delay before auto-opening
    
    setDragOverTimer(timer);
  };

  const handleDragLeave = () => {
    // Clear the timer if user drags away quickly
    if (dragOverTimer) {
      clearTimeout(dragOverTimer);
      setDragOverTimer(null);
    }
  };

  return (
    <button
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        "flex items-center justify-center rounded-md border-2 border-dashed transition-all duration-200 hover:border-gray-500 relative overflow-hidden",
        isDragOver && "border-blue-400 bg-blue-400/20 scale-105",
        hasReferences 
          ? "border-green-500 bg-green-500/10" 
          : "border-gray-600 bg-gray-800/50 hover:bg-gray-700/50",
        // Default size if no className provided
        className || "w-12 h-12"
      )}
    >
      {hasReferences && primaryReference ? (
        <div className="relative w-full h-full">
          <img 
            src={primaryReference.url} 
            alt="Reference"
            className="w-full h-full object-cover rounded-sm"
          />
          {activeReferences.length > 1 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
              {activeReferences.length}
            </div>
          )}
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
