import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Upload, Sparkles, Play, Zap, Crown, Archive } from "lucide-react";
import { EnhancedReferenceUpload } from "@/components/workspace/EnhancedReferenceUpload";
import { ReferenceStrengthSlider } from "@/components/workspace/ReferenceStrengthSlider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface VideoInputControlsProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onBeginningFrameUpload: () => void;
  onEndingFrameUpload: () => void;
  onSwitchToImage?: () => void;
  quality: 'fast' | 'high';
  setQuality: (quality: 'fast' | 'high') => void;
  onLibraryClick: () => void;
  enhanced: boolean;
  setEnhanced: (enhanced: boolean) => void;
  // Video reference props
  startReferenceImage?: File | null;
  startReferenceImageUrl?: string;
  endReferenceImage?: File | null;
  endReferenceImageUrl?: string;
  onStartReferenceChange?: (file: File | null, url: string) => void;
  onEndReferenceChange?: (file: File | null, url: string) => void;
  onClearStartReference?: () => void;
  onClearEndReference?: () => void;
  referenceStrength?: number;
  referenceType?: string;
  onReferenceStrengthChange?: (strength: number) => void;
  onReferenceTypeChange?: (type: string) => void;
}

export const VideoInputControls = ({
  prompt,
  setPrompt,
  onGenerate,
  isGenerating,
  onBeginningFrameUpload,
  onEndingFrameUpload,
  onSwitchToImage,
  quality,
  setQuality,
  onLibraryClick,
  enhanced,
  setEnhanced,
  startReferenceImage,
  startReferenceImageUrl,
  endReferenceImage,
  endReferenceImageUrl,
  onStartReferenceChange,
  onEndReferenceChange,
  onClearStartReference,
  onClearEndReference,
  referenceStrength,
  referenceType,
  onReferenceStrengthChange,
  onReferenceTypeChange
}: VideoInputControlsProps) => {
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState("5s");
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      return validTypes.includes(file.type);
    });
    
    if (imageFile && onStartReferenceChange) {
      const url = URL.createObjectURL(imageFile);
      onStartReferenceChange(imageFile, url);
    }
  };

  const hasAnyReference = startReferenceImage || startReferenceImageUrl || endReferenceImage || endReferenceImageUrl;

  return (
    <TooltipProvider>
      <div className="bg-gray-900/90 rounded-lg p-2 border border-gray-800/50">
        {/* Main Row */}
        <div className="flex items-center gap-2">
        {/* Stacked IMAGE/VIDEO Toggle Buttons */}
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            onClick={onSwitchToImage}
            className="flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-md bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium"
          >
            <Image className="w-3.5 h-3.5" />
            IMAGE
          </Button>
          <Button
            variant="default"
            className="flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-md bg-white text-black hover:bg-gray-100 text-sm font-medium"
          >
            <Play className="w-3.5 h-3.5" />
            VIDEO
          </Button>
        </div>

        {/* Enhanced Reference Upload for Video */}
        <EnhancedReferenceUpload
          mode="video"
          startReferenceImage={startReferenceImage}
          startReferenceImageUrl={startReferenceImageUrl}
          endReferenceImage={endReferenceImage}
          endReferenceImageUrl={endReferenceImageUrl}
          onStartReferenceChange={onStartReferenceChange}
          onEndReferenceChange={onEndReferenceChange}
          onClearStartReference={onClearStartReference}
          onClearEndReference={onClearEndReference}
        />

        {/* Main Text Input with Enhanced Drag & Drop */}
        <div 
          className={`flex-1 transition-all duration-200 relative ${
            isDragging ? 'bg-blue-600/10 border border-blue-600/50 rounded-md' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A close-up of a woman talking on the phone... (Drag reference images here)"
            className="bg-transparent border-none text-white placeholder:text-gray-400 text-base py-2 px-3 focus:outline-none focus:ring-0 resize-none min-h-[60px]"
            rows={3}
            disabled={isGenerating}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onGenerate();
              }
            }}
          />
          {isDragging && (
            <div className="absolute inset-0 bg-blue-600/20 rounded-md flex items-center justify-center border-2 border-blue-600/50">
              <span className="text-sm font-medium text-blue-600">Drop reference image here</span>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <Button
          onClick={onGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-10 h-10 p-0 bg-blue-600 hover:bg-blue-700 rounded-md"
        >
          <Sparkles className="w-4 h-4" />
        </Button>
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-end gap-2 mt-2">
        {/* Library Button */}
        <Button
          variant="ghost"
          onClick={onLibraryClick}
          className="flex items-center gap-1 px-2 py-1 h-7 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded"
        >
          <Archive className="w-3 h-3" />
          Library
        </Button>

        {/* Aspect Ratio */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="px-2 py-1 h-7 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded">
              {aspectRatio}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-32 p-2 bg-gray-800 border-gray-700" side="top">
            <div className="flex flex-col gap-1">
              {["16:9", "4:3", "1:1"].map((ratio) => (
                <Button
                  key={ratio}
                  variant="ghost"
                  size="sm"
                  onClick={() => setAspectRatio(ratio)}
                  className="justify-start text-xs h-6 text-white hover:bg-gray-700"
                >
                  {ratio}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Duration */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="px-2 py-1 h-7 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded">
              {duration}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-28 p-2 bg-gray-800 border-gray-700" side="top">
            <div className="flex flex-col gap-1">
              {["3s", "5s", "10s"].map((dur) => (
                <Button
                  key={dur}
                  variant="ghost"
                  size="sm"
                  onClick={() => setDuration(dur)}
                  className="justify-start text-xs h-6 text-white hover:bg-gray-700"
                >
                  {dur}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Fast/High Quality Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={() => setQuality(quality === 'fast' ? 'high' : 'fast')}
              className={`flex items-center gap-1 px-2 py-1 h-7 rounded text-xs ${
                quality === 'high' 
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                  : 'bg-gray-800 hover:bg-gray-700 text-white'
              }`}
            >
              {quality === 'high' ? (
                <>
                  <Crown className="w-3 h-3" />
                  High
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3" />
                  Fast
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{quality === 'high' ? 'High quality (slower, better)' : 'Fast generation (quicker, standard)'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Enhanced Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={() => setEnhanced(!enhanced)}
              className={`flex items-center gap-1 px-2 py-1 h-7 rounded text-xs ${
                enhanced 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : 'bg-gray-800 hover:bg-gray-700 text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              {enhanced ? 'Enhanced' : 'Enhance'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{enhanced ? 'Enhanced model (premium features)' : 'Enable enhanced AI model'}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Reference Settings Panel */}
      {hasAnyReference && (
        <div className="mt-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <h4 className="text-sm font-medium text-white mb-2">Video Reference Settings</h4>
          <div className="space-y-3">
            <ReferenceStrengthSlider
              value={referenceStrength || 0.5}
              onChange={onReferenceStrengthChange}
              referenceType={referenceType}
              onTypeChange={onReferenceTypeChange}
            />
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
};