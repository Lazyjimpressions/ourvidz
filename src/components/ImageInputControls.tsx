
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Upload, Sparkles, Brush } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ImageInputControlsProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onReferenceImageUpload: () => void;
}

export const ImageInputControls = ({
  prompt,
  setPrompt,
  onGenerate,
  isGenerating,
  onReferenceImageUpload
}: ImageInputControlsProps) => {
  return (
    <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/50 shadow-2xl">
      {/* Row 1: IMAGE, Reference Upload, Text Input, Generate Button */}
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="default"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black hover:bg-gray-100"
        >
          <Camera className="w-4 h-4" />
          IMAGE
        </Button>

        {/* Reference Image Upload */}
        <Button
          variant="ghost"
          onClick={onReferenceImageUpload}
          className="w-12 h-12 p-0 bg-gray-800 hover:bg-gray-700 border-2 border-dashed border-gray-600 hover:border-gray-500 rounded-lg"
        >
          <Upload className="w-5 h-5 text-gray-400" />
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

      {/* Row 2: Image Controls */}
      <div className="flex items-center gap-4">
        {/* Spacer to align with IMAGE button */}
        <div className="w-20"></div>
        
        {/* Spacer to align with reference upload button position */}
        <div className="w-12"></div>

        {/* Advanced Controls */}
        <div className="flex items-center gap-3 flex-1">
          {/* Aspect Ratio */}
          <Select defaultValue="16:9">
            <SelectTrigger className="w-20 bg-gray-800 border-gray-700 text-white text-sm h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 z-50">
              <SelectItem value="16:9">16:9</SelectItem>
              <SelectItem value="4:3">4:3</SelectItem>
              <SelectItem value="1:1">1:1</SelectItem>
            </SelectContent>
          </Select>

          {/* Shot Type */}
          <Select>
            <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white text-sm h-10">
              <SelectValue placeholder="Shot Type" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 z-50">
              <SelectItem value="close-up">Close-up</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="wide">Wide</SelectItem>
            </SelectContent>
          </Select>

          {/* Angle */}
          <Select>
            <SelectTrigger className="w-24 bg-gray-800 border-gray-700 text-white text-sm h-10">
              <SelectValue placeholder="Angle" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 z-50">
              <SelectItem value="front">Front</SelectItem>
              <SelectItem value="side">Side</SelectItem>
              <SelectItem value="back">Back</SelectItem>
            </SelectContent>
          </Select>

          {/* Style */}
          <Select>
            <SelectTrigger className="w-28 bg-gray-800 border-gray-700 text-white text-sm h-10">
              <div className="flex items-center gap-2">
                <Brush className="w-4 h-4" />
                <SelectValue placeholder="Style" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 z-50">
              <SelectItem value="realistic">Realistic</SelectItem>
              <SelectItem value="artistic">Artistic</SelectItem>
              <SelectItem value="cartoon">Cartoon</SelectItem>
            </SelectContent>
          </Select>

          {/* Style Ref */}
          <Button
            variant="ghost"
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm h-10"
          >
            Style ref
          </Button>
        </div>

        {/* Spacer to align with generate button */}
        <div className="w-12"></div>
      </div>
    </div>
  );
};
