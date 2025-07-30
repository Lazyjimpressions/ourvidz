import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Upload, X, Loader2, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedSeedInput } from './EnhancedSeedInput';
import { ReferenceImageBrowser } from './ReferenceImageBrowser';
import { uploadReferenceImage } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReferenceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  references: Array<{
    id: string;
    label: string;
    description: string;
    enabled: boolean;
    url?: string;
    file?: File;
    isWorkspaceAsset?: boolean;
  }>;
  onReferencesChange: (references: any[]) => void;
  referenceStrength: number;
  onReferenceStrengthChange: (value: number) => void;
  seed?: number;
  onSeedChange?: (seed: number | undefined) => void;
}

export const ReferenceSettingsModal = ({
  isOpen,
  onClose,
  references,
  onReferencesChange,
  referenceStrength,
  onReferenceStrengthChange,
  seed,
  onSeedChange
}: ReferenceSettingsModalProps) => {
  const [draggedOver, setDraggedOver] = useState<string | null>(null);
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const [browserOpen, setBrowserOpen] = useState(false);
  const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(null);

  const getSignedUrl = async (path: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('reference_images')
        .createSignedUrl(path, 3600); // 1 hour expiry

      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
  };

  const handleDrop = useCallback((e: React.DragEvent, referenceId: string) => {
    e.preventDefault();
    setDraggedOver(null);
    
    const files = Array.from(e.dataTransfer.files);
    const workspaceData = e.dataTransfer.getData('application/workspace-asset');
    const referenceData = e.dataTransfer.getData('application/reference-asset');
    
    if (referenceData) {
      try {
        const { sourceReferenceId, url, isWorkspaceAsset } = JSON.parse(referenceData);
        if (sourceReferenceId !== referenceId) {
          // Move the image from source to target
          const updatedReferences = references.map(ref => {
            if (ref.id === sourceReferenceId) {
              return { ...ref, enabled: false, url: undefined, isWorkspaceAsset: false };
            } else if (ref.id === referenceId) {
              return { ...ref, enabled: true, url, isWorkspaceAsset };
            }
            return ref;
          });
          onReferencesChange(updatedReferences);
        }
      } catch (error) {
        console.error('Error moving reference:', error);
      }
    } else if (workspaceData) {
      try {
        const assetData = JSON.parse(workspaceData);
        const updatedReferences = references.map(ref => 
          ref.id === referenceId 
            ? { ...ref, enabled: true, url: assetData.url, isWorkspaceAsset: true }
            : ref
        );
        onReferencesChange(updatedReferences);
      } catch (error) {
        console.error('Error parsing workspace asset data:', error);
      }
    } else if (files.length > 0 && files[0].type.startsWith('image/')) {
      const file = files[0];
      handleFileUpload(file, referenceId);
    }
  }, [references, onReferencesChange]);

  const handleFileUpload = useCallback(async (file: File, referenceId: string) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploadingIds(prev => new Set([...prev, referenceId]));

    try {
      // Upload to Supabase storage
      const result = await uploadReferenceImage(file, (progress) => {
        console.log(`Upload progress: ${Math.round((progress.loaded / progress.total) * 100)}%`);
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Get the signed URL for display and generation
      const signedUrl = await getSignedUrl(result.data.path);
      
      if (!signedUrl) {
        throw new Error('Failed to get signed URL for uploaded image');
      }

      const updatedReferences = references.map(ref =>
        ref.id === referenceId
          ? { ...ref, enabled: true, file, url: signedUrl, isWorkspaceAsset: false }
          : ref
      );
      
      onReferencesChange(updatedReferences);
      toast.success(`${references.find(r => r.id === referenceId)?.label} reference uploaded successfully`);
      
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload reference image');
    } finally {
      setUploadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(referenceId);
        return newSet;
      });
    }
  }, [references, onReferencesChange, getSignedUrl]);

  const handleFileSelect = useCallback((referenceId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file, referenceId);
      }
    };
    input.click();
  }, [handleFileUpload]);

  const handleClearReference = useCallback((referenceId: string) => {
    const updatedReferences = references.map(ref =>
      ref.id === referenceId
        ? { ...ref, enabled: false, file: undefined, url: undefined, isWorkspaceAsset: false }
        : ref
    );
    onReferencesChange(updatedReferences);
  }, [references, onReferencesChange]);

  const handleBrowseReferences = (referenceId: string) => {
    setSelectedReferenceId(referenceId);
    setBrowserOpen(true);
  };

  const handleBrowserSelect = (url: string) => {
    if (selectedReferenceId) {
      const updatedReferences = references.map(ref =>
        ref.id === selectedReferenceId
          ? { ...ref, enabled: true, url, isWorkspaceAsset: false }
          : ref
      );
      onReferencesChange(updatedReferences);
      toast.success(`${references.find(r => r.id === selectedReferenceId)?.label} reference set successfully`);
    }
    setBrowserOpen(false);
    setSelectedReferenceId(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-gray-900 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Reference Images</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Reference Strength */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white">Reference Strength</label>
                <span className="text-xs text-gray-300">{referenceStrength.toFixed(2)}</span>
              </div>
              <Slider
                value={[referenceStrength]}
                onValueChange={(value) => onReferenceStrengthChange(value[0])}
                min={0.1}
                max={1.0}
                step={0.05}
                className="w-full"
              />
            </div>

            {/* Seed Control */}
            {onSeedChange && (
              <EnhancedSeedInput 
                seed={seed} 
                onSeedChange={onSeedChange} 
              />
            )}

            {/* Reference Upload Areas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {references.map((reference) => {
                const isUploading = uploadingIds.has(reference.id);
                
                return (
                  <div key={reference.id} className="space-y-2">
                    <h3 className="text-sm font-medium text-white">{reference.label}</h3>
                    <p className="text-xs text-gray-300 mb-2">{reference.description}</p>
                    
                    <div
                      className={cn(
                        "relative border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer",
                        draggedOver === reference.id
                          ? "border-blue-400 bg-blue-400/10"
                          : reference.enabled && reference.url
                          ? "border-green-500 bg-green-500/10"
                          : "border-gray-600 hover:border-gray-500"
                      )}
                      onDragOver={(e) => {
                        e.preventDefault();
                        const hasWorkspaceData = e.dataTransfer.types.includes('application/workspace-asset');
                        const hasReferenceData = e.dataTransfer.types.includes('application/reference-asset');
                        const hasFiles = e.dataTransfer.files.length > 0;
                        
                        if (hasWorkspaceData || hasReferenceData || hasFiles) {
                          setDraggedOver(reference.id);
                        }
                      }}
                      onDragLeave={() => setDraggedOver(null)}
                      onDrop={(e) => handleDrop(e, reference.id)}
                      onClick={() => !isUploading && handleFileSelect(reference.id)}
                    >
                      {reference.enabled && reference.url && !isUploading ? (
                        <div className="relative">
                          <img
                            src={reference.url}
                            alt={reference.label}
                            className="w-full h-24 object-cover rounded cursor-move"
                            draggable="true"
                            onDragStart={(e) => {
                              const dragData = {
                                sourceReferenceId: reference.id,
                                url: reference.url,
                                isWorkspaceAsset: reference.isWorkspaceAsset
                              };
                              e.dataTransfer.setData('application/reference-asset', JSON.stringify(dragData));
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearReference(reference.id);
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-24 text-gray-400">
                          {isUploading ? (
                            <>
                              <Loader2 className="w-6 h-6 mb-1 animate-spin" />
                              <p className="text-xs text-center">Uploading...</p>
                            </>
                          ) : (
                             <>
                               <Upload className="w-6 h-6 mb-1" />
                               <p className="text-xs text-center">Drop image or click to upload</p>
                             </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFileSelect(reference.id)}
                        disabled={isUploading}
                        className="flex-1 text-xs h-8 bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                      >
                        <Upload className="w-3 h-3 mr-1" />
                        Upload New
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBrowseReferences(reference.id)}
                        className="flex-1 text-xs h-8 bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                      >
                        <FolderOpen className="w-3 h-3 mr-1" />
                        Browse
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button 
                variant="secondary" 
                onClick={onClose}
                className="bg-gray-700 text-white hover:bg-gray-600 border-gray-600"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reference Image Browser */}
      <ReferenceImageBrowser
        isOpen={browserOpen}
        onClose={() => {
          setBrowserOpen(false);
          setSelectedReferenceId(null);
        }}
        onSelect={handleBrowserSelect}
      />
    </>
  );
};
