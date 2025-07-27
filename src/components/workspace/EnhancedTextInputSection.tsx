import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Play, Wand2 } from "lucide-react";
import { GenerationFormat } from '@/types/generation';
import { GenerationRequest } from '@/types/generation';
import { PromptEnhancementModal } from '@/components/PromptEnhancementModal';

interface EnhancedTextInputSectionProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: (request: GenerationRequest) => void;
  isGenerating: boolean;
  layout: 'mobile' | 'desktop';
  selectedMode: GenerationFormat;
}

export const EnhancedTextInputSection = ({ 
  prompt, 
  setPrompt, 
  onGenerate, 
  isGenerating, 
  layout,
  selectedMode
}: EnhancedTextInputSectionProps) => {
  const [showEnhancementModal, setShowEnhancementModal] = useState(false);
  const isVideoMode = selectedMode.includes('video');

  const getPlaceholderText = () => {
    if (isVideoMode) {
      return "A woman walking through a bustling city street at sunset";
    }
    return "A serene mountain landscape at golden hour";
  };

  const handleDirectGenerate = () => {
    onGenerate({
      format: selectedMode,
      prompt: prompt,
      originalPrompt: prompt,
      enhancedPrompt: prompt,
      isPromptEnhanced: false
    });
  };

  const handleEnhancedGenerate = (enhancementData: {
    originalPrompt: string;
    enhancedPrompt: string;
    enhancementMetadata: any;
    selectedPresets: string[];
  }) => {
    // Update the visible prompt with the enhanced version
    setPrompt(enhancementData.enhancedPrompt);
    
    // Create generation request with complete enhancement data
    onGenerate({
      format: selectedMode,
      prompt: enhancementData.enhancedPrompt,
      originalPrompt: enhancementData.originalPrompt,
      enhancedPrompt: enhancementData.enhancedPrompt,
      isPromptEnhanced: true,
      enhancementMetadata: enhancementData.enhancementMetadata,
      selectedPresets: enhancementData.selectedPresets
    });
  };

  return (
    <>
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={getPlaceholderText()}
            className="bg-transparent border-gray-600 text-white placeholder:text-gray-400 h-10 focus:border-gray-400"
            disabled={isGenerating}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleDirectGenerate();
              }
            }}
          />
        </div>

        <Button
          onClick={() => setShowEnhancementModal(true)}
          disabled={isGenerating || !prompt.trim()}
          variant="outline"
          className="border-gray-600 text-white hover:bg-gray-800 h-10 px-3"
        >
          <Wand2 className="h-3 w-3" />
        </Button>

        <Button
          onClick={handleDirectGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="bg-white text-black hover:bg-gray-100 h-10 px-4 text-sm font-medium"
        >
          {isGenerating ? (
            <>
              <div className="w-3 h-3 border border-black/30 border-t-black rounded-full animate-spin mr-1" />
              Generating
            </>
          ) : (
            <>
              {isVideoMode ? <Play className="mr-1 h-3 w-3" /> : <Sparkles className="mr-1 h-3 w-3" />}
              Generate
            </>
          )}
        </Button>
      </div>

      <PromptEnhancementModal
        isOpen={showEnhancementModal}
        onClose={() => setShowEnhancementModal(false)}
        onGenerateWithEnhancement={handleEnhancedGenerate}
        originalPrompt={prompt}
        jobType={selectedMode}
        format={isVideoMode ? "video" : "image"}
        quality={selectedMode.includes('high') ? 'high' : 'fast'}
        selectedModel="qwen_instruct"
        generationFormat={selectedMode}
      />
    </>
  );
};