
import React, { useState, useCallback, useRef } from 'react';
import { Upload, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDrag } from '@/contexts/DragContext';

interface EnhancedReferenceImageBoxProps {
  references: Array<{
    id: string;
    label: string;
    enabled: boolean;
    url?: string;
  }>;
  onClick: () => void;
  onDragHover: (isHovering: boolean) => void;
  className?: string;
}

export const EnhancedReferenceImageBox = ({ 
  references, 
  onClick, 
  onDragHover,
  className 
}: EnhancedReferenceImageBoxProps) => {
  const { isDragging, draggedAsset } = useDrag();
  const [draggedOver, setDraggedOver] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();

  const activeReferences = references.filter(ref => ref.enabled && ref.url);
  const hasReferences = activeReferences.length > 0;

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    // Check if dragging a workspace asset
    const workspaceData = e.dataTransfer.getData('application/workspace-asset');
    if (workspaceData || isDragging) {
      setDraggedOver(true);
      
      // Clear any existing timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      
      // Set timeout to open modal after hover delay
      hoverTimeoutRef.current = setTimeout(() => {
        onDragHover(true);
      }, 400);
    }
  }, [isDragging, onDragHover]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    // Only trigger leave if actually leaving the component
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDraggedOver(false);
      
      // Clear hover timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      
      // Delay closing modal to allow transition to modal
      setTimeout(() => {
        onDragHover(false);
      }, 200);
    }
  }, [onDragHover]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOver(false);
    
    // Clear timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Open modal for drop handling
    onClick();
  }, [onClick]);

  return (
    <button
      onClick={onClick}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex items-center justify-center w-12 h-12 rounded-md border-2 border-dashed transition-colors hover:border-gray-500",
        hasReferences 
          ? "border-green-500 bg-green-500/10" 
          : "border-gray-600 bg-gray-800/50 hover:bg-gray-700/50",
        draggedOver && (isDragging || draggedAsset) && "border-blue-400 bg-blue-400/20 scale-105",
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
          "w-5 h-5 text-gray-400 transition-colors",
          draggedOver && (isDragging || draggedAsset) && "text-blue-400"
        )} />
      )}
    </button>
  );
};
