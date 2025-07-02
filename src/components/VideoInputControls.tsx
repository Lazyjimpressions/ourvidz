import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Upload, Sparkles, Play, RotateCcw, Music } from "lucide-react";
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
  onReferenceImageUpload: () => void;
}

export const VideoInputControls = ({
  prompt,
  setPrompt,
  onGenerate,
  isGenerating,
  onReferenceImageUpload
}: VideoInputControlsProps) => {
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState("5s");

  return (
    <div className="bg-gray-900/90 rounded-lg p-4 border border-gray-800/50">
      {/* Main Row */}
      <div className="flex items-center gap-3">
        {/* Stacked IMAGE/VIDEO Buttons */}
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
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

        {/* Start Ref Upload - small square */}
        <Button
          variant="ghost"
          onClick={onReferenceImageUpload}
          className="w-8 h-8 p-0 bg-transparent border border-dashed border-gray-600 hover:border-gray-500 rounded"
        >
          <Upload className="w-3.5 h-3.5 text-gray-400" />
        </Button>

        {/* Refresh/Cycle icon */}
        <Button
          variant="ghost"
          className="w-6 h-6 p-0 text-gray-400 hover:text-white"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>

        {/* End Ref Upload - small square */}
        <Button
          variant="ghost"
          onClick={onReferenceImageUpload}
          className="w-8 h-8 p-0 bg-transparent border border-dashed border-gray-600 hover:border-gray-500 rounded"
        >
          <Upload className="w-3.5 h-3.5 text-gray-400" />
        </Button>

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
      <div className="flex items-center gap-2 mt-3 ml-20">
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

        {/* Music Button */}
        <Button
          variant="ghost"
          className="w-8 h-8 p-0 bg-gray-800 hover:bg-gray-700 text-white rounded"
        >
          <Music className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};