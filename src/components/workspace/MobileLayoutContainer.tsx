
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
    // Handle reference image upload logic
    console.log('Reference image upload clicked');
  };

  return (
    <div className="p-4 space-y-3">
      {/* Primary Row: Mode Dropdown */}
      <div className="w-full">
        <GenerationModeDropdown 
          value={selectedMode} 
          onChange={setSelectedMode}
          disabled={isGenerating}
        />
      </div>

      {/* Reference Upload Row */}
      <div className="flex items-center justify-center">
        <ReferenceUploadSection
          mode={isVideoMode ? 'video' : 'image'}
          onReferenceImageUpload={handleReferenceImageUpload}
        />
      </div>

      {/* Text Input Row */}
      <div className="w-full">
        <TextInputSection
          prompt={prompt}
          setPrompt={setPrompt}
          onGenerate={onGenerate}
          isGenerating={isGenerating}
          layout="mobile"
        />
      </div>

      {/* Advanced Controls Toggle */}
      <div className="flex items-center justify-center">
        <Button
          variant="ghost"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm px-4 py-2 h-8"
        >
          Advanced
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {/* Collapsible Advanced Controls */}
      {showAdvanced && (
        <div className="pt-2 border-t border-gray-700">
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
