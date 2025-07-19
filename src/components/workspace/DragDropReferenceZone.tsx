
import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, X, User, Palette, Layout, Eye, Sparkles } from "lucide-react";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ReferenceItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  type: 'character' | 'style' | 'composition';
  file?: File;
  isWorkspaceAsset?: boolean;
  originalPrompt?: string;
}

interface DragDropReferenceZoneProps {
  activeReferences: ReferenceItem[];
  onReferencesChange: (references: ReferenceItem[]) => void;
  onReferenceImageChange?: (file: File | null, url: string, thumbnailUrl?: string) => void;
  className?: string;
}

const referenceConfig = {
  character: {
    icon: User,
    label: 'Character',
    description: 'Preserve faces & identity',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/50',
  },
  style: {
    icon: Palette,
    label: 'Style',
    description: 'Match art & technique',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/50',
  },
  composition: {
    icon: Layout,
    label: 'Layout',
    description: 'Copy structure & pose',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/50',
  }
};

export const DragDropReferenceZone = ({
  activeReferences,
  onReferencesChange,
  onReferenceImageChange,
  className
}: DragDropReferenceZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<'character' | 'style' | 'composition' | null>(null);

  const handleDrop = useCallback(async (e: React.DragEvent, targetType?: 'character' | 'style' | 'composition') => {
    e.preventDefault();
    setIsDragging(false);
    setDragTarget(null);
    
    // Handle workspace asset data
    const workspaceData = e.dataTransfer.getData('application/workspace-asset');
    if (workspaceData) {
      try {
        const assetData = JSON.parse(workspaceData);
        const newReference: ReferenceItem = {
          id: targetType || 'character',
          url: assetData.url,
          thumbnailUrl: assetData.thumbnailUrl,
          type: targetType || 'character',
          isWorkspaceAsset: true,
          originalPrompt: assetData.prompt
        };
        
        // Replace existing reference of same type or add new one
        const updatedReferences = activeReferences.filter(ref => ref.type !== newReference.type);
        updatedReferences.push(newReference);
        onReferencesChange(updatedReferences);
        
        // Also update legacy reference system for backwards compatibility
        if (targetType === 'character' || !targetType) {
          onReferenceImageChange?.(null, assetData.url, assetData.thumbnailUrl);
        }
        
        toast.success(`Set as ${referenceConfig[newReference.type].label.toLowerCase()} reference`);
        return;
      } catch (error) {
        console.error('Failed to parse workspace asset:', error);
      }
    }
    
    // Handle file drops
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      const fileUrl = URL.createObjectURL(imageFile);
      const newReference: ReferenceItem = {
        id: targetType || 'character',
        url: fileUrl,
        type: targetType || 'character',
        file: imageFile,
        isWorkspaceAsset: false
      };
      
      const updatedReferences = activeReferences.filter(ref => ref.type !== newReference.type);
      updatedReferences.push(newReference);
      onReferencesChange(updatedReferences);
      
      // Also update legacy reference system
      if (targetType === 'character' || !targetType) {
        onReferenceImageChange?.(imageFile, fileUrl);
      }
      
      toast.success(`Uploaded ${referenceConfig[newReference.type].label.toLowerCase()} reference`);
    } else {
      toast.error('Please drop an image file or workspace asset');
    }
  }, [activeReferences, onReferencesChange, onReferenceImageChange]);

  const handleDragOver = useCallback((e: React.DragEvent, targetType?: 'character' | 'style' | 'composition') => {
    e.preventDefault();
    setIsDragging(true);
    setDragTarget(targetType || null);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setDragTarget(null);
  }, []);

  const clearReference = useCallback((type: 'character' | 'style' | 'composition') => {
    const updatedReferences = activeReferences.filter(ref => ref.type !== type);
    onReferencesChange(updatedReferences);
    
    // Clear legacy reference if it's character type
    if (type === 'character') {
      onReferenceImageChange?.(null, '');
    }
    
    toast.success(`Cleared ${referenceConfig[type].label.toLowerCase()} reference`);
  }, [activeReferences, onReferencesChange, onReferenceImageChange]);

  const hasAnyReference = activeReferences.length > 0;
  const characterRef = activeReferences.find(ref => ref.type === 'character');

  // If we have references, show them in a compact horizontal layout
  if (hasAnyReference) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        {(['character', 'style', 'composition'] as const).map((type) => {
          const reference = activeReferences.find(ref => ref.type === type);
          const config = referenceConfig[type];
          const Icon = config.icon;
          
          if (!reference) return null;
          
          return (
            <div key={type} className="relative group">
              <div className={cn(
                "w-12 h-12 rounded-lg border-2 overflow-hidden transition-all",
                config.borderColor, config.bgColor
              )}>
                <img 
                  src={reference.thumbnailUrl || reference.url} 
                  alt={`${config.label} reference`} 
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Type indicator */}
              <div className="absolute -top-1 -left-1 w-4 h-4 bg-background border border-border rounded-full flex items-center justify-center">
                <Icon className={cn("w-2 h-2", config.color)} />
              </div>
              
              {/* Clear button */}
              <button
                onClick={() => clearReference(type)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2 h-2 text-destructive-foreground" />
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  // Show drop zone when no references
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "relative w-12 h-12 border-2 border-dashed rounded-lg transition-all cursor-pointer",
          "flex items-center justify-center",
          isDragging && dragTarget === null
            ? 'border-primary bg-primary/10 scale-105' 
            : 'border-muted-foreground/30 hover:border-muted-foreground hover:bg-muted/20'
        )}
        onDrop={(e) => handleDrop(e, 'character')}
        onDragOver={(e) => handleDragOver(e, 'character')}
        onDragLeave={handleDragLeave}
        title="Drop character reference here"
      >
        {isDragging && dragTarget === null ? (
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
        ) : (
          <User className="w-5 h-5 text-muted-foreground" />
        )}
        
        {isDragging && dragTarget === null && (
          <div className="absolute inset-0 bg-primary/20 rounded-lg flex items-center justify-center border-2 border-primary">
            <span className="text-xs font-medium text-primary">Drop here</span>
          </div>
        )}
      </div>
      
      <span className="text-sm text-muted-foreground">Drop reference image</span>
    </div>
  );
};
