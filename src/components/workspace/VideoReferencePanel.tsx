import React, { useCallback, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Upload, X, Loader2, Plus, Play, Square, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { uploadReferenceImage } from '@/lib/storage';
import { toast } from 'sonner';

interface VideoReferencePoint {
  id: 'start' | 'end';
  label: string;
  description: string;
  file?: File | null;
  url?: string;
  enabled?: boolean;
  // Enhanced workspace metadata
  isWorkspaceAsset?: boolean;
  originalPrompt?: string;
  enhancedPrompt?: string;
  seed?: string;
  modelType?: string;
  quality?: 'fast' | 'high';
  generationParams?: Record<string, any>;
}

interface VideoReferencePanelProps {
  strength: number;
  onStrengthChange: (value: number) => void;
  onReferencesChange: (references: VideoReferencePoint[]) => void;
  onClear: () => void;
  // Controlled references
  references: VideoReferencePoint[];
}

export const VideoReferencePanel = ({
  strength,
  onStrengthChange,
  onReferencesChange,
  onClear,
  references
}: VideoReferencePanelProps) => {
  
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      return 'Please upload a valid image file (JPEG, PNG, WebP, or GIF)';
    }
    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }
    return null;
  };

  const handleFileUpload = useCallback(async (file: File, referenceId: string) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setUploading(prev => new Set([...prev, referenceId]));
    
    try {
      const result = await uploadReferenceImage(file, (progress) => {
        console.log(`Upload progress: ${Math.round((progress.loaded / progress.total) * 100)}%`);
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      const url = URL.createObjectURL(file);
      
      const updatedReferences = references.map(ref => 
        ref.id === referenceId 
          ? { ...ref, file, url, enabled: true }
          : ref
      );
      
      onReferencesChange(updatedReferences);
      toast.success(`${references.find(r => r.id === referenceId)?.label} reference uploaded successfully`);
      
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload reference image');
    } finally {
      setUploading(prev => {
        const newSet = new Set(prev);
        newSet.delete(referenceId);
        return newSet;
      });
    }
  }, [references, onReferencesChange]);

  const handleFileSelect = useCallback((referenceId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file, referenceId);
      }
    };
    input.click();
  }, [handleFileUpload]);

  const handleDrop = useCallback((e: React.DragEvent, referenceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(null);
    
    // Check for workspace asset data first
    const workspaceData = e.dataTransfer.getData('application/workspace-asset');
    if (workspaceData) {
      try {
        const assetData = JSON.parse(workspaceData);
        
        const updatedReferences = references.map(ref => 
          ref.id === referenceId 
            ? { 
                ...ref, 
                url: assetData.url,
                enabled: true,
                isWorkspaceAsset: true,
                originalPrompt: assetData.prompt,
                modelType: assetData.modelType,
                quality: assetData.quality,
                generationParams: assetData.generationParams,
                file: null // No file for workspace assets
              }
            : ref
        );
        
        onReferencesChange(updatedReferences);
        toast.success(`${references.find(r => r.id === referenceId)?.label} reference set from workspace`);
        return;
      } catch (error) {
        console.error('Failed to parse workspace asset data:', error);
      }
    }
    
    // Fall back to file handling
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      return validTypes.includes(file.type);
    });
    
    if (imageFile) {
      handleFileUpload(imageFile, referenceId);
    } else {
      toast.error('Please drag an image file or workspace asset');
    }
  }, [handleFileUpload, references, onReferencesChange]);

  const handleDragOver = useCallback((e: React.DragEvent, referenceId: string) => {
    e.preventDefault();
    setIsDragging(referenceId);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(null);
  }, []);

  const clearReference = useCallback((referenceId: string) => {
    const updatedReferences = references.map(ref => 
      ref.id === referenceId 
        ? { ...ref, file: null, url: undefined, enabled: false, isWorkspaceAsset: false }
        : ref
    );
    onReferencesChange(updatedReferences);
  }, [references, onReferencesChange]);

  const activeCount = references.filter(ref => ref.enabled).length;

  return (
    <TooltipProvider>
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-white">Video Reference</h3>
            {activeCount > 0 && (
              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                {activeCount} active @ {strength}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-white/70 hover:text-white hover:bg-white/10 p-1 h-6 text-xs"
          >
            Clear All
          </Button>
        </div>

        {/* Reference Points */}
        <div className="space-y-4">
          {references.map((reference) => (
            <div key={reference.id} className="space-y-2">
              {/* Reference Point Header */}
              <div className="flex items-center gap-2">
                {reference.id === 'start' ? (
                  <Play className="w-4 h-4 text-green-400" />
                ) : (
                  <Square className="w-4 h-4 text-red-400" />
                )}
                <Label className="text-sm text-white/80">{reference.label}</Label>
                {reference.enabled && (
                  <span className="text-xs text-white/60">({reference.description})</span>
                )}
              </div>

              {/* Upload Area */}
              <div
                className={`
                  relative border-2 border-dashed rounded-lg p-4 transition-all duration-200
                  ${reference.enabled 
                    ? 'border-green-500/50 bg-green-500/10' 
                    : 'border-white/20 hover:border-white/40'
                  }
                  ${isDragging === reference.id ? 'border-blue-400 bg-blue-400/10' : ''}
                `}
                onDrop={(e) => handleDrop(e, reference.id)}
                onDragOver={(e) => handleDragOver(e, reference.id)}
                onDragLeave={handleDragLeave}
              >
                {reference.enabled && reference.url ? (
                  /* Reference Image Preview */
                  <div className="relative">
                    <img
                      src={reference.url}
                      alt={reference.label}
                      className="w-full h-24 object-cover rounded-md"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => clearReference(reference.id)}
                      className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white p-1 h-6 w-6"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                    {reference.isWorkspaceAsset && (
                      <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-1 py-0.5 rounded">
                        Workspace
                      </div>
                    )}
                  </div>
                ) : (
                  /* Upload Button */
                  <div className="flex flex-col items-center justify-center space-y-2">
                    {uploading.has(reference.id) ? (
                      <Loader2 className="w-6 h-6 animate-spin text-white/60" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFileSelect(reference.id)}
                        className="h-12 w-12 rounded-full border-2 border-white/20 hover:border-white/40 hover:bg-white/10"
                      >
                        <Plus className="w-6 h-6 text-white/60" />
                      </Button>
                    )}
                    <div className="text-center">
                      <p className="text-xs text-white/60">
                        {uploading.has(reference.id) 
                          ? 'Uploading...' 
                          : 'Click to upload or drag image here'
                        }
                      </p>
                      <p className="text-xs text-white/40 mt-1">
                        {reference.description}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Strength Slider */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-white/80 flex items-center gap-1">
              Strength
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3 h-3 text-white/40" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Controls how much the reference image influences the video generation</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <span className="text-xs text-white/60">{strength}</span>
          </div>
          <Slider
            value={[strength]}
            onValueChange={(value) => onStrengthChange(value[0])}
            max={1}
            min={0}
            step={0.05}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-white/40">
            <span>Light</span>
            <span>Strong</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}; 