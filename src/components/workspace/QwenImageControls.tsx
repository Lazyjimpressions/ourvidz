
import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Play, Sparkles, Upload, X, Wand2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface QwenImageControlsProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onSwitchToVideo?: () => void;
  isVideoMode?: boolean;
  numImages: number;
  setNumImages: (count: number) => void;
  // Reference image props
  referenceImage?: File | null;
  referenceImageUrl?: string;
  onReferenceImageChange?: (file: File | null, url: string) => void;
  onClearReference?: () => void;
}

const QWEN_PROMPT_SUGGESTIONS = [
  "a realistic portrait of",
  "in the style of",
  "with dramatic lighting",
  "photorealistic",
  "artistic interpretation of",
  "detailed close-up of"
];

export const QwenImageControls = ({
  prompt,
  setPrompt,
  onGenerate,
  isGenerating,
  onSwitchToVideo,
  isVideoMode = false,
  numImages,
  setNumImages,
  referenceImage,
  referenceImageUrl,
  onReferenceImageChange,
  onClearReference
}: QwenImageControlsProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const hasReference = Boolean(referenceImage || referenceImageUrl);

  // Enhanced prompt with Qwen-specific optimizations
  const handlePromptEnhancement = useCallback(() => {
    if (!prompt.trim()) return;
    
    let enhanced = prompt.trim();
    
    // Add Qwen-optimized keywords for better results
    if (!enhanced.includes('detailed') && !enhanced.includes('high quality')) {
      enhanced = `${enhanced}, highly detailed`;
    }
    
    if (hasReference && !enhanced.includes('similar to') && !enhanced.includes('based on')) {
      enhanced = `${enhanced}, maintaining the style and composition of the reference`;
    }
    
    setPrompt(enhanced);
  }, [prompt, hasReference, setPrompt]);

  // Handle file drop for reference images
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile && onReferenceImageChange) {
      const url = URL.createObjectURL(imageFile);
      onReferenceImageChange(imageFile, url);
    }
  }, [onReferenceImageChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  // File input handler
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onReferenceImageChange) {
      const url = URL.createObjectURL(file);
      onReferenceImageChange(file, url);
    }
  }, [onReferenceImageChange]);

  const placeholder = hasReference 
    ? "Describe what you want to change or keep from the reference image..."
    : isVideoMode 
      ? "A woman walking through a bustling city street at sunset"
      : "A serene mountain landscape at golden hour";

  return (
    <TooltipProvider>
      <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl p-4 border border-gray-800/50 shadow-2xl">
        {/* Unified Control Row */}
        <div className="flex items-center gap-3">
          {/* Mode Toggle - Compact */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <Button
              variant={!isVideoMode ? "default" : "ghost"}
              size="sm"
              className={`h-8 px-3 text-xs font-medium ${!isVideoMode ? 'bg-white text-black' : 'text-gray-300 hover:text-white'}`}
            >
              <Image className="w-3 h-3 mr-1" />
              Image
            </Button>
            <Button
              variant={isVideoMode ? "default" : "ghost"}
              size="sm"
              onClick={onSwitchToVideo}
              className={`h-8 px-3 text-xs font-medium ${isVideoMode ? 'bg-white text-black' : 'text-gray-300 hover:text-white'}`}
            >
              <Play className="w-3 h-3 mr-1" />
              Video
            </Button>
          </div>

          {/* Reference Drop Zone - Compact */}
          {!isVideoMode && (
            <div className="relative">
              {hasReference ? (
                <div className="flex items-center gap-2 bg-green-600/20 border border-green-600/30 rounded-lg p-2">
                  <img 
                    src={referenceImageUrl} 
                    alt="Reference" 
                    className="w-8 h-8 rounded object-cover"
                  />
                  <span className="text-xs text-green-400 font-medium">Reference Active</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearReference}
                    className="h-6 w-6 p-0 text-green-400 hover:text-green-300"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed rounded-lg p-2 transition-colors cursor-pointer ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => document.getElementById('reference-upload')?.click()}
                >
                  <Upload className="w-4 h-4 text-gray-400" />
                  <input
                    id="reference-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          )}

          {/* Main Text Input - Enhanced with Qwen features */}
          <div className="flex-1 relative">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={placeholder}
              className="bg-transparent border-none text-white placeholder:text-gray-400 text-base py-2 px-3 focus:outline-none focus:ring-0 resize-none min-h-[60px] pr-20"
              rows={2}
              disabled={isGenerating}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onGenerate();
                }
              }}
            />
            
            {/* Qwen Prompt Enhancement Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePromptEnhancement}
                  className="absolute top-2 right-12 h-6 w-6 p-0 text-gray-400 hover:text-white"
                  disabled={!prompt.trim()}
                >
                  <Wand2 className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Enhance prompt with Qwen optimizations</p>
              </TooltipContent>
            </Tooltip>

            {/* Qwen Suggestions Dropdown */}
            {showSuggestions && prompt.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 max-h-32 overflow-y-auto">
                {QWEN_PROMPT_SUGGESTIONS
                  .filter(suggestion => 
                    suggestion.toLowerCase().includes(prompt.toLowerCase()) ||
                    prompt.toLowerCase().includes(suggestion.toLowerCase())
                  )
                  .slice(0, 4)
                  .map((suggestion, index) => (
                    <button
                      key={index}
                      className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                      onClick={() => {
                        if (!prompt.includes(suggestion)) {
                          setPrompt(`${prompt} ${suggestion}`);
                        }
                        setShowSuggestions(false);
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Smart Controls - Context Aware */}
          <div className="flex items-center gap-2">
            {/* Images Count - Only for image mode */}
            {!isVideoMode && (
              <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-2 py-1">
                <span className="text-xs text-gray-400">×</span>
                <select 
                  value={numImages}
                  onChange={(e) => setNumImages(parseInt(e.target.value))}
                  className="bg-transparent text-white text-xs border-none outline-none"
                  disabled={isGenerating}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={4}>4</option>
                </select>
              </div>
            )}

            {/* Generate Button - Enhanced */}
            <Button
              onClick={onGenerate}
              disabled={isGenerating || !prompt.trim()}
              className={`h-10 px-6 font-medium transition-all ${
                hasReference 
                  ? 'bg-green-600 hover:bg-green-700 ring-2 ring-green-500/20' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Generating
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Qwen Intelligence Indicator */}
        {hasReference && (
          <div className="mt-3 flex items-center justify-center">
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-600/20 border border-blue-600/30 rounded-full">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-xs text-blue-400 font-medium">
                Qwen Visual Intelligence Active
              </span>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
