import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModeToggleButtons } from '@/components/workspace/ModeToggleButtons';
import { QualityToggleSection } from '@/components/workspace/QualityToggleSection';
import { ImagesQuantityButton } from '@/components/workspace/ImagesQuantityButton';
import { SeedDisplay } from '@/components/workspace/SeedDisplay';
import { CompelModal } from '@/components/workspace/CompelModal';
import { EnhancedReferenceImageBox } from '@/components/workspace/EnhancedReferenceImageBox';
import { Library, Sparkles } from 'lucide-react';
import { GenerationFormat } from '@/types/generation';

interface ImageInputControlsProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onSwitchToVideo: () => void;
  quality: 'fast' | 'high';
  setQuality: (quality: 'fast' | 'high') => void;
  onLibraryClick: () => void;
  enhanced: boolean;
  setEnhanced: (enhanced: boolean) => void;
  numImages: number;
  setNumImages: (numImages: number) => void;
  hasReference: boolean;
  onReferenceClick: () => void;
  jobType: string;
  compelEnabled: boolean;
  setCompelEnabled: (enabled: boolean) => void;
  compelWeights: string;
  setCompelWeights: (weights: string) => void;
  showCompelModal: boolean;
  setShowCompelModal: (show: boolean) => void;
  references: Array<{
    id: string;
    label: string;
    description: string;
    enabled: boolean;
    url?: string;
  }>;
  onReferencesChange: (references: any[]) => void;
  referenceStrength: number;
  onReferenceStrengthChange: (value: number) => void;
  optimizeForCharacter: boolean;
  onOptimizeChange: (enabled: boolean) => void;
}

const ImageInputControls = ({
  prompt,
  setPrompt,
  onGenerate,
  isGenerating,
  onSwitchToVideo,
  quality,
  setQuality,
  onLibraryClick,
  enhanced,
  setEnhanced,
  numImages,
  setNumImages,
  hasReference,
  onReferenceClick,
  jobType,
  compelEnabled,
  setCompelEnabled,
  compelWeights,
  setCompelWeights,
  showCompelModal,
  setShowCompelModal,
  references,
  onReferencesChange,
  referenceStrength,
  onReferenceStrengthChange,
  optimizeForCharacter,
  onOptimizeChange
}: ImageInputControlsProps) => {
  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value);
  }, [setPrompt]);

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="flex items-center justify-between">
        <ModeToggleButtons 
          selectedMode={quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast'} 
          onModeChange={() => onSwitchToVideo()} 
        />
        <div className="flex items-center gap-2">
          <QualityToggleSection quality={quality} onQualityChange={setQuality} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEnhanced(!enhanced)}
            className={enhanced ? 'bg-primary/20 text-primary' : ''}
          >
            <Sparkles className="w-4 h-4" />
            Enhanced
          </Button>
        </div>
      </div>

      {/* Prompt Input */}
      <div className="space-y-2">
        <Label htmlFor="prompt">Prompt</Label>
        <Input
          id="prompt"
          placeholder="Enter your prompt"
          value={prompt}
          onChange={handlePromptChange}
          disabled={isGenerating}
        />
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-between">
        {/* Left side controls */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onLibraryClick}>
            <Library className="w-4 h-4 mr-2" />
            Library
          </Button>
          
          <ImagesQuantityButton 
            numImages={numImages} 
            onQuantityChange={setNumImages}
            layout="desktop"
          />

          {/* Enhanced Reference Upload - Updated to use new component */}
          <EnhancedReferenceImageBox
            references={references}
            onClick={onReferenceClick}
            onDragHover={(isHovering) => {
              // This will be handled by the parent Workspace component
              if (isHovering) {
                onReferenceClick();
              }
            }}
          />

          <SeedDisplay />
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowCompelModal(true)}
            className={compelEnabled ? 'bg-primary/20 text-primary' : ''}
          >
            Compel
          </Button>
        </div>

        {/* Right side controls */}
        <Button onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate'}
        </Button>
      </div>

      {/* Compel Modal */}
      <CompelModal
        isOpen={showCompelModal}
        onClose={() => setShowCompelModal(false)}
        compelEnabled={compelEnabled}
        setCompelEnabled={setCompelEnabled}
        compelWeights={compelWeights}
        setCompelWeights={setCompelWeights}
      />
    </div>
  );
};

export { ImageInputControls };
