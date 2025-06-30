
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Sparkles, Play, Music, RotateCcw, Camera, Brush, Zap, Crown, ChevronDown, ChevronUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [motionIntensity, setMotionIntensity] = useState<'low' | 'medium' | 'high'>('medium');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isMobile = useIsMobile();

  const handleMotionClick = () => {
    const nextIntensity = motionIntensity === 'low' ? 'medium' : 
                         motionIntensity === 'medium' ? 'high' : 'low';
    setMotionIntensity(nextIntensity);
  };

  return (
    <div className="bg-gray-800/95 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-700/50 shadow-2xl">
      {isMobile ? (
        // Mobile Layout
        <div className="space-y-4">
          {/* Row 1: Mode Toggle and Quality */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button
                onClick={() => onModeChange('image')}
                variant="default"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm ${
                  mode === 'image' 
                    ? 'bg-white text-black hover:bg-gray-100' 
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                <Camera className="w-4 h-4" />
                IMAGE
              </Button>
              
              <Button
                onClick={() => onModeChange('video')}
                variant="default"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm ${
                  mode === 'video' 
                    ? 'bg-white text-black hover:bg-gray-100' 
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                <Play className="w-4 h-4" />
                VIDEO
              </Button>
            </div>
            
            {/* Quality Toggle */}
            <Button
              variant="ghost"
              onClick={() => onQualityChange(quality === 'fast' ? 'high' : 'fast')}
              className={`flex items-center gap-2 px-3 py-2 h-10 rounded-lg transition-all ${
                quality === 'high' 
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {quality === 'high' ? (
                <>
                  <Crown className="w-4 h-4" />
                  <span className="text-sm font-medium">High</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-medium">Fast</span>
                </>
              )}
            </Button>
          </div>

          {/* Row 2: Text Input and Generate */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A close-up of a woman talking on the phone..."
                className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 text-base py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-12"
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

          {/* Row 3: Reference Upload and Advanced Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {mode === 'image' ? (
                <Button
                  variant="ghost"
                  onClick={onReferenceImageUpload}
                  className="w-10 h-10 p-0 bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-500 hover:border-gray-400 rounded-lg"
                >
                  <Upload className="w-4 h-4 text-gray-400" />
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={onReferenceImageUpload}
                    className="w-10 h-10 p-0 bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-500 hover:border-gray-400 rounded-lg"
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
                    className="w-10 h-10 p-0 bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-500 hover:border-gray-400 rounded-lg"
                  >
                    <Upload className="w-4 h-4 text-gray-400" />
                  </Button>
                </div>
              )}
            </div>
            
            <Button
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
            >
              Advanced
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          {/* Collapsible Advanced Controls */}
          {showAdvanced && (
            <div className="space-y-3 pt-2 border-t border-gray-700">
              {mode === 'image' ? (
                <div className="grid grid-cols-2 gap-3">
                  <Select defaultValue="16:9">
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white text-sm h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 z-50">
                      <SelectItem value="16:9">16:9</SelectItem>
                      <SelectItem value="4:3">4:3</SelectItem>
                      <SelectItem value="1:1">1:1</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white text-sm h-10">
                      <SelectValue placeholder="Shot Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 z-50">
                      <SelectItem value="close-up">Close-up</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="wide">Wide</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white text-sm h-10">
                      <SelectValue placeholder="Angle" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 z-50">
                      <SelectItem value="front">Front</SelectItem>
                      <SelectItem value="side">Side</SelectItem>
                      <SelectItem value="back">Back</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white text-sm h-10">
                      <div className="flex items-center gap-2">
                        <Brush className="w-4 h-4" />
                        <SelectValue placeholder="Style" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 z-50">
                      <SelectItem value="realistic">Realistic</SelectItem>
                      <SelectItem value="artistic">Artistic</SelectItem>
                      <SelectItem value="cartoon">Cartoon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <Select defaultValue="16:9">
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white text-sm h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 z-50">
                      <SelectItem value="16:9">16:9</SelectItem>
                      <SelectItem value="4:3">4:3</SelectItem>
                      <SelectItem value="1:1">1:1</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select defaultValue="5s">
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white text-sm h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 z-50">
                      <SelectItem value="3s">3s</SelectItem>
                      <SelectItem value="5s">5s</SelectItem>
                      <SelectItem value="10s">10s</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    onClick={handleMotionClick}
                    className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg relative text-sm h-10"
                    title={`Motion: ${motionIntensity}`}
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    {motionIntensity === 'low' ? 'L' : motionIntensity === 'medium' ? 'M' : 'H'}
                  </Button>
                </div>
                
                <Button
                  variant="ghost"
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white rounded-lg h-10"
                >
                  <Music className="w-4 h-4 mr-2" />
                  Add Music
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        // Desktop Layout
        <>
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
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
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
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
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
                className="w-10 h-10 p-0 bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-500 hover:border-gray-400 rounded-lg"
              >
                <Upload className="w-4 h-4 text-gray-400" />
              </Button>
            ) : (
              // Video Mode: Start + Refresh + End reference uploads
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={onReferenceImageUpload}
                  className="w-10 h-10 p-0 bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-500 hover:border-gray-400 rounded-lg"
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
                  className="w-10 h-10 p-0 bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-500 hover:border-gray-400 rounded-lg"
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
                className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 text-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-12"
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
                    <SelectTrigger className="w-20 bg-gray-700 border-gray-600 text-white text-sm h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 z-50">
                      <SelectItem value="16:9">16:9</SelectItem>
                      <SelectItem value="4:3">4:3</SelectItem>
                      <SelectItem value="1:1">1:1</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Shot Type */}
                  <Select>
                    <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white text-sm h-10">
                      <SelectValue placeholder="Shot Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 z-50">
                      <SelectItem value="close-up">Close-up</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="wide">Wide</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Angle */}
                  <Select>
                    <SelectTrigger className="w-24 bg-gray-700 border-gray-600 text-white text-sm h-10">
                      <SelectValue placeholder="Angle" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 z-50">
                      <SelectItem value="front">Front</SelectItem>
                      <SelectItem value="side">Side</SelectItem>
                      <SelectItem value="back">Back</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Style */}
                  <Select>
                    <SelectTrigger className="w-28 bg-gray-700 border-gray-600 text-white text-sm h-10">
                      <div className="flex items-center gap-2">
                        <Brush className="w-4 h-4" />
                        <SelectValue placeholder="Style" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 z-50">
                      <SelectItem value="realistic">Realistic</SelectItem>
                      <SelectItem value="artistic">Artistic</SelectItem>
                      <SelectItem value="cartoon">Cartoon</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Style Ref */}
                  <Button
                    variant="ghost"
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm h-10"
                  >
                    Style ref
                  </Button>
                </>
              ) : (
                // Video Mode Controls
                <>
                  {/* Aspect Ratio */}
                  <Select defaultValue="16:9">
                    <SelectTrigger className="w-20 bg-gray-700 border-gray-600 text-white text-sm h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 z-50">
                      <SelectItem value="16:9">16:9</SelectItem>
                      <SelectItem value="4:3">4:3</SelectItem>
                      <SelectItem value="1:1">1:1</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Duration */}
                  <Select defaultValue="5s">
                    <SelectTrigger className="w-16 bg-gray-700 border-gray-600 text-white text-sm h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 z-50">
                      <SelectItem value="3s">3s</SelectItem>
                      <SelectItem value="5s">5s</SelectItem>
                      <SelectItem value="10s">10s</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Music Button */}
                  <Button
                    variant="ghost"
                    className="w-10 h-10 p-0 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                  >
                    <Music className="w-4 h-4" />
                  </Button>

                  {/* Motion Intensity - 3-state icon button */}
                  <Button
                    variant="ghost"
                    onClick={handleMotionClick}
                    className="w-10 h-10 p-0 bg-gray-700 hover:bg-gray-600 text-white rounded-lg relative"
                    title={`Motion: ${motionIntensity}`}
                  >
                    <Zap className="w-4 h-4" />
                    <span className="absolute -bottom-1 -right-1 text-xs bg-gray-600 text-white rounded-full w-4 h-4 flex items-center justify-center">
                      {motionIntensity === 'low' ? 'L' : motionIntensity === 'medium' ? 'M' : 'H'}
                    </span>
                  </Button>
                </>
              )}

              {/* Compact Quality Toggle Button */}
              <Button
                variant="ghost"
                onClick={() => onQualityChange(quality === 'fast' ? 'high' : 'fast')}
                className={`flex items-center gap-2 px-3 py-2 h-10 rounded-lg transition-all ${
                  quality === 'high' 
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
                title={`Quality: ${quality === 'high' ? 'High' : 'Fast'}`}
              >
                {quality === 'high' ? (
                  <>
                    <Crown className="w-4 h-4" />
                    <span className="text-sm font-medium">High</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span className="text-sm font-medium">Fast</span>
                  </>
                )}
              </Button>
            </div>

            {/* Spacer to align with generate button */}
            <div className="w-12"></div>
          </div>
        </>
      )}
    </div>
  );
};
