
import React, { useState } from 'react';
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileLayoutContainer } from './workspace/MobileLayoutContainer';
import { DesktopLayoutContainer } from './workspace/DesktopLayoutContainer';

interface WorkspaceInputControlsProps {
  mode: 'image' | 'video';
  onModeChange: (mode: 'image' | 'video') => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onReferenceImageUpload: () => void;
  quality: 'fast' | 'high';
  onQualityChange: (quality: 'fast' | 'high') => void;
}

export const WorkspaceInputControls = ({
  mode,
  onModeChange,
  prompt,
  setPrompt,
  onGenerate,
  isGenerating,
  onReferenceImageUpload,
  quality,
  onQualityChange
}: WorkspaceInputControlsProps) => {
  const [motionIntensity, setMotionIntensity] = useState<'low' | 'medium' | 'high'>('medium');
  const isMobile = useIsMobile();

  const handleMotionClick = () => {
    const nextIntensity = motionIntensity === 'low' ? 'medium' : 
                         motionIntensity === 'medium' ? 'high' : 'low';
    setMotionIntensity(nextIntensity);
  };

  return (
    <div className="bg-gray-800/95 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-700/50 shadow-2xl">
      {isMobile ? (
        <MobileLayoutContainer
          mode={mode}
          onModeChange={onModeChange}
          prompt={prompt}
          setPrompt={setPrompt}
          onGenerate={onGenerate}
          isGenerating={isGenerating}
          onReferenceImageUpload={onReferenceImageUpload}
          quality={quality}
          onQualityChange={onQualityChange}
          motionIntensity={motionIntensity}
          onMotionClick={handleMotionClick}
        />
      ) : (
        <DesktopLayoutContainer
          mode={mode}
          onModeChange={onModeChange}
          prompt={prompt}
          setPrompt={setPrompt}
          onGenerate={onGenerate}
          isGenerating={isGenerating}
          onReferenceImageUpload={onReferenceImageUpload}
          quality={quality}
          onQualityChange={onQualityChange}
          motionIntensity={motionIntensity}
          onMotionClick={handleMotionClick}
        />
      )}
    </div>
  );
};
