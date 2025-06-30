
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ModeToggleButtons } from './ModeToggleButtons';
import { ReferenceUploadSection } from './ReferenceUploadSection';
import { TextInputSection } from './TextInputSection';
import { QualityToggleSection } from './QualityToggleSection';
import { AdvancedControlsSection } from './AdvancedControlsSection';

interface MobileLayoutContainerProps {
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

export const MobileLayoutContainer = ({
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
}: MobileLayoutContainerProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-4">
      {/* Row 1: Mode Toggle and Quality */}
      <div className="flex items-center justify-between gap-3">
        <ModeToggleButtons 
          mode={mode} 
          onModeChange={onModeChange} 
          layout="mobile" 
        />
        <QualityToggleSection 
          quality={quality} 
          onQualityChange={onQualityChange} 
        />
      </div>

      {/* Row 2: Text Input and Generate */}
      <div className="flex items-center gap-3">
        <TextInputSection
          prompt={prompt}
          setPrompt={setPrompt}
          onGenerate={onGenerate}
          isGenerating={isGenerating}
          layout="mobile"
        />
      </div>

      {/* Row 3: Reference Upload and Advanced Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ReferenceUploadSection
            mode={mode}
            onReferenceImageUpload={onReferenceImageUpload}
          />
        </div>
        
        <Button
          variant="ghost"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
        >
          Advanced
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {/* Collapsible Advanced Controls */}
      {showAdvanced && (
        <div className="space-y-3 pt-2 border-t border-gray-700">
          <AdvancedControlsSection
            mode={mode}
            motionIntensity={motionIntensity}
            onMotionClick={onMotionClick}
            layout="mobile"
          />
        </div>
      )}
    </div>
  );
};
