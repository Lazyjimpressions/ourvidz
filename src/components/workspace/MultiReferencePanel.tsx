import React, { useCallback, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Upload, X, Loader2, InfoIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { uploadReferenceImage } from '@/lib/storage';
import { toast } from 'sonner';

interface ReferenceType {
  id: 'style' | 'composition' | 'character';
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

interface MultiReferencePanelProps {
  mode: 'image' | 'video';
  strength: number;
  onStrengthChange: (value: number) => void;
  onReferencesChange: (references: ReferenceType[]) => void;
  onClear: () => void;
}

export const MultiReferencePanel = ({
  mode,
  strength,
  onStrengthChange,
  onReferencesChange,
  onClear
}: MultiReferencePanelProps) => {
  const [references, setReferences] = useState<ReferenceType[]>([
    { id: 'style', label: 'Style', description: 'Transfer artistic style and visual aesthetics', enabled: false },
    { id: 'composition', label: 'Composition', description: 'Match layout, positioning, and structure', enabled: false },
    { id: 'character', label: 'Character', description: 'Preserve character appearance and features', enabled: false }
  ]);
  
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('workspace-references-collapsed');
    return saved !== null ? JSON.parse(saved) : true; // Default to collapsed for max workspace
  });

  // Save collapse state to localStorage
  useEffect(() => {
    localStorage.setItem('workspace-references-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Auto-expand when dragging workspace assets
  useEffect(() => {
    if (isDragging && isCollapsed) {
      setIsCollapsed(false);
    }
  }, [isDragging, isCollapsed]);

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
      
      setReferences(updatedReferences);
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
        
        setReferences(updatedReferences);
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

  const toggleReference = useCallback((referenceId: string, enabled: boolean) => {
    const updatedReferences = references.map(ref => 
      ref.id === referenceId ? { ...ref, enabled } : ref
    );
    setReferences(updatedReferences);
    onReferencesChange(updatedReferences);
  }, [references, onReferencesChange]);

  const clearReference = useCallback((referenceId: string) => {
    const updatedReferences = references.map(ref => 
      ref.id === referenceId 
        ? { ...ref, file: null, url: undefined, enabled: false }
        : ref
    );
    setReferences(updatedReferences);
    onReferencesChange(updatedReferences);
  }, [references, onReferencesChange]);

  const hasAnyReference = references.some(ref => ref.url);
  const activeReferences = references.filter(ref => ref.enabled && ref.url);

  // Auto-expand when references are first enabled
  const handleToggleReference = useCallback((referenceId: string, enabled: boolean) => {
    if (enabled && isCollapsed) {
      setIsCollapsed(false);
    }
    toggleReference(referenceId, enabled);
  }, [isCollapsed, toggleReference]);

  return (
    <TooltipProvider>
      <div className="mt-4 mx-6">
        <Accordion 
          type="single" 
          collapsible 
          value={isCollapsed ? undefined : "references"}
          onValueChange={(value) => setIsCollapsed(!value)}
          className="bg-muted/20 rounded-lg border border-border"
        >
          <AccordionItem value="references" className="border-0">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Reference Settings</span>
                  {activeReferences.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium">
                        {activeReferences.length} active
                      </span>
                      <span className="text-xs text-muted-foreground">
                        @ {strength.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
                {isCollapsed && activeReferences.length > 0 && (
                  <div className="flex gap-1 mr-2">
                    {activeReferences.slice(0, 3).map(ref => (
                      <span key={ref.id} className="px-1.5 py-0.5 bg-primary/20 text-primary rounded text-xs">
                        {ref.label.slice(0, 3)}
                      </span>
                    ))}
                    {activeReferences.length > 3 && (
                      <span className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-xs">
                        +{activeReferences.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </AccordionTrigger>
            
            <AccordionContent className="px-4 pb-4">
              <div className="flex justify-end mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClear}
                  className="text-xs text-muted-foreground hover:text-foreground h-6 px-2"
                >
                  Clear All
                </Button>
              </div>

              {/* Reference Type Grid */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {references.map((ref) => (
                  <div key={ref.id} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`ref-${ref.id}`}
                        checked={ref.enabled}
                        onCheckedChange={(checked) => handleToggleReference(ref.id, checked as boolean)}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Label htmlFor={`ref-${ref.id}`} className="text-xs font-medium cursor-pointer">
                            {ref.label}
                          </Label>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{ref.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Upload Slot */}
                    <div className="relative">
                      {ref.url ? (
                        <div className="relative group">
                          <div className="w-full h-16 rounded border border-border overflow-hidden bg-muted">
                            <img 
                              src={ref.url} 
                              alt={ref.label} 
                              className="w-full h-full object-cover"
                            />
                            {/* Reference Type Badge */}
                            <div className="absolute bottom-1 left-1">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                ref.isWorkspaceAsset 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-secondary text-secondary-foreground'
                              }`}>
                                {ref.isWorkspaceAsset ? 'Workspace' : 'Uploaded'}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => clearReference(ref.id)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title={`Clear ${ref.label} reference`}
                          >
                            <X className="w-2.5 h-2.5 text-destructive-foreground" />
                          </button>
                        </div>
                       ) : (
                        <div
                          className={`w-full h-16 border-2 border-dashed rounded transition-all duration-200 cursor-pointer ${
                            isDragging === ref.id
                              ? 'border-primary bg-primary/10' 
                              : ref.enabled 
                                ? 'border-primary/60 bg-primary/5 hover:border-primary hover:bg-primary/10'
                                : 'border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/20'
                          }`}
                          onDrop={(e) => handleDrop(e, ref.id)}
                          onDragOver={(e) => handleDragOver(e, ref.id)}
                          onDragLeave={handleDragLeave}
                        >
                          <Button
                            variant="ghost"
                            onClick={() => handleFileSelect(ref.id)}
                            disabled={uploading.has(ref.id)}
                            className="w-full h-full p-1 bg-transparent border-0 hover:bg-transparent"
                            title={`Upload ${ref.label} reference - Click or drag image here`}
                          >
                            {uploading.has(ref.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            ) : (
                               <div className="flex flex-col items-center gap-0.5">
                                 <Upload className={`w-4 h-4 ${ref.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                                 <span className={`text-xs ${ref.enabled ? 'text-primary/80' : 'text-muted-foreground/70'}`}>
                                   Drag or Click
                                 </span>
                               </div>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Strength Control */}
              {activeReferences.length > 0 && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-1">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">
                      Strength
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon className="w-3 h-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>0.1 = Subtle influence, 1.0 = Strong influence</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex-1 max-w-32">
                    <Slider
                      value={[strength]}
                      onValueChange={(values) => onStrengthChange(values[0])}
                      min={0.1}
                      max={1.0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground min-w-8 text-center">
                    {strength.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Active References Summary */}
              {activeReferences.length > 0 && (
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">Active:</span>
                  <div className="flex gap-1 flex-wrap">
                    {activeReferences.map(ref => (
                      <div key={ref.id} className="flex items-center gap-1">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                          {ref.label}
                        </span>
                        {ref.isWorkspaceAsset && ref.modelType && (
                          <span className="px-1.5 py-0.5 bg-secondary/10 text-secondary-foreground rounded text-xs">
                            {ref.modelType}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </TooltipProvider>
  );
};