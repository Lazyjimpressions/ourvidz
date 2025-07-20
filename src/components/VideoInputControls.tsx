
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Upload, Sparkles, Play, Zap, Crown, Archive, Link, Wand2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PromptEnhancementModal } from './PromptEnhancementModal';
import { ReferenceImageBox } from './workspace/ReferenceImageBox';
import { ReferenceSettingsModal } from './workspace/ReferenceSettingsModal';

interface VideoInputControlsProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onSwitchToImage?: () => void;
  quality: 'fast' | 'high';
  setQuality: (quality: 'fast' | 'high') => void;
  onLibraryClick: () => void;
  enhanced: boolean;
  setEnhanced: (enhanced: boolean) => void;
  hasReference?: boolean;
  onReferenceClick?: () => void;
  jobType?: string;
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

export const VideoInputControls = ({
  prompt,
  setPrompt,
  onGenerate,
  isGenerating,
  onSwitchToImage,
  quality,
  setQuality,
  onLibraryClick,
  enhanced,
  setEnhanced,
  hasReference = false,
  onReferenceClick,
  jobType = 'video_fast',
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
}: VideoInputControlsProps) => {
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [shotType, setShotType] = useState("");
  const [angle, setAngle] = useState("");
  const [style, setStyle] = useState("");
  const [showEnhancementModal, setShowEnhancementModal] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);

  return (
    <TooltipProvider>
      <div className="bg-gray-900/90 rounded-lg p-3 border border-gray-800/50 max-w-4xl mx-auto">
        {/* Row 1: VIDEO button + frame selection + prompt + sparkle buttons */}
        <div className="flex items-start gap-3 mb-3">
          {/* VIDEO Mode Button - Tall to span row height */}
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-4 py-3 h-16 rounded-md bg-white hover:bg-gray-100 text-gray-900 font-medium text-sm"
          >
            <Play className="w-4 h-4" />
            VIDEO
          </Button>

          {/* Frame Selection Boxes */}
          <div className="flex gap-2">
            {/* Starting Frame */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center justify-center w-12 h-12 rounded-md border-2 border-dashed border-gray-600 bg-gray-800/50 hover:bg-gray-700/50 hover:border-gray-500"
                >
                  <Upload className="w-5 h-5 text-gray-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add starting frame</p>
              </TooltipContent>
            </Tooltip>

            {/* Ending Frame */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center justify-center w-12 h-12 rounded-md border-2 border-dashed border-gray-600 bg-gray-800/50 hover:bg-gray-700/50 hover:border-gray-500"
                >
                  <Upload className="w-5 h-5 text-gray-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add ending frame</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Main Text Input - Wider to match LTX proportions */}
          <div className="flex-1 max-w-xl">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A woman walking through a bustling city street..."
              className="bg-transparent border-none text-white placeholder:text-gray-400 text-base py-3 px-4 focus:outline-none focus:ring-0 resize-none h-16 w-full"
              disabled={isGenerating}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onGenerate();
                }
              }}
            />
          </div>

          {/* Sparkle Buttons - Same size */}
          <div className="flex gap-2">
            {/* Enhanced Prompt Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={() => setShowEnhancementModal(true)}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-12 h-12 p-0 bg-gray-800 hover:bg-gray-700 rounded-md border border-gray-600"
                >
                  <Wand2 className="w-4 h-4 text-purple-400" />
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
              className="w-12 h-12 p-0 bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              <Sparkles className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Row 2: IMAGE button + right-justified controls */}
        <div className="flex items-center justify-between">
          {/* IMAGE Mode Button - Tall to match row height */}
          <Button
            variant="ghost"
            onClick={onSwitchToImage}
            className="flex items-center gap-2 px-4 py-2 h-10 rounded-md bg-gray-800 hover:bg-gray-700 text-white font-medium text-sm"
          >
            <Image className="w-4 h-4" />
            IMAGE
          </Button>

          {/* Control Buttons - Right Justified */}
          <div className="flex items-center gap-2">
            {/* Library Button */}
            <Button
              variant="ghost"
              onClick={onLibraryClick}
              className="flex items-center gap-1 px-3 py-1.5 h-8 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded"
            >
              <Archive className="w-3 h-3" />
              Library
            </Button>

            {/* Aspect Ratio */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="px-3 py-1.5 h-8 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded">
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
                <Button variant="ghost" className="px-3 py-1.5 h-8 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded">
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
                <Button variant="ghost" className="px-3 py-1.5 h-8 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded">
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
                <Button variant="ghost" className="px-3 py-1.5 h-8 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded">
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
                  className={`flex items-center gap-1 px-3 py-1.5 h-8 rounded text-xs ${
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
                  className={`flex items-center gap-1 px-3 py-1.5 h-8 rounded text-xs ${
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
        format="video"
        quality={quality}
      />

      {/* Reference Settings Modal */}
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
    </TooltipProvider>
  );
};
