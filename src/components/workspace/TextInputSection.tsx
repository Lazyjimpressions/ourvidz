
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Play } from "lucide-react";
import { GenerationFormat } from '@/types/generation';

interface TextInputSectionProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  layout: 'mobile' | 'desktop';
  selectedMode: GenerationFormat;
}

export const TextInputSection = ({ 
  prompt, 
  setPrompt, 
  onGenerate, 
  isGenerating, 
  layout,
  selectedMode
}: TextInputSectionProps) => {
  const isVideoMode = selectedMode.includes('video');

  const getPlaceholderText = () => {
    if (isVideoMode) {
      return "A woman walking through a bustling city street at sunset";
    }
    return "A serene mountain landscape at golden hour";
  };

  return (
    <div className="flex gap-2 items-center">
      <div className="flex-1">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={getPlaceholderText()}
          className="bg-transparent border-gray-600 text-white placeholder:text-gray-400 h-10 focus:border-gray-400"
          disabled={isGenerating}
        />
      </div>

      <Button
        onClick={onGenerate}
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
  );
};
