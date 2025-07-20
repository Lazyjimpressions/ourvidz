
import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Upload, X, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  optimizeForCharacter: boolean;
  onOptimizeChange: (enabled: boolean) => void;
}

export const ReferenceSettingsModal = ({
  isOpen,
  onClose,
  references,
  onReferencesChange,
  referenceStrength,
  onReferenceStrengthChange,
  optimizeForCharacter,
  onOptimizeChange
}: ReferenceSettingsModalProps) => {
  const [draggedOver, setDraggedOver] = useState<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent, referenceId: string) => {
    e.preventDefault();
    setDraggedOver(null);
    
    const files = Array.from(e.dataTransfer.files);
    const workspaceData = e.dataTransfer.getData('application/workspace-asset');
    
    if (workspaceData) {
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
      const url = URL.createObjectURL(file);
      const updatedReferences = references.map(ref =>
        ref.id === referenceId
          ? { ...ref, enabled: true, file, url, isWorkspaceAsset: false }
          : ref
      );
      onReferencesChange(updatedReferences);
    }
  }, [references, onReferencesChange]);

  const handleFileSelect = useCallback((referenceId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        const updatedReferences = references.map(ref =>
          ref.id === referenceId
            ? { ...ref, enabled: true, file, url, isWorkspaceAsset: false }
            : ref
        );
        onReferencesChange(updatedReferences);
      }
    };
    input.click();
  }, [references, onReferencesChange]);

  const handleClearReference = useCallback((referenceId: string) => {
    const updatedReferences = references.map(ref =>
      ref.id === referenceId
        ? { ...ref, enabled: false, file: undefined, url: undefined, isWorkspaceAsset: false }
        : ref
    );
    onReferencesChange(updatedReferences);
  }, [references, onReferencesChange]);

  const hasCharacterReference = references.find(ref => ref.id === 'character')?.enabled;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle>Reference Images</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Reference Strength */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Reference Strength</label>
              <span className="text-xs text-gray-400">{referenceStrength.toFixed(2)}</span>
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

          {/* Reference Upload Areas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {references.map((reference) => (
              <div key={reference.id} className="space-y-2">
                <h3 className="text-sm font-medium">{reference.label}</h3>
                <p className="text-xs text-gray-400 mb-2">{reference.description}</p>
                
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
                    setDraggedOver(reference.id);
                  }}
                  onDragLeave={() => setDraggedOver(null)}
                  onDrop={(e) => handleDrop(e, reference.id)}
                  onClick={() => !reference.url && handleFileSelect(reference.id)}
                >
                  {reference.enabled && reference.url ? (
                    <div className="relative">
                      <img
                        src={reference.url}
                        alt={reference.label}
                        className="w-full h-24 object-cover rounded"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearReference(reference.id);
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-24 text-gray-400">
                      <Upload className="w-6 h-6 mb-1" />
                      <p className="text-xs text-center">Drop image or click</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Character Optimization */}
          {hasCharacterReference && (
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div>
                <label className="text-sm font-medium">Character Optimization</label>
                <p className="text-xs text-gray-400">Optimize prompt for character consistency</p>
              </div>
              <Switch
                checked={optimizeForCharacter}
                onCheckedChange={onOptimizeChange}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
