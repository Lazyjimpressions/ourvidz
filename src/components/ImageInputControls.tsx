import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Upload, Sparkles, Play, Zap, Crown, Archive, Link, Wand2, Settings } from "lucide-react";
import { ImagesQuantityButton } from "@/components/workspace/ImagesQuantityButton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PromptEnhancementModal } from './PromptEnhancementModal';
import { ReferenceImageBox } from './workspace/ReferenceImageBox';
import { ReferenceSettingsModal } from './workspace/ReferenceSettingsModal';
import { CompelModal } from './workspace/CompelModal';

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
  hasReference?: boolean;
  onReferenceClick?: () => void;
  jobType?: string;
  compelEnabled?: boolean;
  setCompelEnabled?: (enabled: boolean) => void;
  compelWeights?: string;
  setCompelWeights?: (weights: string) => void;
  references?: Array<{
    id: string;
    label: string;
    description: string;
    enabled: boolean;
    url?: string;
    file?: File;
    isWorkspaceAsset?: boolean;
  }>;
  onReferencesChange?: (references: any[]) => void;
  referenceStrength?: number;
  onReferenceStrengthChange?: (value: number) => void;
  optimizeForCharacter?: boolean;
  onOptimizeChange?: (enabled: boolean) => void;
  onReferenceDragOver?: (e: React.DragEvent) => void;
  onReferenceDragLeave?: (e: React.DragEvent) => void;
  onReferenceDrop?: (e: React.DragEvent) => void;
  isReferenceDragOver?: boolean;
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
  compelEnabled = false,
  setCompelEnabled,
  compelWeights = '',
  setCompelWeights,
  references = [],
  onReferencesChange,
  referenceStrength = 0.85,
  onReferenceStrengthChange,
  optimizeForCharacter = false,
  onOptimizeChange,
  onReferenceDragOver,
  onReferenceDragLeave,
  onReferenceDrop,
  isReferenceDragOver
}: ImageInputControlsProps) => {
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [shotType, setShotType] = useState("");
  const [angle, setAngle] = useState("");
  const [style, setStyle] = useState("");
  const [showEnhancementModal, setShowEnhancementModal] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [showCompelModal, setShowCompelModal] = useState(false);

  const shouldShowCompel = jobType.startsWith('sdxl_') || jobType.includes('image7b');

  return (
    <TooltipProvider>
      <div className="bg-gray-900/90 rounded-lg p-2 border border-gray-800/50 max-w-6xl mx-auto">
        {/* Row 1: IMAGE button + reference + prompt + sparkle buttons */}
        <div className="flex items-center gap-2 mb-2">
          {/* IMAGE Mode Button */}
          <Button
            variant="ghost"
            className="flex items-center gap-1 px-3 py-2 h-12 rounded-md bg-white hover:bg-gray-100 text-gray-900 font-medium text-xs min-w-[70px] justify-center"
          >
            <Image className="w-3 h-3" />
            IMAGE
          </Button>

          {/* Reference Upload Box */}
          <div
            onDragOver={showReferenceModal ? undefined : onReferenceDragOver}
            onDragLeave={showReferenceModal ? undefined : onReferenceDragLeave}
            onDrop={showReferenceModal ? undefined : onReferenceDrop}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <ReferenceImageBox
                    references={references}
                    onClick={() => setShowReferenceModal(true)}
                    isDragOver={showReferenceModal ? false : isReferenceDragOver}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Add reference images</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Main Text Input - Much wider */}
          <div className="flex-1 max-w-2xl">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A close-up of a woman talking on the phone..."
              className="bg-transparent border-none text-white placeholder:text-gray-400 text-sm py-2 px-3 focus:outline-none focus:ring-0 resize-none h-12 w-full"
              disabled={isGenerating}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onGenerate();
                }
              }}
            />
          </div>

          {/* Sparkle Buttons - Uniform size */}
          <div className="flex gap-2">
            {/* Enhanced Prompt Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={() => setShowEnhancementModal(true)}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-10 h-10 p-0 bg-gray-800 hover:bg-gray-700 rounded-md border border-gray-600"
                >
                  <Wand2 className="w-3 h-3 text-purple-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Enhance prompt</p>
              </TooltipContent>
            </Tooltip>

            {/* Generate Button */}
            <Button
              onClick={onGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-10 h-10 p-0 bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              <Sparkles className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Row 2: VIDEO button + right-justified controls */}
        <div className="flex items-center justify-between">
          {/* VIDEO Mode Button */}
          <Button
            variant="ghost"
            onClick={onSwitchToVideo}
            className="flex items-center gap-1 px-3 py-2 h-12 rounded-md bg-gray-800 hover:bg-gray-700 text-white font-medium text-xs min-w-[70px] justify-center"
          >
            <Play className="w-3 h-3" />
            VIDEO
          </Button>

          {/* Control Buttons - Right Justified, All Uniform */}
          <div className="flex items-center gap-1">
            {/* Library Button */}
            <Button
              variant="ghost"
              onClick={onLibraryClick}
              className="flex items-center gap-1 px-2 py-1 h-7 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded"
            >
              <Archive className="w-3 h-3" />
              Library
            </Button>

            {/* Compel Button */}
            {shouldShowCompel && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={() => setShowCompelModal(true)}
                    className={`flex items-center gap-1 px-2 py-1 h-7 rounded text-xs ${
                      compelEnabled 
                        ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                        : 'bg-gray-800 hover:bg-gray-700 text-white'
                    }`}
                  >
                    <Settings className="w-3 h-3" />
                    Compel
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Advanced prompt weighting</p>
                </TooltipContent>
              </Tooltip>
            )}
            
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
              <PopoverContent className="w-24 p-1 bg-gray-800 border-gray-700" side="top">
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
                  {shotType || "Shot"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-28 p-1 bg-gray-800 border-gray-700" side="top">
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
              <PopoverContent className="w-20 p-1 bg-gray-800 border-gray-700" side="top">
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
              <PopoverContent className="w-24 p-1 bg-gray-800 border-gray-700" side="top">
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
                <p className="text-xs">{quality === 'high' ? 'High quality' : 'Fast generation'}</p>
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
                <p className="text-xs">{enhanced ? 'Enhanced model active' : 'Enable enhanced model'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Modals - keep existing code */}
      <ReferenceSettingsModal
        isOpen={showReferenceModal}
        onClose={() => setShowReferenceModal(false)}
        references={references}
        onReferencesChange={onReferencesChange || (() => {})}
        referenceStrength={referenceStrength}
        onReferenceStrengthChange={onReferenceStrengthChange || (() => {})}
        optimizeForCharacter={optimizeForCharacter}
        onOptimizeChange={onOptimizeChange || (() => {})}
      />

      {shouldShowCompel && (
        <CompelModal
          isOpen={showCompelModal}
          onClose={() => setShowCompelModal(false)}
          compelEnabled={compelEnabled}
          setCompelEnabled={setCompelEnabled || (() => {})}
          compelWeights={compelWeights}
          setCompelWeights={setCompelWeights || (() => {})}
        />
      )}

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
