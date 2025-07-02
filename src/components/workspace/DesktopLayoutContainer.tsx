
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
    // Handle reference image upload logic
    console.log('Reference image upload clicked');
  };

  return (
    <div className="p-6">
      {/* Row 1: Mode Dropdown, Reference Uploads, Text Input, Generate Button */}
      <div className="flex items-center gap-3 mb-4">
        <GenerationModeDropdown 
          value={selectedMode} 
          onChange={setSelectedMode}
          disabled={isGenerating}
        />

        <ReferenceUploadSection
          mode={isVideoMode ? 'video' : 'image'}
          onReferenceImageUpload={handleReferenceImageUpload}
        />

        <TextInputSection
          prompt={prompt}
          setPrompt={setPrompt}
          onGenerate={onGenerate}
          isGenerating={isGenerating}
          layout="desktop"
        />
      </div>

      {/* Row 2: Advanced Controls */}
      <div className="flex items-center gap-3">
        {/* Spacer to align with mode dropdown */}
        <div className="w-64"></div>
        
        {/* Spacer to align with reference uploads */}
        <div className={isVideoMode ? 'w-24' : 'w-10'}></div>

        <AdvancedControlsSection
          mode={isVideoMode ? 'video' : 'image'}
          motionIntensity="medium"
          onMotionClick={() => console.log('Motion clicked')}
          layout="desktop"
        />

        {/* Spacer to align with generate button */}
        <div className="w-12"></div>
      </div>
    </div>
  );
};
