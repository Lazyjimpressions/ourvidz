
import React from 'react';
import { GenerationModeDropdown } from './GenerationModeDropdown';
import { ReferenceUploadSection } from './ReferenceUploadSection';
import { TextInputSection } from './TextInputSection';
import { AdvancedControlsSection } from './AdvancedControlsSection';
import { GenerationFormat, GenerationStatus } from '@/types/generation';

interface MobileLayoutContainerProps {
  selectedMode: GenerationFormat;
  setSelectedMode: (mode: GenerationFormat) => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  referenceImage: File | null;
  setReferenceImage: (file: File | null) => void;
  referenceImageUrl: string;
  setReferenceImageUrl: (url: string) => void;
  generationProgress: number;
  currentJob: GenerationStatus | null;
  generationError: string | null;
  onRegenerate: () => void;
  onClearError: () => void;
}

export const MobileLayoutContainer = ({
  selectedMode,
  setSelectedMode,
  prompt,
  setPrompt,
  onGenerate,
  isGenerating,
  referenceImage,
  setReferenceImage,
  referenceImageUrl,
  setReferenceImageUrl
}: MobileLayoutContainerProps) => {
  const isVideoMode = selectedMode.includes('video');

  const handleReferenceImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setReferenceImage(file);
        setReferenceImageUrl(URL.createObjectURL(file));
      }
    };
    input.click();
  };

  return (
    <div className="p-4 space-y-4">
      {/* Mobile stacked layout */}
      <div className="flex items-center gap-2">
        <GenerationModeDropdown 
          value={selectedMode} 
          onChange={setSelectedMode}
          disabled={isGenerating}
        />

        <ReferenceUploadSection
          mode={isVideoMode ? 'video' : 'image'}
          onReferenceImageUpload={handleReferenceImageUpload}
          referenceImage={referenceImage}
          referenceImageUrl={referenceImageUrl}
        />
      </div>

      <TextInputSection
        prompt={prompt}
        setPrompt={setPrompt}
        onGenerate={onGenerate}
        isGenerating={isGenerating}
        layout="mobile"
        selectedMode={selectedMode}
      />

      <AdvancedControlsSection
        mode={isVideoMode ? 'video' : 'image'}
        motionIntensity="medium"
        onMotionClick={() => console.log('Motion clicked')}
        layout="mobile"
      />
    </div>
  );
};
