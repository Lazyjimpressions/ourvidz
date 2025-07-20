
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Upload, Sparkles, Play, Zap, Crown, Archive, Link, Wand2 } from "lucide-react";
import { ImagesQuantityButton } from "@/components/workspace/ImagesQuantityButton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PromptEnhancementModal } from './PromptEnhancementModal';

interface ImageInputControlsProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onSwitchToVideo?: () => void;
  quality: 'fast' | 'high';
  setQuality: (quality: 'fast' | 'high') => void;
  onLibraryClick: () => void;
  enhanced: boolean;
  setEnhanced: (enhanced: boolean) => void;
  numImages: number;
  setNumImages: (count: number) => void;
  // Reference functionality
  hasReference?: boolean;
  onReferenceClick?: () => void;
  // Job type for enhancement
  jobType?: string;
  // Compel functionality - kept for backwards compatibility but not displayed
  compelEnabled?: boolean;
  setCompelEnabled?: (enabled: boolean) => void;
  compelWeights?: string;
  setCompelWeights?: (weights: string) => void;
  // Reference upload component
  referenceUpload?: React.ReactNode;
}

export const ImageInputControls = ({
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
  hasReference = false,
  onReferenceClick,
  jobType = 'sdxl_image_fast',
  // Compel props kept for compatibility but not used in UI
  compelEnabled = false,
  setCompelEnabled,
  compelWeights = '',
  setCompelWeights,
  referenceUpload
}: ImageInputControlsProps) => {
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [shotType, setShotType] = useState("");
  const [angle, setAngle] = useState("");
  const [style, setStyle] = useState("");
  const [showEnhancementModal, setShowEnhancementModal] = useState(false);

  return (
    <TooltipProvider>
      <div className="bg-gray-900/90 rounded-lg p-2 border border-gray-800/50">
        {/* Main Row */}
        <div className="flex items-center gap-2">
          {/* Stacked IMAGE/VIDEO Toggle Buttons */}
          <div className="flex flex-col gap-1">
            <Button
              variant="default"
              className="flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-md bg-white text-black hover:bg-gray-100 text-sm font-medium"
            >
              <Image className="w-3.5 h-3.5" />
              IMAGE
            </Button>
            <Button
              variant="ghost"
              onClick={onSwitchToVideo}
              className="flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-md bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium"
            >
              <Play className="w-3.5 h-3.5" />
              VIDEO
            </Button>
          </div>

          {/* Reference Upload - Compact drag-and-drop zones */}
          {referenceUpload && (
            <div className="flex items-center gap-1">
              {referenceUpload}
            </div>
          )}

          {/* Reference Button */}
          {onReferenceClick && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={onReferenceClick}
                  className={`flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-md text-sm font-medium ${
                    hasReference 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                  }`}
                >
                  <Link className="w-3.5 h-3.5" />
                  {hasReference ? 'Ref Active' : 'Ref'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{hasReference ? 'Reference image active - Click to manage' : 'Add reference image for character consistency'}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Main Text Input */}
          <div className="flex-1">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A close-up of a woman talking on the phone..."
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
          </div>

          {/* Enhance Prompt Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={() => setShowEnhancementModal(true)}
                disabled={isGenerating || !prompt.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-md bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium border border-gray-600"
              >
                <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                ✨
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Enhance prompt with AI suggestions</p>
            </TooltipContent>
          </Tooltip>

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
          
          {/* Images Quantity Button */}
          <ImagesQuantityButton 
            numImages={numImages}
            onQuantityChange={setNumImages}
            layout="desktop"
          />

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

          {/* Shot Type */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="px-2 py-1 h-7 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded">
                {shotType || "Shot type"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-2 bg-gray-800 border-gray-700" side="top">
              <div className="flex flex-col gap-1">
                {["Close-up", "Medium", "Wide"].map((type) => (
                  <Button
                    key={type}
                    variant="ghost"
                    size="sm"
                    onClick={() => setShotType(type)}
                    className="justify-start text-xs h-6 text-white hover:bg-gray-700"
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Angle */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="px-2 py-1 h-7 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded">
                {angle || "Angle"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-28 p-2 bg-gray-800 border-gray-700" side="top">
              <div className="flex flex-col gap-1">
                {["Front", "Side", "Back"].map((ang) => (
                  <Button
                    key={ang}
                    variant="ghost"
                    size="sm"
                    onClick={() => setAngle(ang)}
                    className="justify-start text-xs h-6 text-white hover:bg-gray-700"
                  >
                    {ang}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Style */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="px-2 py-1 h-7 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded">
                {style || "Style"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-32 p-2 bg-gray-800 border-gray-700" side="top">
              <div className="flex flex-col gap-1">
                {["Realistic", "Artistic", "Cartoon"].map((st) => (
                  <Button
                    key={st}
                    variant="ghost"
                    size="sm"
                    onClick={() => setStyle(st)}
                    className="justify-start text-xs h-6 text-white hover:bg-gray-700"
                  >
                    {st}
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
      </div>

      {/* Prompt Enhancement Modal */}
      <PromptEnhancementModal
        isOpen={showEnhancementModal}
        onClose={() => setShowEnhancementModal(false)}
        onAccept={(enhancedPrompt) => {
          setPrompt(enhancedPrompt);
          setShowEnhancementModal(false);
        }}
        originalPrompt={prompt}
        jobType={jobType}
        format="image"
        quality={quality}
      />
    </TooltipProvider>
  );
};
