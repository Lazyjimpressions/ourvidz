import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModeToggle } from '@/components/ModeToggle';
import { QualityToggle } from '@/components/QualityToggle';
import { LibraryButton } from '@/components/LibraryButton';
import { QuantitySelector } from '@/components/QuantitySelector';
import { SeedDisplay } from '@/components/workspace/SeedDisplay';
import { CompelButton } from '@/components/CompelButton';
import { EnhancedReferenceImageBox } from '@/components/workspace/EnhancedReferenceImageBox';

interface ImageInputControlsProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onSwitchToVideo: () => void;
  quality: 'fast' | 'high';
  setQuality: (quality: 'fast' | 'high') => void;
  onLibraryClick: () => void;
  enhanced: boolean;
  setEnhanced: (enhanced: boolean) => void;
  numImages: number;
  setNumImages: (numImages: number) => void;
  hasReference: boolean;
  onReferenceClick: () => void;
  jobType: string;
  compelEnabled: boolean;
  setCompelEnabled: (enabled: boolean) => void;
  compelWeights: string;
  setCompelWeights: (weights: string) => void;
  references: Array<{
    id: string;
    label: string;
    description: string;
    enabled: boolean;
    url?: string;
  }>;
  onReferencesChange: (references: any[]) => void;
  referenceStrength: number;
  onReferenceStrengthChange: (value: number) => void;
  optimizeForCharacter: boolean;
  onOptimizeChange: (enabled: boolean) => void;
}

const ImageInputControls = ({
  prompt,
  setPrompt,
  onGenerate,
  isGenerating,
  onSwitchToVideo,
  quality,
  setQuality,
  onLibraryClick,
  enhanced,
  setEnhanced,
  numImages,
  setNumImages,
  hasReference,
  onReferenceClick,
  jobType,
  compelEnabled,
  setCompelEnabled,
  compelWeights,
  setCompelWeights,
  references,
  onReferencesChange,
  referenceStrength,
  onReferenceStrengthChange,
  optimizeForCharacter,
  onOptimizeChange
}: ImageInputControlsProps) => {
  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value);
  }, [setPrompt]);

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="flex items-center justify-between">
        <ModeToggle onSwitchToImage={() => {}} onSwitchToVideo={onSwitchToVideo} />
        <QualityToggle quality={quality} setQuality={setQuality} enhanced={enhanced} setEnhanced={setEnhanced} />
      </div>

      {/* Prompt Input */}
      <div className="space-y-2">
        <Label htmlFor="prompt">Prompt</Label>
        <Input
          id="prompt"
          placeholder="Enter your prompt"
          value={prompt}
          onChange={handlePromptChange}
          disabled={isGenerating}
        />
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-between">
        {/* Left side controls */}
        <div className="flex items-center gap-4">
          <LibraryButton onClick={onLibraryClick} />
          <QuantitySelector numImages={numImages} setNumImages={setNumImages} />

          {/* Enhanced Reference Upload - Updated to use new component */}
          <EnhancedReferenceImageBox
            references={references}
            onClick={onReferenceClick}
            onDragHover={(isHovering) => {
              // This will be handled by the parent Workspace component
              if (isHovering) {
                onReferenceClick();
              }
            }}
          />

          <SeedDisplay />
          <CompelButton
            compelEnabled={compelEnabled}
            setCompelEnabled={setCompelEnabled}
            compelWeights={compelWeights}
            setCompelWeights={setCompelWeights}
            jobType={jobType}
          />
        </div>

        {/* Right side controls */}
        <Button onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate'}
        </Button>
      </div>
    </div>
  );
};
