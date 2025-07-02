
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
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
  const [showAdvanced, setShowAdvanced] = useState(false);
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
    <div className="p-6 space-y-6">
      {/* Mode Selection */}
      <div className="w-full">
        <GenerationModeDropdown 
          value={selectedMode} 
          onChange={setSelectedMode}
          disabled={isGenerating}
        />
      </div>

      {/* Reference Upload */}
      <div className="flex justify-center">
        <ReferenceUploadSection
          mode={isVideoMode ? 'video' : 'image'}
          onReferenceImageUpload={handleReferenceImageUpload}
          referenceImage={referenceImage}
          referenceImageUrl={referenceImageUrl}
        />
      </div>

      {/* Text Input */}
      <div className="w-full">
        <TextInputSection
          prompt={prompt}
          setPrompt={setPrompt}
          onGenerate={onGenerate}
          isGenerating={isGenerating}
          layout="mobile"
          selectedMode={selectedMode}
        />
      </div>

      {/* Advanced Controls Toggle */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-gray-400 hover:text-white hover:bg-gray-700/50 px-6 py-3 rounded-xl transition-all duration-200"
        >
          <span className="font-medium">Advanced Options</span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {/* Collapsible Advanced Controls */}
      {showAdvanced && (
        <div className="pt-4 border-t border-gray-700/50 animate-fade-in">
          <AdvancedControlsSection
            mode={isVideoMode ? 'video' : 'image'}
            motionIntensity="medium"
            onMotionClick={() => console.log('Motion clicked')}
            layout="mobile"
          />
        </div>
      )}
    </div>
  );
};
