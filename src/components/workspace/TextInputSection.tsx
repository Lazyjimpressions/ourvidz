
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";

interface TextInputSectionProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  layout: 'mobile' | 'desktop';
}

export const TextInputSection = ({ 
  prompt, 
  setPrompt, 
  onGenerate, 
  isGenerating, 
  layout 
}: TextInputSectionProps) => {
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex-1">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A close-up of a woman talking on the phone..."
          className={`bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-12 ${
            layout === 'mobile' ? 'text-base' : 'text-lg'
          }`}
          disabled={isGenerating}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onGenerate();
            }
          }}
        />
      </div>

      <Button
        onClick={onGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="w-12 h-12 p-0 bg-blue-600 hover:bg-blue-700 rounded-full flex-shrink-0"
      >
        <Sparkles className="w-5 h-5" />
      </Button>
    </div>
  );
};
