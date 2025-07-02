
import React, { useState } from 'react';
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileLayoutContainer } from './workspace/MobileLayoutContainer';
import { DesktopLayoutContainer } from './workspace/DesktopLayoutContainer';
import { GenerationFormat } from '@/types/generation';

interface WorkspaceInputControlsProps {
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
  currentJob: any;
  generationError: string | null;
  onRegenerate: () => void;
  onClearError: () => void;
}

export const WorkspaceInputControls = ({
  selectedMode,
  setSelectedMode,
  prompt,
  setPrompt,
  onGenerate,
  isGenerating,
  referenceImage,
  setReferenceImage,
  referenceImageUrl,
  setReferenceImageUrl,
  generationProgress,
  currentJob,
  generationError,
  onRegenerate,
  onClearError
}: WorkspaceInputControlsProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="bg-gray-800/95 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-700/50 shadow-2xl">
      {isMobile ? (
        <MobileLayoutContainer
          selectedMode={selectedMode}
          setSelectedMode={setSelectedMode}
          prompt={prompt}
          setPrompt={setPrompt}
          onGenerate={onGenerate}
          isGenerating={isGenerating}
          referenceImage={referenceImage}
          setReferenceImage={setReferenceImage}
          referenceImageUrl={referenceImageUrl}
          setReferenceImageUrl={setReferenceImageUrl}
          generationProgress={generationProgress}
          currentJob={currentJob}
          generationError={generationError}
          onRegenerate={onRegenerate}
          onClearError={onClearError}
        />
      ) : (
        <DesktopLayoutContainer
          selectedMode={selectedMode}
          setSelectedMode={setSelectedMode}
          prompt={prompt}
          setPrompt={setPrompt}
          onGenerate={onGenerate}
          isGenerating={isGenerating}
          referenceImage={referenceImage}
          setReferenceImage={setReferenceImage}
          referenceImageUrl={referenceImageUrl}
          setReferenceImageUrl={setReferenceImageUrl}
          generationProgress={generationProgress}
          currentJob={currentJob}
          generationError={generationError}
          onRegenerate={onRegenerate}
          onClearError={onClearError}
        />
      )}
    </div>
  );
};
