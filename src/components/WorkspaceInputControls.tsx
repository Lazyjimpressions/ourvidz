
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Sparkles, Play, Music, RotateCcw, Camera, Brush } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

interface WorkspaceInputControlsProps {
  mode: 'image' | 'video';
  onModeChange: (mode: 'image' | 'video') => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onReferenceImageUpload: () => void;
  quality: 'fast' | 'high';
  onQualityChange: (quality: 'fast' | 'high') => void;
}

export const WorkspaceInputControls = ({
  mode,
  onModeChange,
  prompt,
  setPrompt,
  onGenerate,
  isGenerating,
  onReferenceImageUpload,
  quality,
  onQualityChange
}: WorkspaceInputControlsProps) => {
  return (
    <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/50 shadow-2xl">
      {/* Row 1: Mode Toggle Buttons, Reference Uploads, Text Input, Generate Button */}
      <div className="flex items-center gap-3 mb-4">
        {/* Stacked Mode Toggle Buttons */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => onModeChange('image')}
            variant="default"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
              mode === 'image' 
                ? 'bg-white text-black hover:bg-gray-100' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Camera className="w-4 h-4" />
            IMAGE
          </Button>
          
          <Button
            onClick={() => onModeChange('video')}
            variant="default"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
              mode === 'video' 
                ? 'bg-white text-black hover:bg-gray-100' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Play className="w-4 h-4" />
            VIDEO
          </Button>
        </div>

        {/* Reference Upload Section - Different for Image vs Video */}
        {mode === 'image' ? (
          // Image Mode: Single reference upload
          <Button
            variant="ghost"
            onClick={onReferenceImageUpload}
            className="w-10 h-10 p-0 bg-gray-800 hover:bg-gray-700 border-2 border-dashed border-gray-600 hover:border-gray-500 rounded-lg"
          >
            <Upload className="w-4 h-4 text-gray-400" />
          </Button>
        ) : (
          // Video Mode: Start + Refresh + End reference uploads
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={onReferenceImageUpload}
              className="w-10 h-10 p-0 bg-gray-800 hover:bg-gray-700 border-2 border-dashed border-gray-600 hover:border-gray-500 rounded-lg"
            >
              <Upload className="w-4 h-4 text-gray-400" />
            </Button>
            
            <Button
              variant="ghost"
              className="w-8 h-8 p-0 text-gray-400 hover:text-white"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              onClick={onReferenceImageUpload}
              className="w-10 h-10 p-0 bg-gray-800 hover:bg-gray-700 border-2 border-dashed border-gray-600 hover:border-gray-500 rounded-lg"
            >
              <Upload className="w-4 h-4 text-gray-400" />
            </Button>
          </div>
        )}

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

      {/* Row 2: Mode-Specific Controls + Quality Toggle */}
      <div className="flex items-center gap-3">
        {/* Spacer to align with mode buttons */}
        <div className="w-20"></div>
        
        {/* Spacer to align with reference uploads */}
        <div className={mode === 'image' ? 'w-10' : 'w-24'}></div>

        {/* Mode-Specific Controls */}
        <div className="flex items-center gap-3 flex-1">
          {mode === 'image' ? (
            // Image Mode Controls
            <>
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
            </>
          ) : (
            // Video Mode Controls
            <>
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
            </>
          )}

          {/* Quality Toggle (for both modes) */}
          <div className="flex items-center gap-2 ml-4">
            <span className="text-sm text-gray-400">Low</span>
            <Switch
              checked={quality === 'high'}
              onCheckedChange={(checked) => onQualityChange(checked ? 'high' : 'fast')}
              className="data-[state=checked]:bg-blue-600"
            />
            <span className="text-sm text-gray-400">High</span>
          </div>
        </div>

        {/* Spacer to align with generate button */}
        <div className="w-12"></div>
      </div>
    </div>
  );
};
