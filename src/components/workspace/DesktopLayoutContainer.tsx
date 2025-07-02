
import React from 'react';
import { GenerationModeDropdown } from './GenerationModeDropdown';
import { ReferenceUploadSection } from './ReferenceUploadSection';
import { TextInputSection } from './TextInputSection';
import { AdvancedControlsSection } from './AdvancedControlsSection';
import { GenerationFormat, GenerationStatus } from '@/types/generation';

interface DesktopLayoutContainerProps {
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

export const DesktopLayoutContainer = ({
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
}: DesktopLayoutContainerProps) => {
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
    <div className="p-8">
      {/* Main Generation Row */}
      <div className="grid grid-cols-12 gap-6 items-start mb-6">
        {/* Mode Selection - Takes up 3 columns */}
        <div className="col-span-3">
          <GenerationModeDropdown 
            value={selectedMode} 
            onChange={setSelectedMode}
            disabled={isGenerating}
          />
        </div>

        {/* Reference Upload - Takes up 1 column */}
        <div className="col-span-1 flex justify-center">
          <ReferenceUploadSection
            mode={isVideoMode ? 'video' : 'image'}
            onReferenceImageUpload={handleReferenceImageUpload}
            referenceImage={referenceImage}
            referenceImageUrl={referenceImageUrl}
          />
        </div>

        {/* Text Input and Generate - Takes up 8 columns */}
        <div className="col-span-8">
          <TextInputSection
            prompt={prompt}
            setPrompt={setPrompt}
            onGenerate={onGenerate}
            isGenerating={isGenerating}
            layout="desktop"
            selectedMode={selectedMode}
          />
        </div>
      </div>

      {/* Advanced Controls Row */}
      <div className="grid grid-cols-12 gap-6 items-center">
        {/* Align with mode dropdown */}
        <div className="col-span-3"></div>
        
        {/* Align with reference upload */}
        <div className="col-span-1"></div>

        {/* Advanced Controls - Align with text input */}
        <div className="col-span-8">
          <AdvancedControlsSection
            mode={isVideoMode ? 'video' : 'image'}
            motionIntensity="medium"
            onMotionClick={() => console.log('Motion clicked')}
            layout="desktop"
          />
        </div>
      </div>
    </div>
  );
};
