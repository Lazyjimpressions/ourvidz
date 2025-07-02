
import React from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  const isSDXL = selectedMode.startsWith('sdxl');

  const getPlaceholderText = () => {
    if (isVideoMode) {
      return "Describe the video you want to create, e.g., 'A woman walking through a bustling city street at sunset, camera following from behind'";
    }
    return "Describe the image you want to create, e.g., 'A serene mountain landscape at golden hour with crystal clear lake reflection'";
  };

  const getGenerateButtonText = () => {
    if (isSDXL) {
      return isVideoMode ? 'Generate Video (Ultra Fast)' : 'Generate Image (Ultra Fast)';
    }
    return isVideoMode ? 'Generate Video' : 'Generate Image';
  };

  return (
    <div className="space-y-4">
      <label className="text-sm font-semibold text-gray-300 block">
        {isVideoMode ? 'Video Description' : 'Image Description'}
      </label>
      
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={getPlaceholderText()}
            className={`bg-gray-700/50 border-gray-600/50 hover:border-gray-500/50 focus:border-blue-500/50 text-white placeholder:text-gray-400 rounded-xl resize-none transition-all duration-200 ${
              layout === 'mobile' ? 'text-base min-h-[120px]' : 'text-lg min-h-[100px]'
            }`}
            disabled={isGenerating}
            rows={layout === 'mobile' ? 4 : 3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onGenerate();
              }
            }}
          />
          <p className="text-xs text-gray-500 mt-2">
            {layout === 'desktop' && '⌘+Enter to generate • '}
            {prompt.length}/500 characters
          </p>
        </div>

        <Button
          onClick={onGenerate}
          disabled={isGenerating || !prompt.trim()}
          className={`bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
            layout === 'mobile' ? 'px-6 py-4 h-auto' : 'px-8 py-6 h-auto text-lg'
          }`}
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Generating...
            </>
          ) : (
            <>
              {isVideoMode ? <Play className="mr-2 h-5 w-5" /> : <Sparkles className="mr-2 h-5 w-5" />}
              {getGenerateButtonText()}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
