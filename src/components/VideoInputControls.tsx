
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Sparkles, Play, Music, RotateCcw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

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
  return (
    <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/50 shadow-2xl">
      {/* Row 1: IMAGE, Start Ref, Refresh, End Ref, Text Input, Generate Button */}
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="default"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black hover:bg-gray-100 font-medium"
        >
          <Play className="w-4 h-4" />
          IMAGE
        </Button>

        {/* Start Ref Upload - small square */}
        <Button
          variant="ghost"
          onClick={onReferenceImageUpload}
          className="w-10 h-10 p-0 bg-gray-800 hover:bg-gray-700 border-2 border-dashed border-gray-600 hover:border-gray-500 rounded-lg"
        >
          <Upload className="w-4 h-4 text-gray-400" />
        </Button>

        {/* Refresh/Cycle icon */}
        <Button
          variant="ghost"
          className="w-8 h-8 p-0 text-gray-400 hover:text-white"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        {/* End Ref Upload - small square */}
        <Button
          variant="ghost"
          onClick={onReferenceImageUpload}
          className="w-10 h-10 p-0 bg-gray-800 hover:bg-gray-700 border-2 border-dashed border-gray-600 hover:border-gray-500 rounded-lg"
        >
          <Upload className="w-4 h-4 text-gray-400" />
        </Button>

        {/* Main Text Input */}
        <div className="flex-1">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A close-up of a woman talking on the phone..."
            className="bg-transparent border-none text-white placeholder:text-gray-400 text-lg py-3 px-4 focus:outline-none focus:ring-0 h-12"
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
          className="w-12 h-12 p-0 bg-blue-600 hover:bg-blue-700 rounded-full"
        >
          <Sparkles className="w-5 h-5" />
        </Button>
      </div>

      {/* Row 2: VIDEO, Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant="default"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black hover:bg-gray-100 font-medium"
        >
          <Play className="w-4 h-4" />
          VIDEO
        </Button>

        {/* Aspect Ratio */}
        <Select defaultValue="16:9">
          <SelectTrigger className="w-16 bg-gray-800 border-gray-700 text-white text-sm h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700 z-50">
            <SelectItem value="16:9">16:9</SelectItem>
            <SelectItem value="4:3">4:3</SelectItem>
            <SelectItem value="1:1">1:1</SelectItem>
          </SelectContent>
        </Select>

        {/* Duration */}
        <Select defaultValue="5s">
          <SelectTrigger className="w-12 bg-gray-800 border-gray-700 text-white text-sm h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700 z-50">
            <SelectItem value="3s">3s</SelectItem>
            <SelectItem value="5s">5s</SelectItem>
            <SelectItem value="10s">10s</SelectItem>
          </SelectContent>
        </Select>

        {/* Music Button */}
        <Button
          variant="ghost"
          className="w-10 h-10 p-0 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
        >
          <Music className="w-4 h-4" />
        </Button>

        {/* Motion Intensity */}
        <div className="flex items-center gap-2 min-w-32">
          <span className="text-sm text-gray-400">Motion</span>
          <Slider
            defaultValue={[50]}
            max={100}
            step={1}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
};
