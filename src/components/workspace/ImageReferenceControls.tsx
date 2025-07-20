
import React from 'react';
import { CompactReferenceUpload } from './CompactReferenceUpload';
import { CompactReferenceStatus } from './CompactReferenceStatus';
import { CompactAdvancedSettings } from './CompactAdvancedSettings';

interface ImageReferenceControlsProps {
  // Reference state
  references: Array<{
    id: string;
    label: string;
    enabled: boolean;
    url?: string;
    file?: File;
  }>;
  onReferencesChange: (references: any[]) => void;
  referenceStrength: number;
  onReferenceStrengthChange: (value: number) => void;
  referenceType: string;
  onReferenceTypeChange: (type: string) => void;
  
  // Advanced settings
  seed?: number;
  onSeedChange?: (seed: number | undefined) => void;
  optimizeForCharacter: boolean;
  onOptimizeChange: (enabled: boolean) => void;
  
  // Compel settings
  showCompel: boolean;
  compelEnabled: boolean;
  setCompelEnabled?: (enabled: boolean) => void;
  compelWeights: string;
  setCompelWeights?: (weights: string) => void;
  
  // UI state
  numImages: number;
  showReferencePanel: boolean;
}

export const ImageReferenceControls = ({
  references,
  onReferencesChange,
  referenceStrength,
  onReferenceStrengthChange,
  referenceType,
  onReferenceTypeChange,
  seed,
  onSeedChange,
  optimizeForCharacter,
  onOptimizeChange,
  showCompel,
  compelEnabled,
  setCompelEnabled,
  compelWeights,
  setCompelWeights,
  numImages,
  showReferencePanel
}: ImageReferenceControlsProps) => {
  const hasActiveReferences = references.some(ref => ref.enabled && ref.url);

  return (
    <div className="space-y-0">
      {/* Reference Status - Only show when references are active */}
      <CompactReferenceStatus
        activeReferences={references}
        referenceStrength={referenceStrength}
        numImages={numImages}
      />
      
      {/* Advanced Settings - Show when panel is open or for SDXL models */}
      {showReferencePanel && (
        <CompactAdvancedSettings
          hasActiveReferences={hasActiveReferences}
          referenceStrength={referenceStrength}
          onReferenceStrengthChange={onReferenceStrengthChange}
          referenceType={referenceType}
          onReferenceTypeChange={onReferenceTypeChange}
          seed={seed}
          onSeedChange={onSeedChange}
          optimizeForCharacter={optimizeForCharacter}
          onOptimizeChange={onOptimizeChange}
          showCompel={showCompel}
          compelEnabled={compelEnabled}
          setCompelEnabled={setCompelEnabled}
          compelWeights={compelWeights}
          setCompelWeights={setCompelWeights}
        />
      )}
    </div>
  );
};
