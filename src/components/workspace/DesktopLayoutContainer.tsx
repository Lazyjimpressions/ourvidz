
import React from 'react';
import { ModeToggleButtons } from './ModeToggleButtons';
import { ReferenceUploadSection } from './ReferenceUploadSection';
import { TextInputSection } from './TextInputSection';
import { QualityToggleSection } from './QualityToggleSection';
import { AdvancedControlsSection } from './AdvancedControlsSection';

interface DesktopLayoutContainerProps {
  mode: 'image' | 'video';
  onModeChange: (mode: 'image' | 'video') => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onReferenceImageUpload: () => void;
  quality: 'fast' | 'high';
  onQualityChange: (quality: 'fast' | 'high') => void;
  motionIntensity: 'low' | 'medium' | 'high';
  onMotionClick: () => void;
}

export const DesktopLayoutContainer = ({
  mode,
  onModeChange,
  prompt,
  setPrompt,
  onGenerate,
  isGenerating,
  onReferenceImageUpload,
  quality,
  onQualityChange,
  motionIntensity,
  onMotionClick
}: DesktopLayoutContainerProps) => {
  return (
    <div>
      {/* Row 1: Mode Toggle Buttons, Reference Uploads, Text Input, Generate Button */}
      <div className="flex items-center gap-3 mb-4">
        <ModeToggleButtons 
          mode={mode} 
          onModeChange={onModeChange} 
          layout="desktop" 
        />

        <ReferenceUploadSection
          mode={mode}
          onReferenceImageUpload={onReferenceImageUpload}
        />

        <TextInputSection
          prompt={prompt}
          setPrompt={setPrompt}
          onGenerate={onGenerate}
          isGenerating={isGenerating}
          layout="desktop"
        />
      </div>

      {/* Row 2: Mode-Specific Controls + Quality Toggle */}
      <div className="flex items-center gap-3">
        {/* Spacer to align with mode buttons */}
        <div className="w-20"></div>
        
        {/* Spacer to align with reference uploads */}
        <div className={mode === 'image' ? 'w-10' : 'w-24'}></div>

        <AdvancedControlsSection
          mode={mode}
          motionIntensity={motionIntensity}
          onMotionClick={onMotionClick}
          layout="desktop"
        />

        <QualityToggleSection 
          quality={quality} 
          onQualityChange={onQualityChange} 
        />

        {/* Spacer to align with generate button */}
        <div className="w-12"></div>
      </div>
    </div>
  );
};
