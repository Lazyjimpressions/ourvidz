
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
    <div className="p-4 space-y-4">
      {/* Main Generation Row */}
      <div className="flex items-center gap-4">
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

        <div className="flex-1">
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
      <div className="flex items-center gap-4">
        <div className="w-48"></div> {/* Spacer to align with dropdown */}
        <div className="w-10"></div> {/* Spacer to align with reference upload */}
        <div className="flex-1">
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
