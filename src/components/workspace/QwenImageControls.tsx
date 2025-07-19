
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Play } from "lucide-react";
import { GenerationFormat } from '@/types/generation';
import { DragDropReferenceZone } from './DragDropReferenceZone';
import { DragPreview } from './DragPreview';

interface QwenImageControlsProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onSwitchToVideo?: () => void;
  isVideoMode?: boolean;
  numImages: number;
  setNumImages: (count: number) => void;
  // Reference image props
  referenceImage?: File | null;
  referenceImageUrl?: string;
  onReferenceImageChange?: (file: File | null, url: string, thumbnailUrl?: string) => void;
  onClearReference?: () => void;
  selectedMode?: GenerationFormat;
  // Multi-reference props
  activeReferences?: any[];
  onReferencesChange?: (references: any[]) => void;
}

export const QwenImageControls = ({
  prompt,
  setPrompt,
  onGenerate,
  isGenerating,
  onSwitchToVideo,
  isVideoMode = false,
  numImages,
  setNumImages,
  referenceImage,
  referenceImageUrl,
  onReferenceImageChange,
  onClearReference,
  selectedMode,
  activeReferences = [],
  onReferencesChange
}: QwenImageControlsProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreviewUrl, setDragPreviewUrl] = useState<string>('');
  
  const isVideo = selectedMode?.includes('video') || isVideoMode;

  const getPlaceholderText = () => {
    if (isVideo) {
      return "A woman walking through a bustling city street at sunset";
    }
    return "A serene mountain landscape at golden hour";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setDragPreviewUrl('');
    
    // Handle workspace asset data
    const workspaceData = e.dataTransfer.getData('application/workspace-asset');
    if (workspaceData) {
      try {
        const assetData = JSON.parse(workspaceData);
        
        // Set as character reference
        onReferenceImageChange?.(null, assetData.url, assetData.thumbnailUrl);
        
        // Also update multi-reference system
        if (onReferencesChange) {
          const newReference = {
            id: 'character',
            type: 'character',
            url: assetData.url,
            thumbnailUrl: assetData.thumbnailUrl,
            isWorkspaceAsset: true,
            originalPrompt: assetData.prompt
          };
          
          const updatedReferences = activeReferences.filter(ref => ref.type !== 'character');
          updatedReferences.push(newReference);
          onReferencesChange(updatedReferences);
        }
        
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
      onReferenceImageChange?.(imageFile, fileUrl);
      
      // Also update multi-reference system
      if (onReferencesChange) {
        const newReference = {
          id: 'character',
          type: 'character',
          url: fileUrl,
          file: imageFile,
          isWorkspaceAsset: false
        };
        
        const updatedReferences = activeReferences.filter(ref => ref.type !== 'character');
        updatedReferences.push(newReference);
        onReferencesChange(updatedReferences);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    // Show preview if dragging workspace asset
    const workspaceData = e.dataTransfer.getData('application/workspace-asset');
    if (workspaceData) {
      try {
        const assetData = JSON.parse(workspaceData);
        setDragPreviewUrl(assetData.thumbnailUrl || assetData.url);
      } catch (error) {
        // Ignore parsing errors during drag
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setDragPreviewUrl('');
  };

  return (
    <div className="space-y-4">
      {/* Reference Zone */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Reference Images</span>
        <DragDropReferenceZone
          activeReferences={activeReferences}
          onReferencesChange={onReferencesChange || (() => {})}
          onReferenceImageChange={onReferenceImageChange}
        />
      </div>

      {/* Main Input Area with Drag & Drop */}
      <div
        className={`relative transition-all duration-200 ${
          isDragging 
            ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]' 
            : ''
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={getPlaceholderText()}
              className="bg-transparent border-gray-600 text-white placeholder:text-gray-400 resize-none focus:border-gray-400"
              disabled={isGenerating}
              rows={3}
              style={{ minHeight: '80px' }}
            />
          </div>

          <Button
            onClick={onGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="bg-white text-black hover:bg-gray-100 h-12 px-6 text-sm font-medium"
          >
            {isGenerating ? (
              <>
                <div className="w-3 h-3 border border-black/30 border-t-black rounded-full animate-spin mr-2" />
                Generating
              </>
            ) : (
              <>
                {isVideo ? <Play className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate
              </>
            )}
          </Button>
        </div>

        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/20 rounded-lg border-2 border-primary border-dashed flex items-center justify-center z-10">
            <div className="text-center">
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-2 animate-pulse" />
              <span className="text-lg font-medium text-primary">Drop to set as reference</span>
            </div>
          </div>
        )}
      </div>

      {/* Drag Preview */}
      <DragPreview 
        imageUrl={dragPreviewUrl}
        isDragging={isDragging && !!dragPreviewUrl}
      />
    </div>
  );
};
