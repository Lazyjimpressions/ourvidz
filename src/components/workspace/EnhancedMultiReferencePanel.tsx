
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Eye, Upload, X, Target, Clock, Image as ImageIcon } from "lucide-react";
import { ReferencePreviewModal } from './ReferencePreviewModal';
import { ExactReproductionPreset } from './ExactReproductionPreset';
import { ReferenceHistoryPanel } from './ReferenceHistoryPanel';

interface ReferenceItem {
  id: 'character' | 'style' | 'composition';
  label: string;
  description: string;
  file?: File | null;
  url?: string;
  enabled: boolean;
  isWorkspaceAsset?: boolean;
}

interface EnhancedMultiReferencePanelProps {
  mode: 'image' | 'video';
  strength: number;
  onStrengthChange: (strength: number) => void;
  onReferencesChange: (references: ReferenceItem[]) => void;
  onClear: () => void;
  activeReferences?: ReferenceItem[];
  generatedImageUrl?: string;
}

export const EnhancedMultiReferencePanel = ({
  mode,
  strength,
  onStrengthChange,
  onReferencesChange,
  onClear,
  activeReferences = [],
  generatedImageUrl
}: EnhancedMultiReferencePanelProps) => {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedReferenceForPreview, setSelectedReferenceForPreview] = useState<string>('');
  const [referenceHistory, setReferenceHistory] = useState<any[]>([]);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [batchStrengths, setBatchStrengths] = useState<number[]>([0.5, 0.7, 0.9]);

  // Hide for video mode
  if (mode === 'video') return null;

  const hasActiveReferences = activeReferences.some(ref => ref.enabled && ref.url);
  const isExactReproduction = strength >= 0.95;

  const handleExactReproductionPreset = () => {
    onStrengthChange(1.0);
    // Set character reference type if available
    const updatedRefs = activeReferences.map(ref => ({
      ...ref,
      enabled: ref.id === 'character' ? true : ref.enabled
    }));
    onReferencesChange(updatedRefs);
  };

  const handlePreviewReference = (referenceUrl: string) => {
    setSelectedReferenceForPreview(referenceUrl);
    setShowPreviewModal(true);
  };

  const handleFileUpload = (referenceId: 'character' | 'style' | 'composition') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        const updatedRefs = activeReferences.map(ref => 
          ref.id === referenceId 
            ? { ...ref, file, url, enabled: true }
            : ref
        );
        
        // Add to history
        const historyItem = {
          id: Date.now().toString(),
          url,
          timestamp: new Date(),
          type: referenceId,
          strength
        };
        setReferenceHistory(prev => [historyItem, ...prev.slice(0, 7)]);
        
        onReferencesChange(updatedRefs);
      }
    };
    input.click();
  };

  const referenceTypes: Array<{id: 'character' | 'style' | 'composition', label: string, description: string}> = [
    { id: 'character', label: 'Character', description: 'Preserve character appearance and features' },
    { id: 'style', label: 'Style', description: 'Match artistic style and technique' },
    { id: 'composition', label: 'Composition', description: 'Copy layout and structure' }
  ];

  return (
    <div className="bg-gray-900/50 rounded-lg p-4 space-y-4">
      {/* Header with Advanced Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Reference Images</h3>
        <div className="flex items-center gap-2">
          <ExactReproductionPreset
            onApplyPreset={handleExactReproductionPreset}
            isActive={isExactReproduction}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Advanced</span>
            <Switch
              checked={advancedMode}
              onCheckedChange={setAdvancedMode}
              className="scale-75"
            />
          </div>
        </div>
      </div>

      {/* Reference Upload Sections */}
      <div className="grid grid-cols-3 gap-3">
        {referenceTypes.map((type) => {
          const activeRef = activeReferences.find(ref => ref.id === type.id);
          const hasReference = activeRef?.url;

          return (
            <div key={type.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white">{type.label}</span>
                {hasReference && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePreviewReference(activeRef.url!)}
                      className="h-5 w-5 text-gray-400 hover:text-white"
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const updatedRefs = activeReferences.map(ref => 
                          ref.id === type.id ? { ...ref, url: '', file: null, enabled: false } : ref
                        );
                        onReferencesChange(updatedRefs);
                      }}
                      className="h-5 w-5 text-gray-400 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div
                className={`relative aspect-square border-2 border-dashed rounded-lg overflow-hidden cursor-pointer transition-all ${
                  hasReference 
                    ? 'border-green-500 bg-green-500/10' 
                    : 'border-gray-600 hover:border-gray-400 bg-gray-800/50'
                }`}
                onClick={() => !hasReference && handleFileUpload(type.id)}
              >
                {hasReference ? (
                  <img
                    src={activeRef.url}
                    alt={`${type.label} reference`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <Upload className="w-6 h-6 mb-1" />
                    <span className="text-xs text-center px-1">{type.description}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Strength Control */}
      {hasActiveReferences && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white">Reference Strength</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{Math.round(strength * 100)}%</span>
              {isExactReproduction && (
                <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">EXACT</span>
              )}
            </div>
          </div>
          <Slider
            value={[strength]}
            onValueChange={(values) => onStrengthChange(values[0])}
            min={0.1}
            max={1.0}
            step={0.05}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Subtle (10%)</span>
            <span>Strong (50%)</span>
            <span>Exact (100%)</span>
          </div>
        </div>
      )}

      {/* Advanced Controls */}
      {advancedMode && hasActiveReferences && (
        <div className="space-y-3 pt-3 border-t border-gray-700">
          <h4 className="text-xs font-medium text-white">Advanced Options</h4>
          
          {/* Batch Generation with Multiple Strengths */}
          <div className="space-y-2">
            <span className="text-xs text-gray-400">Batch Strengths</span>
            <div className="flex gap-2">
              {batchStrengths.map((batchStrength, index) => (
                <div key={index} className="flex-1">
                  <input
                    type="number"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={batchStrength}
                    onChange={(e) => {
                      const newStrengths = [...batchStrengths];
                      newStrengths[index] = parseFloat(e.target.value);
                      setBatchStrengths(newStrengths);
                    }}
                    className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reference History */}
      <ReferenceHistoryPanel
        history={referenceHistory}
        onSelectReference={(item) => {
          const updatedRefs = activeReferences.map(ref => 
            ref.id === item.type ? { ...ref, url: item.url, enabled: true } : ref
          );
          onReferencesChange(updatedRefs);
          if (item.strength) {
            onStrengthChange(item.strength);
          }
        }}
        onClearHistory={() => setReferenceHistory([])}
      />

      {/* Clear All Button */}
      {hasActiveReferences && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          Clear All References
        </Button>
      )}

      {/* Reference Preview Modal */}
      <ReferencePreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        referenceUrl={selectedReferenceForPreview}
        generatedUrl={generatedImageUrl}
      />
    </div>
  );
};
